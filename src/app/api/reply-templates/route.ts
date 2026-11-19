import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeamMemberRole, resolveOwnerUserId } from '@/lib/panel-access';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { checkReplyRisk } from '@/lib/reply-risk';

export const dynamic = 'force-dynamic';

/** Workspace cap — a template list, not a document store. */
const MAX_REPLY_TEMPLATES = 50;

const Body = z
  .object({
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(2000),
  })
  .strict();

/**
 * Saved reply templates shared by a workspace (owner + team members).
 * Admin accounts have no workspace, so they get 403.
 */
export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const rows = await prisma.replyTemplate.findMany({
    where: { ownerUserId: ownerId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_REPLY_TEMPLATES,
    select: { id: true, title: true, body: true, updatedAt: true },
  });
  return NextResponse.json(
    { data: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if ((await getTeamMemberRole(actor)) === 'viewer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const limit = await rateLimit(`reply-templates:${ownerId}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const { title, body } = parsed.data;

  // §48 — a template must be sendable: the same rules as a reply. Links are
  // only warned here; the send itself checks them against the business.
  const risk = checkReplyRisk(`${title}\n${body}`, { linksAsWarning: true });
  if (risk.blocked) {
    return NextResponse.json({ error: 'content_blocked', issues: risk.issues }, { status: 422 });
  }

  const count = await prisma.replyTemplate.count({ where: { ownerUserId: ownerId } });
  if (count >= MAX_REPLY_TEMPLATES) {
    return NextResponse.json({ error: 'limit_reached', max: MAX_REPLY_TEMPLATES }, { status: 409 });
  }
  const row = await prisma.replyTemplate.create({
    data: { ownerUserId: ownerId, title, body, createdById: actor.id },
    select: { id: true, title: true, body: true, updatedAt: true },
  });
  return NextResponse.json({ data: { ...row, updatedAt: row.updatedAt.toISOString() } }, { status: 201 });
}
