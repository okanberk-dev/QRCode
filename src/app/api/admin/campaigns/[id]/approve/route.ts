// Stage 29 §38.105 — admin campaign approval endpoint.
//
// Pipeline: status='pending_approval' → 'approved' → trigger Resend send
// (sendCustomerCampaign helper, mevcut Wave 2 §38.48 paterni reuse) →
// status='sent'/'failed'. Audit log: admin.campaign.approve + admin.campaign.send.
// Owner notify mail (owner-campaign-approved template).
//
// IDOR: superadmin OR `campaigns:write`. Rate limit: 10/dk/admin (CLAUDE.md
// §14.2). Zod `.strict()` body (note opsiyonel, CLAUDE.md §28.3 + §38.96
// reject endpoint paterni paralel).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { writeAdminNotification } from '@/lib/admin-notifications';
import { sendCustomerCampaign } from '@/lib/email-customer-campaign';
import { resolveSegmentRecipients } from '@/lib/customer-campaign-recipients';
import { sendOwnerCampaignApprovedMail } from '@/lib/email/owner-campaign-notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 50 müşteri × 600ms = 30sn safe; üstüne approve aksiyonu için ek headroom.
export const maxDuration = 60;

const ApproveBodySchema = z
  .object({
    note: z.string().max(1000).optional(),
  })
  .strict();

type ApproveBody = z.infer<typeof ApproveBodySchema>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'campaigns', 'write'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'invalid_actor' }, { status: 401 });
  }

  const limit = await rateLimit(`admin-campaigns-approve:${adminId}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<ApproveBody>(ApproveBodySchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      subject: true,
      body: true,
      status: true,
      createdById: true,
      restaurant: {
        select: { id: true, name: true, userId: true, campaignsEnabled: true },
      },
    },
  });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Status guard: only pending_approval → approved transition.
  if (campaign.status !== 'pending_approval') {
    return NextResponse.json({ error: 'campaign_not_pending' }, { status: 409 });
  }

  // Master flag still respected at approve time (admin operasyonel disable
  // approve sırasında bypass etmesin).
  if (!campaign.restaurant?.campaignsEnabled) {
    return NextResponse.json({ error: 'campaigns_disabled' }, { status: 403 });
  }

  // Step 1: status='approved' + approvedById/approvedAt + reviewerNote.
  // Status transient — Resend pipeline aşağıda hızlıca 'sending'/'sent'
  // yapacak. UI bu state'i nadiren görür ama audit timeline'da belirgin.
  const approvedAt = new Date();
  await prisma.customerEmailCampaign.update({
    where: { id },
    data: {
      status: 'approved',
      approvedById: adminId,
      approvedAt,
      reviewerNote: data.note?.trim() || null,
    },
  });

  // Step 2: re-resolve recipients (KVKK consent fresh state — submit anına
  // göre değişmiş olabilir; freshness için yeniden çek).
  const recipients = await resolveSegmentRecipients({
    restaurantId: campaign.restaurantId,
    onlyMarketingConsent: true,
  });

  if (recipients.length === 0) {
    // Edge case: submit ile approve arasında tüm müşteriler unsubscribe oldu.
    // Status'u 'failed' yap; owner mail "no recipients" ile bilgilendirilmez —
    // approved+0 sent şeffaf audit log'ta görünür.
    await prisma.customerEmailCampaign.update({
      where: { id },
      data: { status: 'failed', recipientCount: 0 },
    });
    return NextResponse.json(
      {
        ok: false,
        error: 'no_eligible_recipients',
        message:
          'Onay anında uygun alıcı kalmadı (consent değişmiş olabilir). Status: failed.',
      },
      { status: 422 },
    );
  }

  // Step 3: Resend pipeline trigger (sendCustomerCampaign helper status'u
  // 'sending' yapar, throttle ile gönderir, final 'sent'/'failed' update eder).
  const result = await sendCustomerCampaign({
    campaignId: campaign.id,
    restaurantId: campaign.restaurantId,
    restaurantName: campaign.restaurant?.name ?? 'Buaze',
    subject: campaign.subject,
    body: campaign.body,
    recipients,
  });

  // Step 4: Owner notify mail (fire-and-forget — ana flow bloklanmaz).
  if (campaign.createdById || campaign.restaurant?.userId) {
    const userId = campaign.createdById ?? campaign.restaurant?.userId;
    if (userId) {
      const owner = await prisma.user
        .findUnique({
          where: { id: userId },
          select: { name: true, email: true, locale: true },
        })
        .catch(() => null);
      if (owner?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://www.buaze.com';
        const ownerLocale: 'tr' | 'en' = owner.locale === 'en' ? 'en' : 'tr';
        const dashboardUrl = `${appUrl}/${ownerLocale}/dashboard/campaigns?id=${campaign.id}`;
        void sendOwnerCampaignApprovedMail({
          to: owner.email,
          ownerName: owner.name,
          restaurantName: campaign.restaurant?.name ?? 'Buaze',
          subject: campaign.subject,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          dashboardUrl,
          locale: ownerLocale,
        });
      }
    }
  }

  // Step 5: Admin notification broadcast (campaign.approved type).
  void writeAdminNotification({
    adminId: null,
    type: 'campaign.approved',
    title: `Kampanya onaylandı: ${campaign.restaurant?.name ?? 'Buaze'}`,
    body: `${campaign.subject.slice(0, 80)} · ${result.sentCount} gönderildi`,
    payload: {
      campaignId: campaign.id,
      restaurantId: campaign.restaurantId,
      restaurantName: campaign.restaurant?.name ?? null,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      approvedById: adminId,
    },
  });

  // Step 6: Audit log — approve + send 2 entry (forensic timeline).
  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.campaign.approve',
    targetId: campaign.id,
    payload: {
      restaurantId: campaign.restaurantId,
      restaurantName: campaign.restaurant?.name ?? null,
      noteLength: data.note?.trim().length ?? 0,
    },
  }).catch(() => undefined);

  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.campaign.send',
    targetId: campaign.id,
    payload: {
      restaurantId: campaign.restaurantId,
      recipientCount: result.totalCount,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
    },
  }).catch(() => undefined);

  return NextResponse.json(
    {
      ok: true,
      result: {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        totalCount: result.totalCount,
      },
    },
    { status: 200 },
  );
}
