import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { validateCampaignInput } from '@/lib/newsletter-campaigns';

export const dynamic = 'force-dynamic';

const MUTABLE_STATUSES = new Set(['draft', 'scheduled']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  // Explicit select — drift-resilient (CLAUDE.md §14.1). Admin campaign
  // detail page consumes every field; pinning them future-proofs against
  // schema columns added before `prisma db push` runs in deploy.
  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      intro: true,
      postIds: true,
      locale: true,
      status: true,
      scheduledAt: true,
      sentAt: true,
      sentCount: true,
      failedCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!campaign) return ApiErrors.notFound();

  return NextResponse.json({ campaign });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  // Status check only — minimal select (CLAUDE.md §14.1).
  const existing = await prisma.newsletterCampaign.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) return ApiErrors.notFound();
  // Sent campaigns are immutable — preserve a faithful audit log of what
  // was actually delivered. Scheduled/draft can still be edited until they
  // fire.
  if (!MUTABLE_STATUSES.has(existing.status)) {
    return NextResponse.json({ error: 'campaign_immutable', status: existing.status }, { status: 409 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('invalid_json');
  }

  const validated = validateCampaignInput(body);
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const updated = await prisma.newsletterCampaign.update({
    where: { id },
    data: validated.data,
  });

  return NextResponse.json({ ok: true, campaign: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  // Status check only — minimal select (CLAUDE.md §14.1).
  const existing = await prisma.newsletterCampaign.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) return ApiErrors.notFound();
  // Only drafts can be deleted. Scheduled campaigns must be downgraded to
  // draft first (intentional friction so a misclick doesn\'t purge an
  // upcoming send).
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'campaign_not_deletable', status: existing.status }, { status: 409 });
  }

  await prisma.newsletterCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
