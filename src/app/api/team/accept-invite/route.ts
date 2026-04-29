import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 5 — Davet kabul akışı (Faz 4).
//
// GET ?token=...
//   Token geçerli mi kontrol eder, public landing page için detay döner
//   (owner adı, role, locations, expiresAt). Auth GEREKMEZ — token bilgi.
//
// POST { token, name?, password? }
//   Davet kabul edilir. Email zaten User olarak varsa: TeamMember.status =
//   'active'. Yoksa: User row create + TeamMember.status = 'active'. Şu an
//   davet edilen kişi henüz buaze hesabı oluşturmadığında, Faz 4 scope'unda
//   kullanıcı /auth/register'a yönlendirilir (bu endpoint sadece TeamMember
//   row'unu activate eder, User row create akışı /auth/register'a bırakılır).

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
  needsAccount?: boolean;
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

  let body: { token?: string } = {};
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
    },
  });
  if (!member) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
  }
  if (member.status === 'active') {
    return NextResponse.json({ ok: true, redirectTo: '/' }, { status: 200 });
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

  // Davet edilen kişinin User hesabı var mı? Yoksa /auth/register'a yönlendir
  // (kayıt sonrası mail eşleşmesi otomatik olarak TeamMember activate akışına
  // bağlanmıyor — Faz 4 scope'unda manuel: kayıt sonrası kullanıcı tekrar
  // accept linkine tıklar). Backend gap raporlanmalı.
  const account = await prisma.user.findUnique({
    where: { email: member.email },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({
      ok: false,
      needsAccount: true,
      redirectTo: `/auth/register?email=${encodeURIComponent(member.email)}&inviteToken=${token}`,
    });
  }

  await prisma.teamMember.update({
    where: { id: member.id },
    data: {
      status: 'active',
      // Token'ı bir kez kullanıldıktan sonra geçersizleştir.
      inviteToken: null,
      inviteTokenExpiresAt: null,
    },
  });

  return NextResponse.json({ ok: true, redirectTo: '/' });
}
