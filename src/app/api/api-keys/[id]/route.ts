import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function createToken() {
  return `buz_live_sk_${randomBytes(32).toString('base64url')}`;
}

function prefixFor(token: string) {
  return `${token.slice(0, 16)}...${token.slice(-4)}`;
}

async function requireOwnedKey(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };

  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key) return { error: 'not_found' as const, status: 404 };
  if (key.userId !== ownerRef(actor)) return { error: 'forbidden' as const, status: 403 };

  return { actor, key };
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedKey(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedKey(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const token = createToken();
  const key = await prisma.apiKey.update({
    where: { id },
    data: {
      prefix: prefixFor(token),
      tokenHash: hashToken(token),
      revokedAt: null,
    },
  });

  return NextResponse.json({
    ok: true,
    token,
    data: {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      revokedAt: key.revokedAt?.toISOString() ?? null,
    },
  });
}
