import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import {
  INVITE_RESEND_COOLDOWN_MS,
  INVITE_TOKEN_TTL_DAYS,
  generateInviteToken,
  inviteExpiresAt,
  roleLabel,
} from '@/lib/team-invite';
import { sendTeamInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Section 5 — Davet yenileme (Faz 4).
//
// Token expire olduysa veya kullanıcı maili kaybettiyse owner yeni bir token
// üretip mail'i yeniden gönderebilir. 1 saat cooldown — spam koruması.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (actor.source !== 'user') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const member = await prisma.teamMember.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      email: true,
      name: true,
      role: true,
      locations: true,
      status: true,
      lastInvitedAt: true,
    },
  });
  if (!member || member.ownerId !== actor.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (member.status === 'active') {
    return NextResponse.json(
      { error: 'already_active', hint: 'member already accepted invite' },
      { status: 400 },
    );
  }

  if (member.lastInvitedAt) {
    const elapsed = Date.now() - member.lastInvitedAt.getTime();
    if (elapsed < INVITE_RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((INVITE_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        {
          error: 'cooldown',
          retryAfterSeconds: retryAfter,
          hint: '1 hour between re-sends',
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
  }

  const inviteToken = await generateInviteToken();
  const updated = await prisma.teamMember.update({
    where: { id },
    data: {
      inviteToken,
      inviteTokenExpiresAt: inviteExpiresAt(),
      lastInvitedAt: new Date(),
      status: member.status === 'revoked' ? 'invited' : member.status,
    },
    select: { id: true, lastInvitedAt: true },
  });

  const owner = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { name: true, email: true, locale: true },
  });

  // Restoran adlarını locations[] (string[]) için çöz.
  let restaurantNames: string[] = [];
  const locs = (member.locations as string[] | null) ?? null;
  if (locs && locs.length > 0) {
    const rows = await prisma.restaurant.findMany({
      where: { id: { in: locs }, userId: actor.id },
      select: { name: true },
    });
    restaurantNames = rows.map((r) => r.name);
  } else {
    const rows = await prisma.restaurant.findMany({
      where: { userId: actor.id },
      select: { name: true },
      take: 6,
    });
    restaurantNames = rows.map((r) => r.name);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const localeStr: 'tr' | 'en' = owner?.locale === 'en' ? 'en' : 'tr';
  const acceptUrl = `${appUrl}/${localeStr}/accept-invite?token=${inviteToken}`;

  after(() =>

    sendTeamInviteEmail({
      to: member.email,
      name: member.name,
      ownerName: owner?.name || owner?.email || 'Buaze',
      restaurantNames,
      roleLabel: roleLabel({ role: member.role, locale: localeStr }),
      acceptUrl,
      expiresInDays: INVITE_TOKEN_TTL_DAYS,
      locale: localeStr,
    }).catch((err) => {
      console.error('[team:resend] mail send failed:', (err as Error).message);
    }),

  );

  return NextResponse.json({
    ok: true,
    lastInvitedAt: updated.lastInvitedAt?.toISOString() ?? null,
  });
}
