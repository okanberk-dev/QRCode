import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = new Set([
  'feedback:read',
  'feedback:write',
  'restaurants:read',
  'restaurants:write',
  'analytics:read',
  'menu:read',
  'menu:write',
]);

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function createToken() {
  const secret = randomBytes(32).toString('base64url');
  return `buz_live_sk_${secret}`;
}

function prefixFor(token: string) {
  return `${token.slice(0, 16)}...${token.slice(-4)}`;
}

function normalizeScopes(scopes: unknown) {
  if (!Array.isArray(scopes)) return ['feedback:read'];
  const filtered = scopes.filter((scope): scope is string => typeof scope === 'string' && VALID_SCOPES.has(scope));
  return Array.from(new Set(filtered.length > 0 ? filtered : ['feedback:read']));
}

function serializeKey(key: {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    scopes: key.scopes,
    createdAt: key.createdAt.toISOString(),
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId: ownerRef(actor), revokedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ data: keys.map(serializeKey) });
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { name?: unknown; scopes?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  if (!name) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

  const token = createToken();
  const key = await prisma.apiKey.create({
    data: {
      userId: ownerRef(actor),
      name,
      prefix: prefixFor(token),
      tokenHash: hashToken(token),
      scopes: normalizeScopes(body.scopes),
    },
  });

  return NextResponse.json({
    ok: true,
    token,
    data: serializeKey(key),
  }, { status: 201 });
}
