import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import {
  buildInviteBase,
  buildInviteToken,
  generateInviteCode,
  hashInviteCode,
} from '@/lib/admin-members';
import { sendPasswordResetEmail } from '@/lib/email';

// POST /api/admin/members/[id]/send-password-reset — admin-triggered invite
// resend. Same payload shape as POST /admin/members (creating the account
// already sent one). Rate-limited via User.lastInvitedAt: 1 hour cooldown
// per user, regardless of which admin triggers it (mail spam guard).
export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, locale: true, isActive: true, lastInvitedAt: true },
  });
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  if (!user.isActive) {
    return NextResponse.json({ error: 'user_inactive' }, { status: 400 });
  }

  if (user.lastInvitedAt) {
    const elapsed = Date.now() - user.lastInvitedAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: 'cooldown_active', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
  }

  const code = generateInviteCode();
  const codeHash = hashInviteCode(code);
  const token = await buildInviteToken({ userId: user.id, email: user.email, codeHash });
  const base = buildInviteBase(req);
  const locale = user.locale === 'en' ? 'en' : 'tr';
  const resetUrl = `${base}/${locale}/auth/reset-password?token=${encodeURIComponent(token)}`;

  let mailSent = false;
  try {
    mailSent = await sendPasswordResetEmail({ to: user.email, code, resetUrl, locale });
  } catch (err) {
    console.error('[MembersSendReset] mail failed:', err);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { lastInvitedAt: new Date() } }),
    prisma.adminAuditLog.create({
      data: {
        actorId: adminId,
        actorSource: 'admin',
        action: 'admin.members.send_password_reset',
        targetId: id,
        payload: { email: user.email, mailSent },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, mailSent, url: resetUrl });
}
