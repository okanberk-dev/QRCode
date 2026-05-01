import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { isStrongPassword } from '@/lib/validations';
import { issueLoginSession } from '@/app/api/auth/login/route';

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
  roleLabel: string;
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

export async function GET(req: NextRequest): Promise<NextResponse<InviteInfo | InviteError>> {
  maybeSweep();
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
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

  const [owner, hasAccount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: member.ownerId },
      select: { name: true, email: true },
    }),
    prisma.user.findUnique({
      where: { email: member.email },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    email: member.email,
    ownerName: owner?.name ?? owner?.email ?? null,
    roleLabel: ROLE_LABELS_TR[member.role] ?? 'Üye',
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
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
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

  const passwordHash = await bcrypt.hash(password, 12);
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
