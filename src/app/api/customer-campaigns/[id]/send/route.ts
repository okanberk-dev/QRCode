// Stage 29 §38.105 — Owner campaign submit-for-approval.
//
// Eski davranış (Wave 2 §38.48): draft → Resend pipeline (sequential 600ms
// throttle) → status='sent'. Owner direkt send ederdi, hiçbir admin gate'i
// geçmezdi.
//
// Yeni davranış: draft → status='pending_approval' + submittedAt + ops mail
// (hello@buaze.com) + admin notification (in-app feed). Resend pipeline
// çağrısı `/api/admin/campaigns/[id]/approve` endpoint'ine taşındı (single
// source of truth). Reject olursa owner revize edip tekrar submit edebilir
// ('rejected' → tekrar 'draft' yapılması gerek — gelecek scope; şu an
// rejected terminal state ama yeni campaign create alternatif).
//
// Backward-compat: endpoint URL aynı, response shape değişti
// (`{ result }` → `{ ok, status, recipientCount }`). Owner UI ComposeModal
// "Şimdi gönder" → "Onaya gönder" CTA değişimi (Phase G).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { writeAdminNotification } from '@/lib/admin-notifications';
import { notifyOpsOfCampaignSubmitted } from '@/lib/email/ops-alert';
import { resolveSegmentRecipients } from '@/lib/customer-campaign-recipients';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const SendBodySchema = z
  .object({
    onlyMarketingConsent: z.literal(true),
  })
  .strict();

type SendBody = z.infer<typeof SendBodySchema>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Rate limit — single-campaign abuse koruması (5/dk/actor).
  const limit = await rateLimit(
    `customer-campaigns-submit:${actor.source}:${actor.id}`,
    5,
    60_000,
  );
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<SendBody>(SendBodySchema, body);
  if (!parsed.ok) return parsed.response;

  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      subject: true,
      body: true,
      status: true,
      createdById: true,
      restaurant: { select: { id: true, name: true, campaignsEnabled: true } },
    },
  });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const access = await canAccessRestaurant(actor, campaign.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Admin master flag gate (CLAUDE.md §5.2 + §38.98).
  if (!campaign.restaurant?.campaignsEnabled) {
    return NextResponse.json({ error: 'campaigns_disabled' }, { status: 403 });
  }

  // Status guard — only draft campaigns can be submitted. pending_approval/
  // sent/failed immutable (admin approve flow tetiklenmiş veya bitmiş);
  // rejected → draft transition gelecek scope (şu an owner re-submit için
  // yeni campaign yaratır).
  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'campaign_not_submittable' }, { status: 409 });
  }

  // Resolve recipients (preview-only — admin approve anında fresh resolve
  // yeniden yapılır freshness için). KVKK 3-katman gate intact.
  const recipients = await resolveSegmentRecipients({
    restaurantId: campaign.restaurantId,
    onlyMarketingConsent: true,
  });

  if (recipients.length === 0) {
    // No eligible audience — mark failed (no send attempts) instead of
    // leaving status='draft' (UI treats draft as actionable).
    await prisma.customerEmailCampaign.update({
      where: { id },
      data: {
        status: 'failed',
        recipientCount: 0,
      },
    });
    return NextResponse.json(
      {
        error: 'no_eligible_recipients',
        message:
          'Pazarlama onayı veren ve e-posta adresi bulunan müşteri bulunamadı.',
      },
      { status: 422 },
    );
  }

  // Status transition: draft → pending_approval. Resend pipeline burada
  // tetiklenmez (admin approve endpoint'i çağırır).
  const submittedAt = new Date();
  await prisma.customerEmailCampaign.update({
    where: { id },
    data: {
      status: 'pending_approval',
      submittedAt,
      // Recipient count snapshot — UI queue listing için. Admin approve
      // anında fresh resolve edip gerçek count ile update edilir.
      recipientCount: recipients.length,
    },
  });

  // Owner info (ops mail + admin notification için).
  let ownerName: string | undefined;
  let ownerEmail: string | undefined;
  if (campaign.createdById) {
    const owner = await prisma.user
      .findUnique({
        where: { id: campaign.createdById },
        select: { name: true, email: true },
      })
      .catch(() => null);
    ownerName = owner?.name ?? undefined;
    ownerEmail = owner?.email ?? undefined;
  }

  const restaurantName = campaign.restaurant?.name ?? 'Buaze';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://buaze.com';
  const adminUrl = `${appUrl}/admin/campaigns/${campaign.id}`;

  // Ops mail (CLAUDE.md §21.33 paterni) — fire-and-forget, owner submit
  // flow'u bloklanmaz (mail dispatch fail durumda console.error log).
  void notifyOpsOfCampaignSubmitted({
    campaignId: campaign.id,
    restaurantName,
    ownerName,
    ownerEmail,
    subject: campaign.subject,
    recipientCount: recipients.length,
    submittedAt,
    adminUrl,
  });

  // Admin in-app notification (broadcast — tüm admin'ler queue gözlemleyebilir).
  void writeAdminNotification({
    adminId: null, // broadcast
    type: 'campaign.submitted',
    title: `Yeni kampanya onay bekliyor: ${restaurantName}`,
    body: `${ownerName ? ownerName + ' · ' : ''}${campaign.subject.slice(0, 80)}`,
    payload: {
      campaignId: campaign.id,
      restaurantId: campaign.restaurantId,
      restaurantName,
      ownerName: ownerName ?? null,
      subject: campaign.subject,
      recipientCount: recipients.length,
      submittedAt: submittedAt.toISOString(),
    },
  });

  // Audit log (CLAUDE.md §38.95).
  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action: 'admin.campaign.submit',
    targetId: campaign.id,
    payload: {
      restaurantId: campaign.restaurantId,
      restaurantName,
      subjectPreview: campaign.subject.slice(0, 80),
      recipientCount: recipients.length,
    },
  }).catch(() => undefined);

  return NextResponse.json(
    {
      ok: true,
      status: 'pending_approval',
      recipientCount: recipients.length,
      submittedAt: submittedAt.toISOString(),
    },
    { status: 200 },
  );
}
