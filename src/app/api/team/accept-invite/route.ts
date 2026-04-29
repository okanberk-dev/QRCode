import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { isStrongPassword } from '@/lib/validations';
import { sendVerifyEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 5 — Davet kabul akışı (Faz 4 + §22 update).
//
// GET ?token=...
//   Token geçerli mi kontrol eder, public landing page için detay döner
//   (owner adı, role, locations, expiresAt). Auth GEREKMEZ — token bilgi.
//
// POST { token, name?, password?, phoneNumber? }
//   Davet kabul edilir.
//   - Email zaten User olarak varsa: TeamMember.status = 'active' → /dashboard
//   - Yoksa: name + password + (opsiyonel phone) zorunlu. User create
//     (emailVerified=false, role='team_member'), TeamMember activate, verify
//     mail tetikle, client → /auth/check-email yönlendir.
//   §22'den önce bu endpoint hesap yoksa /auth/register'a redirect ediyordu;
//   artık self-contained — davet linki tek formla biter.

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat
const TRIAL_DAYS = 14;

function generateVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

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

interface AcceptResponse {
  ok: boolean;
  needsVerification?: boolean;
  email?: string;
  redirectTo?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<AcceptResponse>> {
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
  const verifyToken = generateVerifyToken();
  const verifyTokenExpiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  // tx: User create + TeamMember activate atomik. Davet kabul edilirken
  // User insert'i FAIL olursa TeamMember 'invited' kalmalı (idempotent retry).
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
        emailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyTokenExpiresAt: verifyTokenExpiresAt,
      },
      select: { id: true, email: true, name: true },
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

  // Verify maili — fire-and-forget. notifyOpsOfMailFailure sender içinde
  // (CLAUDE.md §21.33). Mail gitmezse kullanıcı /auth/check-email'da
  // "Tekrar gönder" butonunu kullanır.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  const verifyUrl = `${appUrl}/${localeStr}/auth/verify-email?token=${verifyToken}`;
  void sendVerifyEmail({
    to: created.email,
    firstName: created.name,
    verifyUrl,
    locale: localeStr,
  }).catch((err) => {
    console.error('[accept-invite] verify mail send failed:', (err as Error).message);
  });

  return NextResponse.json({
    ok: true,
    needsVerification: true,
    email: created.email,
    redirectTo: `/${localeStr}/auth/check-email?email=${encodeURIComponent(created.email)}`,
  });
}
