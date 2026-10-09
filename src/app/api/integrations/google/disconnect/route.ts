import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { writePanelAuditLog } from '@/lib/audit-log';

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = ownerRef(actor);
  
  const result = await prisma.googleIntegration.deleteMany({
    where: { userId }
  });

  // Disconnecting stops Google review sync + replies for every restaurant of
  // the workspace — leave a trail (owner + admin audit views).
  if (result.count > 0) {
    await writePanelAuditLog(actor, 'owner.google.disconnect', actor.source === 'user' ? actor.id : null, {});
  }

  return NextResponse.json({ success: true });
}
