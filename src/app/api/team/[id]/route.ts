import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const VALID_ROLES = new Set(['owner', 'manager', 'staff', 'viewer']);
const VALID_STATUSES = new Set(['invited', 'active', 'revoked']);

async function requireOwnedMember(req: NextRequest, id: string) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { error: 'unauthorized' as const, status: 401 };
  if (actor.source !== 'user') return { error: 'forbidden' as const, status: 403 };

  const member = await prisma.teamMember.findUnique({ where: { id } });
  if (!member) return { error: 'not_found' as const, status: 404 };
  if (member.ownerId !== actor.id) return { error: 'forbidden' as const, status: 403 };

  return { actor, member };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedMember(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: { role?: string; status?: string; name?: string; locations?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates: {
    role?: string;
    status?: string;
    name?: string | null;
    locations?: string[];
  } = {};

  if (body.role) {
    if (!VALID_ROLES.has(body.role)) return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
    updates.role = body.role;
  }
  if (body.status) {
    if (!VALID_STATUSES.has(body.status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    updates.status = body.status;
  }
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim().slice(0, 120);
    updates.name = trimmed || null;
  }
  if (body.locations !== undefined && body.locations !== null) {
    if (
      !Array.isArray(body.locations) ||
      !body.locations.every((x) => typeof x === 'string' && x.length <= 64)
    ) {
      return NextResponse.json({ error: 'invalid_locations' }, { status: 400 });
    }
    const requested = body.locations.slice(0, 40);
    // IDOR — same guard as POST /api/team. Owner can only attach
    // restaurants they own; otherwise this PATCH would let an owner
    // back-door grant a team member access to another tenant's row.
    if (requested.length > 0) {
      const ownedRows = await prisma.restaurant.findMany({
        where: { id: { in: requested }, userId: access.actor.id },
        select: { id: true },
      });
      const ownedSet = new Set(ownedRows.map((r) => r.id));
      const filtered = requested.filter((id) => ownedSet.has(id));
      if (filtered.length === 0) {
        return NextResponse.json(
          { error: 'invalid_locations', hint: 'no requested location is owned by you' },
          { status: 400 },
        );
      }
      updates.locations = filtered;
    } else {
      updates.locations = requested;
    }
  }

  const updated = await prisma.teamMember.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    ok: true,
    member: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
      lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedMember(req, id);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  await prisma.teamMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
