import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeamMemberRole, resolveOwnerUserId } from '@/lib/panel-access';

export const dynamic = 'force-dynamic';

/** Deletes a template of the caller's workspace (viewers cannot). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if ((await getTeamMemberRole(actor)) === 'viewer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const result = await prisma.replyTemplate.deleteMany({ where: { id, ownerUserId: ownerId } });
  if (result.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
