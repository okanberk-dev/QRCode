import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = ownerRef(actor);
  
  await prisma.googleIntegration.deleteMany({
    where: { userId }
  });

  return NextResponse.json({ success: true });
}
