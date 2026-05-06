import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import {
  buildInviteBase,
  buildInviteToken,
  buildMembersWhere,
  generateInviteCode,
  hashInviteCode,
  parseListMembersParams,
  VALID_PLANS,
} from '@/lib/admin-members';
import { sendPasswordResetEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/bcrypt-config';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const VALID_LOCALES = new Set(['tr', 'en']);

// GET /api/admin/members — paginated, searchable, filterable list of restaurant
// owner accounts. Backwards-compatible: when no query params given, returns the
// active superset (status=active default) — older list UIs still see "all
// active members" without changes.
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
  }

  const params = parseListMembersParams(req.nextUrl.searchParams);
  const where = buildMembersWhere(params);

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((params.page ?? 1) - 1) * (params.perPage ?? 25),
        take: params.perPage ?? 25,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          trialEndsAt: true,
          isActive: true,
          deactivatedAt: true,
          lastInvitedAt: true,
          createdAt: true,
          _count: { select: { restaurants: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: users,
      meta: {
        total,
        page: params.page ?? 1,
        perPage: params.perPage ?? 25,
        totalPages: Math.max(1, Math.ceil(total / (params.perPage ?? 25))),
      },
    });
  } catch (error) {
    console.error('[MEMBERS GET]', error);
    return NextResponse.json({ error: 'Kullanıcılar alınamadı' }, { status: 500 });
  }
}

// POST /api/admin/members — create a new business owner account.
// Generates a random password (server-only) and emails an invite link the user
// can use to set their own password (mirrors the forgot-password flow but
// triggered admin-side). Audit-logged.
export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const planRaw = typeof body.plan === 'string' ? body.plan : 'trial';
  const localeRaw = typeof body.locale === 'string' ? body.locale : 'tr';

  if (!email || email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  const plan = (VALID_PLANS as readonly string[]).includes(planRaw) ? planRaw : 'trial';
  const locale = VALID_LOCALES.has(localeRaw) ? localeRaw : 'tr';

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 });
  }

  // Random 32-byte password — admin never sees it; the user resets via the
  // invite link before first login. Bcrypt cost 10 (matches register).
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(randomPassword, BCRYPT_COST);

  // 14-day trial by default for trial plan; null for other plans.
  const trialEndsAt =
    plan === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash,
      role: 'restaurant_owner',
      plan,
      trialEndsAt,
      locale,
      lastInvitedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      trialEndsAt: true,
      isActive: true,
      lastInvitedAt: true,
      createdAt: true,
    },
  });

  // Send invite mail (reuses password-reset template). Fire-and-forget; admin
  // can resend from detail page. Token + base URL pattern mirrors
  // /api/auth/forgot-password.
  const code = generateInviteCode();
  const codeHash = hashInviteCode(code);
  const token = await buildInviteToken({ userId: user.id, email: user.email, codeHash });
  const base = buildInviteBase(req);
  const resetUrl = `${base}/${locale}/auth/reset-password?token=${encodeURIComponent(token)}`;

  let mailSent = false;
  try {
    mailSent = await sendPasswordResetEmail({ to: email, code, resetUrl, locale: locale as 'tr' | 'en' });
  } catch (err) {
    console.error('[MembersCreate] invite mail failed:', err);
  }

  await prisma.adminAuditLog.create({
    data: {
      actorId: adminId,
      actorSource: 'admin',
      action: 'admin.members.create',
      targetId: user.id,
      payload: {
        email,
        plan,
        locale,
        mailSent,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    user,
    invite: {
      mailSent,
      // Return the URL so the admin can copy/share manually if mail delivery
      // is shaky (e.g., RESEND_API_KEY missing). Code itself is NOT exposed
      // beyond the email body — admin only gets the URL.
      url: resetUrl,
    },
  });
}
