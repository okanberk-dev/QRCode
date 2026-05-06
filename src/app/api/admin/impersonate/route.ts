import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest, signJwt } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { validateBody } from '@/lib/api/validate';
import { sendImpersonationStartEmail } from '@/lib/email';

// Stage A4 §38.96 — admin "Owner gibi gör" / shadow mode endpoint.
//
// Auth: superadmin OR hasPermission(adminId, 'impersonation', 'write').
// Rate limit: 3/saat/admin (abuse koruması — superadmin kötü niyetli admin'e
// karşı bile koruma).
//
// KVKK + audit + auto-timeout disipline:
//   - reason zorunlu (min 20 char) — superadmin niye girdiğini açıklar, audit
//     trail'de saklanır
//   - 30dk timeout (`endsAt`) — cron her 5dk'da bir geçen session'ı kapatır
//   - User'a anlık mail bildirimi (transparency: KVKK §13.9)
//   - AdminAuditLog `admin.impersonate.start` (Sentry tag fire-and-forget)
//
// JWT issue: target user'ın `user_token`'ı + `impersonating: {adminId, sessionId}`
// claim'i. Cookie httpOnly. Admin'in mevcut `admin_token` cookie'si silinmez —
// /end endpoint impersonation çıkışında geri yüklenir (admin oturumu intact).

export const dynamic = 'force-dynamic';

const ImpersonateSchema = z
  .object({
    targetUserId: z.string().cuid(),
    reason: z.string().min(20).max(500),
  })
  .strict();

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30dk

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Stage A2 §38.94 — RBAC: 'impersonation:write'. Superadmin bypass otomatik.
  if (!(await hasPermission(adminId, 'impersonation', 'write'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Rate limit — 3/saat. CLAUDE.md §14.2 paterni reuse.
  const limit = await rateLimit(`impersonate:${adminId}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        retryAfter: limit.retryAfterSeconds ?? 3600,
      },
      { status: 429 },
    );
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = validateBody(ImpersonateSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  try {
    // Verify target user exists + active.
    const target = await prisma.user.findUnique({
      where: { id: data.targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        locale: true,
      },
    });
    if (!target) {
      return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
    }
    if (!target.isActive) {
      return NextResponse.json(
        { error: 'target_inactive' },
        { status: 400 },
      );
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + SESSION_DURATION_MS);

    // Create session row + issue JWT — atomic (Prisma transaction yok ama sıralı
    // başarısızlık tolere edilir: session var, cookie set olmadıysa /end endpoint
    // veya cron temizler).
    const session = await prisma.impersonationSession.create({
      data: {
        adminId,
        targetUserId: target.id,
        reason: data.reason,
        startedAt,
        endsAt,
      },
      select: { id: true },
    });

    const token = await signJwt({
      userId: target.id,
      email: target.email,
      role: 'restaurant_owner',
      // Stage A4 §38.96 — impersonation claim. JWT verify edilir + DB lookup
      // (auth.ts) hâlâ aktif session var mı doğrular. Forge / expired token
      // için defense-in-depth.
      impersonating: {
        adminId,
        sessionId: session.id,
      },
    });

    const response = NextResponse.json({
      ok: true,
      sessionId: session.id,
      endsAt: endsAt.toISOString(),
      redirectTo: `/${target.locale}/dashboard`,
    });

    const isSecure =
      process.env.NODE_ENV === 'production' &&
      (req.headers.get('x-forwarded-proto') === 'https' ||
        req.nextUrl.protocol === 'https:');

    // Set user_token = target's session. admin_token KORUNUR — /end endpoint
    // ile çıkışta admin geri kazanır (browser'da hâlâ aktif). Bu nedenle iki
    // cookie aynı anda set: middleware öncelikle user_token'ı görür ama
    // admin_token referans olarak kalır (impersonation banner ve /end için).
    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_DURATION_MS / 1000), // 30dk
      path: '/',
    });

    // Audit log — start. Sentry tag otomatik (helper içinde).
    await writeAdminAuditLog({
      actorId: adminId,
      actorSource: 'admin',
      action: 'admin.impersonate.start',
      targetId: target.id,
      payload: {
        sessionId: session.id,
        reason: data.reason,
        endsAt: endsAt.toISOString(),
      },
    });

    // Sentry tag — impersonation lifecycle (CLAUDE.md §26.2 KVKK PII guard).
    Sentry.captureMessage('impersonation:start', {
      level: 'warning',
      tags: {
        kind: 'impersonation',
        impersonating: 'true',
      },
      extra: {
        adminId,
        targetUserId: target.id,
        sessionId: session.id,
        reason: data.reason.slice(0, 80), // truncate, no PII (target email/name omit)
      },
    });

    // User'a transparency mail (CLAUDE.md §21 paterni). Fire-and-forget —
    // mail send fail impersonation flow'u kırmaz. Email body PII guard'lı
    // (CLAUDE.md §37.2 H + §37.7).
    sendImpersonationStartEmail({
      recipient: target.email,
      recipientName: target.name,
      adminUsername: typeof admin.username === 'string' ? admin.username : 'Yönetici',
      reason: data.reason,
      endsAt,
      locale: target.locale === 'en' ? 'en' : 'tr',
    }).catch((err) => {
      console.error('[impersonate] mail send failed', (err as Error).message);
    });

    return response;
  } catch (err) {
    console.error('[admin/impersonate POST]', err);
    return NextResponse.json({ error: 'impersonate_failed' }, { status: 500 });
  }
}
