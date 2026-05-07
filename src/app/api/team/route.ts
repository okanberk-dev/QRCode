import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { resolveOwnerUserId } from '@/lib/panel-access';
import { isValidEmail } from '@/lib/validations';
import {
  INVITE_TOKEN_TTL_DAYS,
  generateInviteToken,
  inviteExpiresAt,
  roleLabel,
} from '@/lib/team-invite';
import { sendTeamInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const VALID_ROLES = new Set(['owner', 'manager', 'staff', 'viewer']);

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ownerId = await resolveOwnerUserId(actor);
  if (!ownerId) {
    return NextResponse.json({ error: 'forbidden', hint: 'team is workspace-scoped' }, { status: 403 });
  }

  const members = await prisma.teamMember.findMany({
    where: { ownerId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(
    {
      data: members.map((m) => ({
        id: m.id,
        email: m.email,
        name: m.name,
        role: m.role,
        status: m.status,
        lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    },
    {
      headers: {
        // Edge cache (CLAUDE.md §38.100 Stage 24). Team list — invite/remove
        // mutation frequency düşük; 30s fresh + 2min SWR yeterli. `private`
        // directive cookie-isolated.
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // §22 — team_member rolündeki kullanıcı kendi davetlerini yönetemez,
  // sadece restaurant_owner workspace üzerinde davet yetkisine sahip.
  if (actor.source !== 'user' || actor.role !== 'restaurant_owner') {
    return NextResponse.json(
      { error: 'forbidden', hint: 'only workspace owner can invite' },
      { status: 403 },
    );
  }

  let body: { email?: string; name?: string; role?: string; locations?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (email.length > 200) {
    return NextResponse.json({ error: 'email_too_long' }, { status: 400 });
  }

  const role = body.role && VALID_ROLES.has(body.role) ? body.role : 'manager';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) || null : null;

  // locations is optional. When provided it must be a string[]. Anything
  // else (object, single string, mixed array) is a client bug — fail loud
  // instead of silently storing null.
  let locations: string[] | null = null;
  if (body.locations !== undefined && body.locations !== null) {
    if (
      !Array.isArray(body.locations) ||
      !body.locations.every((x) => typeof x === 'string' && x.length <= 64)
    ) {
      return NextResponse.json({ error: 'invalid_locations' }, { status: 400 });
    }
    const requested = body.locations.slice(0, 40);

    // IDOR — owner can only assign restaurants they actually own.
    // Without this check the owner could include any tenant's restaurant
    // id in `locations`, and `panel-access:getTeamMemberScope` would
    // happily hand the invitee read+write access to that other tenant
    // (panel-access reads `member.locations` verbatim). We intersect with
    // the owner's actual restaurant set; any unknown id is dropped silent.
    if (requested.length > 0) {
      const ownedRows = await prisma.restaurant.findMany({
        where: { id: { in: requested }, userId: actor.id },
        select: { id: true },
      });
      const ownedSet = new Set(ownedRows.map((r) => r.id));
      const filtered = requested.filter((id) => ownedSet.has(id));
      if (filtered.length === 0 && requested.length > 0) {
        return NextResponse.json(
          { error: 'invalid_locations', hint: 'no requested location is owned by you' },
          { status: 400 },
        );
      }
      locations = filtered;
    } else {
      locations = requested;
    }
  }

  // Faz 4 — invite token üret + mail tetikle. Token unique, expiresAt 7 gün.
  const inviteToken = await generateInviteToken();
  const inviteTokenExpiresAt = inviteExpiresAt();
  const now = new Date();

  const member = await prisma.teamMember.upsert({
    where: { ownerId_email: { ownerId: actor.id, email } },
    create: {
      ownerId: actor.id,
      email,
      name,
      role,
      locations: locations ?? undefined,
      status: 'invited',
      inviteToken,
      inviteTokenExpiresAt,
      lastInvitedAt: now,
    },
    update: {
      name: name ?? undefined,
      role,
      locations: locations ?? undefined,
      status: 'invited',
      // Re-invite (yeni token + expires yenilenir, eski token geçersiz)
      inviteToken,
      inviteTokenExpiresAt,
      lastInvitedAt: now,
    },
  });

  // Mail gönderim — owner workspace info'su için User'ı oku.
  // Restoran adları locations[] (veya tüm restoranlar) için lookup.
  const owner = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { name: true, email: true, locale: true },
  });

  let restaurantNames: string[] = [];
  if (locations && locations.length > 0) {
    const rows = await prisma.restaurant.findMany({
      where: { id: { in: locations }, userId: actor.id },
      select: { name: true },
    });
    restaurantNames = rows.map((r) => r.name);
  } else {
    // Tüm konumlar — owner'ın restoranlarını listele (ad olarak göster).
    const rows = await prisma.restaurant.findMany({
      where: { userId: actor.id },
      select: { name: true },
      take: 6,
    });
    restaurantNames = rows.map((r) => r.name);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const localeStr: 'tr' | 'en' = owner?.locale === 'en' ? 'en' : 'tr';
  const acceptUrl = `${appUrl}/${localeStr}/accept-invite?token=${inviteToken}`;

  // Fire-and-forget — mail başarısız olursa DB row yine yazılı kalır,
  // owner panelinden "Daveti yenile" ile retry edilebilir.
  void sendTeamInviteEmail({
    to: email,
    name: name,
    ownerName: owner?.name || owner?.email || 'Buaze',
    restaurantNames,
    roleLabel: roleLabel({ role, locale: localeStr }),
    acceptUrl,
    expiresInDays: INVITE_TOKEN_TTL_DAYS,
    locale: localeStr,
  }).catch((err) => {
    console.error('[team:invite] mail send failed:', (err as Error).message);
  });

  return NextResponse.json({
    ok: true,
    member: {
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
      status: member.status,
      lastSeenAt: null,
      lastInvitedAt: member.lastInvitedAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
    },
  });
}
