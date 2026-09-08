// Stage 29 §38.105 — admin campaign rejection endpoint.
//
// Pipeline: status='pending_approval' → 'rejected' + rejectedById/rejectedAt
// + reviewerNote (min 20 char zorunlu, audit forensic). Resend pipeline
// tetiklenmez. Owner mail "owner-campaign-rejected" template ile gönderilir
// (reviewerNote dahil).
//
// IDOR: superadmin OR `campaigns:write`. Rate limit: 10/dk/admin (CLAUDE.md
// §14.2). Note min 20 char zorunlu (CLAUDE.md §38.96 impersonation paterni
// paralel — forensic context).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { writeAdminNotification } from '@/lib/admin-notifications';
import { sendOwnerCampaignRejectedMail } from '@/lib/email/owner-campaign-notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RejectBodySchema = z
  .object({
    note: z.string().min(20).max(1000),
  })
  .strict();

type RejectBody = z.infer<typeof RejectBodySchema>;

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

  const limit = await rateLimit(`admin-campaigns-reject:${adminId}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<RejectBody>(RejectBodySchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      subject: true,
      status: true,
      createdById: true,
      restaurant: {
        select: { id: true, name: true, userId: true },
      },
    },
  });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (campaign.status !== 'pending_approval') {
    return NextResponse.json({ error: 'campaign_not_pending' }, { status: 409 });
  }

  // Status transition: pending_approval → rejected. Owner CampaignDetailDrawer
  // reviewerNote'u amber-bordered card'da gösterir.
  const rejectedAt = new Date();
  const trimmedNote = data.note.trim();
  await prisma.customerEmailCampaign.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectedById: adminId,
      rejectedAt,
      reviewerNote: trimmedNote,
    },
  });

  // Owner notify mail (fire-and-forget).
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
      void sendOwnerCampaignRejectedMail({
        to: owner.email,
        ownerName: owner.name,
        restaurantName: campaign.restaurant?.name ?? 'Buaze',
        subject: campaign.subject,
        reviewerNote: trimmedNote,
        dashboardUrl,
        locale: ownerLocale,
      });
    }
  }

  // Admin notification broadcast (campaign.rejected type).
  void writeAdminNotification({
    adminId: null,
    type: 'campaign.rejected',
    title: `Kampanya reddedildi: ${campaign.restaurant?.name ?? 'Buaze'}`,
    body: `${campaign.subject.slice(0, 80)}`,
    payload: {
      campaignId: campaign.id,
      restaurantId: campaign.restaurantId,
      restaurantName: campaign.restaurant?.name ?? null,
      rejectedById: adminId,
    },
  });

  // Audit log: forensic forensic note hash (full content reviewerNote'ta;
  // payload'a sadece length yazıyoruz — body PII concern yok ama disk efficient).
  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.campaign.reject',
    targetId: campaign.id,
    payload: {
      restaurantId: campaign.restaurantId,
      restaurantName: campaign.restaurant?.name ?? null,
      noteLength: trimmedNote.length,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, status: 'rejected' }, { status: 200 });
}
