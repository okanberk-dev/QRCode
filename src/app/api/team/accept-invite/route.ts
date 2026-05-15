import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit, maybeSweep } from '@/lib/rate-limit';
import { isStrongPassword } from '@/lib/validations';
import { issueLoginSession } from '@/app/api/auth/login/route';
import { sendTeamMemberJoinedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 5 — Davet kabul akışı (Faz 4 + §22 update + invite-direct-login fix).
//
// GET ?token=...
//   Token geçerli mi kontrol eder, public landing page için detay döner
//   (owner adı, role, locations, expiresAt). Auth GEREKMEZ — token bilgi.
//
// POST { token, name?, password?, phoneNumber? }
//   Davet kabul edilir.
//   - Email zaten User olarak varsa: TeamMember.status = 'active' → /dashboard
//   - Yoksa: name + password + (opsiyonel phone) zorunlu. User create
//     (emailVerified=true — davet token'ı verification proof'u, Slack/Notion/
//     Linear pattern), TeamMember activate, login session issue (cookie set
//     + UserSession row), client → /dashboard direkt giriş.
//   §22'den önce bu endpoint hesap yoksa /auth/register'a redirect ediyordu;
//   sonra self-contained form'a geçti ama check-email step'i kalıyordu;
//   artık davet → form → giriş tek seferde tamamlanır.

const TRIAL_DAYS = 14;

interface InviteInfo {
  ok: true;
  email: string;
  ownerName: string | null;
  role: string;
  roleLabel: string;
  roleLabelEn: string;
  /**
   * Workspace restaurants the invitee will gain access to. When the owner
   * didn't pin specific locations, this falls back to the owner's full
   * restaurant list (same semantics as the team-invite mail template's
   * "Tüm konumlar / All locations" line). The accept page renders this as
   * chips so the user can confirm which business they're joining BEFORE
   * filling out the signup form — this is the "o işletmeyi tanımlıyor mu?"
   * answer the user explicitly asked for.
   */
  restaurantNames: string[];
  /** True when the owner left "locations" blank (= access to all). */
  allLocations: boolean;
  expiresAt: string;
  expired: boolean;
  hasAccount: boolean;
}

interface InviteError {
  ok: false;
  error: 'invalid_token' | 'expired' | 'already_accepted' | 'revoked';
}

const ROLE_LABELS_TR: Record<string, string> = {
  owner: 'Sahip',
  manager: 'Yönetici',
  staff: 'Personel',
  viewer: 'Sadece görüntüleyici',
};

const ROLE_LABELS_EN: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
};

/**
 * Wave B2 (CLAUDE.md §38.B) — fire-and-forget notification to the OWNER
 * after a member successfully joins. Looks up owner contact + workspace
 * restaurants in a single $transaction (CLAUDE.md §40.1) and dispatches
 * the mail through the public sender (ops alert wired). Caller never
 * awaits; any failure is contained inside the helper.
 */
async function notifyOwnerOfJoin(opts: {
  ownerId: string;
  memberId: string;
  memberEmail: string;
  memberName: string | null;
  memberRole: string;
}): Promise<void> {
  try {
    const [owner, memberRow] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: opts.ownerId },
        select: { email: true, name: true, locale: true },
      }),
      prisma.teamMember.findUnique({
        where: { id: opts.memberId },
        select: { locations: true },
      }),
    ]);
    if (!owner?.email) return;

    const ownerLocale: 'tr' | 'en' = owner.locale === 'en' ? 'en' : 'tr';
    const roleLabel = ownerLocale === 'en'
      ? (ROLE_LABELS_EN[opts.memberRole] ?? 'Member')
      : (ROLE_LABELS_TR[opts.memberRole] ?? 'Üye');

    // Resolve location names — same IDOR-safe path the GET handler uses.
    const pinnedLocations = Array.isArray(memberRow?.locations)
      ? (memberRow.locations as unknown[]).filter(
          (value): value is string => typeof value === 'string' && value.length > 0,
        )
      : [];
    const allLocations = pinnedLocations.length === 0;
    const restaurants = allLocations
      ? await prisma.restaurant.findMany({
          where: { userId: opts.ownerId },
          select: { name: true },
          orderBy: { name: 'asc' },
        })
      : await prisma.restaurant.findMany({
          where: { id: { in: pinnedLocations }, userId: opts.ownerId },
          select: { name: true },
          orderBy: { name: 'asc' },
        });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
    const teamUrl = `${appUrl}/${ownerLocale}/dashboard/account?section=team`;

    await sendTeamMemberJoinedEmail({
      to: owner.email,
      ownerName: owner.name,
      memberName: opts.memberName || opts.memberEmail,
      roleLabel,
      locationNames: allLocations ? null : restaurants.map((r) => r.name),
      teamUrl,
      locale: ownerLocale,
    });
  } catch (err) {
    // Sender already logs/alerts on send failure; we only need to swallow
    // unexpected throws (e.g. Prisma connection drop) so the caller's
    // success path isn't gated on the notification.
    console.error('[ACCEPT_INVITE] owner-notify failed', {
      ownerId: opts.ownerId,
      memberId: opts.memberId,
      errName: err instanceof Error ? err.name : 'unknown',
    });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse<InviteInfo | InviteError>> {
  maybeSweep();
  // CLAUDE.md §37.2.D — `getClientIp()` parse normalization (XFF stuffing
  // engelleyici). Ham `headers.get('x-forwarded-for')` `a, b, c` formatında
  // tüm string'i key'e koyup pivot vector açıyordu.
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`invite:lookup:${ip}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'invalid_token' as const },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const token = (req.nextUrl.searchParams.get('token') ?? '').trim();
  if (!token || token.length < 32) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 200 });
  }

  const member = await prisma.teamMember.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      ownerId: true,
      email: true,
      role: true,
      locations: true,
      status: true,
      inviteTokenExpiresAt: true,
    },
  });
  if (!member) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 200 });
  }
  if (member.status === 'revoked') {
    return NextResponse.json({ ok: false, error: 'revoked' }, { status: 200 });
  }
  if (member.status === 'active') {
    return NextResponse.json({ ok: false, error: 'already_accepted' }, { status: 200 });
  }
  const expired =
    !!member.inviteTokenExpiresAt && member.inviteTokenExpiresAt.getTime() < Date.now();
  if (expired) {
    return NextResponse.json({ ok: false, error: 'expired' }, { status: 200 });
  }

  // `locations` is Prisma `Json?` so it can arrive as a string[] (owner pinned
  // specific restaurants), an empty array, or null (= owner left it blank, full
  // workspace access). Narrow to a clean string[] before we hit Prisma.
  const pinnedLocations = Array.isArray(member.locations)
    ? (member.locations as unknown[]).filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      )
    : [];
  const allLocations = pinnedLocations.length === 0;

  const [owner, hasAccount, restaurants] = await Promise.all([
    prisma.user.findUnique({
      where: { id: member.ownerId },
      select: { name: true, email: true },
    }),
    prisma.user.findUnique({
      where: { email: member.email },
      select: { id: true },
    }),
    // IDOR-safe: only restaurants owned by the inviter (member.ownerId) so a
    // malformed `locations` payload can never leak names from other tenants.
    allLocations
      ? prisma.restaurant.findMany({
          where: { userId: member.ownerId },
          select: { name: true },
          orderBy: { name: 'asc' },
        })
      : prisma.restaurant.findMany({
          where: { id: { in: pinnedLocations }, userId: member.ownerId },
          select: { name: true },
          orderBy: { name: 'asc' },
        }),
  ]);

  return NextResponse.json({
    ok: true,
    email: member.email,
    ownerName: owner?.name ?? owner?.email ?? null,
    role: member.role,
    roleLabel: ROLE_LABELS_TR[member.role] ?? 'Üye',
    roleLabelEn: ROLE_LABELS_EN[member.role] ?? 'Member',
    restaurantNames: restaurants.map((r) => r.name),
    allLocations,
    expiresAt: member.inviteTokenExpiresAt?.toISOString() ?? '',
    expired: false,
    hasAccount: Boolean(hasAccount),
  });
}

// POST dönüş shape'i `issueLoginSession` (login default body + extraBody merge)
// veya error response'u olabilir. Tek tip ile sıkmak yerine `NextResponse`'ı
// gevşek tutuyoruz; frontend runtime parse ile `ok` + `redirectTo` field'larını
// okur.
export async function POST(req: NextRequest): Promise<NextResponse> {
  maybeSweep();
  // CLAUDE.md §37.2.D — `getClientIp()` parse normalization.
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`invite:accept:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  let body: {
    token?: string;
    name?: string;
    password?: string;
    phoneNumber?: string;
    locale?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const token = (body.token ?? '').trim();
  if (!token || token.length < 32) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
  }

  const member = await prisma.teamMember.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      inviteTokenExpiresAt: true,
      ownerId: true,
    },
  });
  if (!member) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
  }
  if (member.status === 'active') {
    return NextResponse.json({ ok: true, redirectTo: '/dashboard' }, { status: 200 });
  }
  if (member.status === 'revoked') {
    return NextResponse.json({ ok: false, error: 'revoked' }, { status: 400 });
  }
  if (
    !member.inviteTokenExpiresAt ||
    member.inviteTokenExpiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json({ ok: false, error: 'expired' }, { status: 400 });
  }

  const localeStr: 'tr' | 'en' = body.locale === 'en' ? 'en' : 'tr';

  // Cross-tenant active duplicate guard.
  //
  // `TeamMember` has a unique constraint on `[ownerId, email]`, which prevents
  // an owner from sending two pending invites to the same address — but does
  // NOT stop two DIFFERENT owners from each inviting the same email and the
  // invitee accepting both, ending up active under multiple tenants. Buaze is
  // a single-tenant-per-user product (User.role + at most one active
  // TeamMember row), so we reject the second acceptance with a clear message
  // instead of silently activating it. The check excludes the row we're about
  // to accept so re-entry of an already-active invite still hits the
  // `member.status === 'active'` idempotent branch above.
  const conflictingActiveMembership = await prisma.teamMember.findFirst({
    where: {
      email: member.email,
      status: 'active',
      NOT: { id: member.id },
    },
    select: { id: true },
  });
  if (conflictingActiveMembership) {
    return NextResponse.json(
      { ok: false, error: 'cross_tenant_active' },
      { status: 409 },
    );
  }

  // Davet edilen email zaten Buaze hesabı sahibi mi?
  const existingAccount = await prisma.user.findUnique({
    where: { email: member.email },
    select: { id: true },
  });

  if (existingAccount) {
    // Mevcut hesap akışı — sadece TeamMember'ı aktive et, User'a dokunma
    // (zaten kendi şifresi + verify durumu var). Verify mail GÖNDERİLMEZ.
    await prisma.teamMember.update({
      where: { id: member.id },
      data: {
        status: 'active',
        inviteToken: null,
        inviteTokenExpiresAt: null,
      },
    });

    // Wave B2 — fire-and-forget owner notification. Member name comes from
    // the existing User row (they're already in the system).
    const existingUserName = await prisma.user
      .findUnique({ where: { id: existingAccount.id }, select: { name: true } })
      .then((u) => u?.name ?? null)
      .catch(() => null);
    notifyOwnerOfJoin({
      ownerId: member.ownerId,
      memberId: member.id,
      memberEmail: member.email,
      memberName: existingUserName,
      memberRole: member.role,
    }).catch(() => {
      // already-swallowed inside helper, defence-in-depth
    });

    return NextResponse.json({ ok: true, redirectTo: `/${localeStr}/dashboard` });
  }

  // Yeni hesap akışı — name + password zorunlu, phone opsiyonel.
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const phoneNumberRaw = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim().slice(0, 40) : '';
  const phoneNumber = phoneNumberRaw.length > 0 ? phoneNumberRaw : null;

  if (!name) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
  }
  if (!password || !isStrongPassword(password)) {
    return NextResponse.json({ ok: false, error: 'weak_password' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  // tx: User create + TeamMember activate atomik. Davet kabul edilirken
  // User insert'i FAIL olursa TeamMember 'invited' kalmalı (idempotent retry).
  // emailVerified=true — davet linki tek-kullanımlık unique token taşıdığı
  // için linke tıklayan kullanıcı zaten inbox sahibi olduğunu kanıtlamış
  // sayılır (Slack/Notion/Linear akışı). Verify maili gönderilmez.
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: member.email,
        passwordHash,
        name,
        phoneNumber,
        plan: 'trial',
        trialEndsAt,
        // §22: davet edilen kullanıcılar 'team_member' rolüyle yaratılır;
        // panel-access bu role'ü TeamMember.locations'tan scope eder.
        role: 'team_member',
        locale: localeStr,
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        trialEndsAt: true,
      },
    });
    await tx.teamMember.update({
      where: { id: member.id },
      data: {
        status: 'active',
        inviteToken: null,
        inviteTokenExpiresAt: null,
      },
    });
    return user;
  });

  // Wave B2 — fire-and-forget owner notification for the new account path.
  notifyOwnerOfJoin({
    ownerId: member.ownerId,
    memberId: member.id,
    memberEmail: member.email,
    memberName: name,
    memberRole: member.role,
  }).catch(() => {
    // helper swallows internally; defence-in-depth catch
  });

  // Direct login — issueLoginSession cookie + UserSession row create yapar.
  // extraBody ile accept-invite response shape'i (`ok: true`, `redirectTo`)
  // login default body'sine merge edilir; frontend `data.ok` ve
  // `data.redirectTo` field'larını okur.
  return await issueLoginSession({
    req,
    user: created,
    rememberMe: false,
    extraBody: {
      ok: true,
      redirectTo: `/${localeStr}/dashboard`,
    },
  });
}
