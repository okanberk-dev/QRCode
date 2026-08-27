// CLAUDE.md §38.99 — Customer email campaign detail (GET) + delete (DELETE).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { aggregateLogStatsFromGroups } from '@/lib/customer-campaign-stats';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      restaurantId: true,
      subject: true,
      body: true,
      status: true,
      recipientCount: true,
      sentCount: true,
      failedCount: true,
      scheduledAt: true,
      sentAt: true,
      // Stage 29 §38.105 — moderation timeline + reviewer note.
      submittedAt: true,
      approvedById: true,
      approvedAt: true,
      rejectedById: true,
      rejectedAt: true,
      reviewerNote: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      restaurant: { select: { name: true } },
    },
  });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const access = await canAccessRestaurant(actor, campaign.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Aggregate log status counts via groupBy (audit §38.B) — bounded result
  // (one row per distinct status), never loads all CustomerEmailLog rows.
  const logGroups = await prisma.customerEmailLog.groupBy({
    by: ['status'],
    where: { campaignId: id },
    _count: { _all: true },
  });

  const stats = aggregateLogStatsFromGroups(logGroups, campaign.recipientCount);

  return NextResponse.json(
    {
      campaign: {
        id: campaign.id,
        restaurantId: campaign.restaurantId,
        restaurantName: campaign.restaurant?.name ?? null,
        subject: campaign.subject,
        body: campaign.body,
        status: campaign.status,
        recipientCount: campaign.recipientCount,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        // Stage 29 §38.105 — moderation timestamps + reviewer note exposed
        // to owner UI (CampaignDetailDrawer status timeline + rejected
        // reason). approvedById/rejectedById intentionally hidden — owner
        // panel internal admin user ID görmemeli (PII concern).
        submittedAt: campaign.submittedAt?.toISOString() ?? null,
        approvedAt: campaign.approvedAt?.toISOString() ?? null,
        rejectedAt: campaign.rejectedAt?.toISOString() ?? null,
        reviewerNote: campaign.reviewerNote,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
      stats,
    },
    {
      headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60' },
    },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, status: true, subject: true },
  });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const access = await canWriteRestaurant(actor, campaign.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Only draft + rejected campaigns are deletable. pending_approval/
  // approved/sending/sent/failed immutable (admin queue içinde olabilir
  // veya audit trail + KVKK retention zorunlu). Rejected → owner revize
  // edip yenisini açmak için silebilir (CLAUDE.md §38.105 paterni).
  if (campaign.status !== 'draft' && campaign.status !== 'rejected') {
    return NextResponse.json({ error: 'campaign_not_deletable' }, { status: 409 });
  }

  await prisma.customerEmailCampaign.delete({ where: { id } });

  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action: 'owner.campaigns.delete',
    targetId: id,
    payload: {
      restaurantId: campaign.restaurantId,
      subjectPreview: campaign.subject.slice(0, 80),
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
