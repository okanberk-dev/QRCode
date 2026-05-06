// CLAUDE.md §38.99 — Owner campaign send trigger.
//
// Pipeline: draft campaign → resolveSegmentRecipients → sendCustomerCampaign
// (mevcut §38.48 Wave 2 helper, sequential 600ms throttle, hasMarketingConsent
// gate, per-row CustomerEmailLog audit, RFC 8058 unsubscribe headers).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { sendCustomerCampaign } from '@/lib/email-customer-campaign';
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
  const limit = await rateLimit(`customer-campaigns-send:${actor.source}:${actor.id}`, 5, 60_000);
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

  // Status guard — only draft campaigns can be triggered. Sent/sending
  // immutable (idempotency + KVKK audit trail).
  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'campaign_not_sendable' }, { status: 409 });
  }

  // Resolve recipients (KVKK + marketing consent + dedupe).
  const recipients = await resolveSegmentRecipients({
    restaurantId: campaign.restaurantId,
    onlyMarketingConsent: true,
  });

  if (recipients.length === 0) {
    // No eligible audience — mark failed (no send attempts) instead of leaving
    // status='draft' (UI treats draft as actionable). This preserves audit
    // trail.
    await prisma.customerEmailCampaign.update({
      where: { id },
      data: {
        status: 'failed',
        recipientCount: 0,
        sentAt: new Date(),
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

  // Trigger send pipeline (sequential 600ms throttle, mevcut helper).
  const result = await sendCustomerCampaign({
    campaignId: campaign.id,
    restaurantId: campaign.restaurantId,
    restaurantName: campaign.restaurant?.name ?? 'Buaze',
    subject: campaign.subject,
    body: campaign.body,
    recipients,
  });

  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action: 'owner.campaigns.send',
    targetId: campaign.id,
    payload: {
      restaurantId: campaign.restaurantId,
      recipientCount: result.totalCount,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
    },
  }).catch(() => undefined);

  return NextResponse.json({ result }, { status: 200 });
}
