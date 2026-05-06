import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { writeAdminAuditLog } from '@/lib/audit-log';

// Stage A4 §38.96 — impersonation çıkış endpoint.
//
// Auth: getPanelActorFromRequest — şu an actor.source='user' olabilir
// (impersonation aktif) ama actor.realAdminId set ise gerçek admin'dir.
// Bu endpoint user_token cookie'sini siler (admin_token zaten browser'da
// duruyordu, /admin/* path'i tekrar açılır).
//
// Not: rate limit yok — admin çıkıştan her zaman yapabilmeli (security
// abort mekanizması gibi). Side-effect minimaldir (DB update + cookie clear).

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Çift-koruma: ya impersonation aktif (realAdminId set), ya da admin token
  // cookie'sini taşıyor. İkisinden biri yoksa 400 — anonim kullanıcı zaten
  // /end çağırmaz.
  const adminId =
    typeof actor.realAdminId === 'string'
      ? actor.realAdminId
      : actor.source === 'admin' && typeof actor.id === 'string'
        ? actor.id
        : null;
  if (!adminId) {
    return NextResponse.json({ error: 'no_active_session' }, { status: 400 });
  }

  const sessionId =
    typeof actor.impersonationSessionId === 'string'
      ? actor.impersonationSessionId
      : null;

  try {
    // Aktif session'ı kapat — sessionId varsa direkt; yoksa adminId+ended_at
    // null fallback (cookie kaybolmuş olabilir).
    let closed: { id: string; targetUserId: string } | null = null;
    if (sessionId) {
      const updated = await prisma.impersonationSession.updateMany({
        where: { id: sessionId, endedAt: null },
        data: { endedAt: new Date(), endedReason: 'manual' },
      });
      if (updated.count > 0) {
        const session = await prisma.impersonationSession.findUnique({
          where: { id: sessionId },
          select: { id: true, targetUserId: true },
        });
        closed = session;
      }
    } else {
      // Fallback — admin'in en güncel aktif session'ını kapat.
      const session = await prisma.impersonationSession.findFirst({
        where: { adminId, endedAt: null },
        orderBy: { startedAt: 'desc' },
        select: { id: true, targetUserId: true },
      });
      if (session) {
        await prisma.impersonationSession.update({
          where: { id: session.id },
          data: { endedAt: new Date(), endedReason: 'manual' },
        });
        closed = session;
      }
    }

    // Audit + Sentry tag.
    if (closed) {
      await writeAdminAuditLog({
        actorId: adminId,
        actorSource: 'admin',
        action: 'admin.impersonate.end',
        targetId: closed.targetUserId,
        payload: { sessionId: closed.id, endedReason: 'manual' },
      });
      Sentry.captureMessage('impersonation:end', {
        level: 'info',
        tags: {
          kind: 'impersonation',
          impersonating: 'true',
          endedReason: 'manual',
        },
        extra: {
          adminId,
          sessionId: closed.id,
          targetUserId: closed.targetUserId,
        },
      });
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: '/admin/dashboard',
    });

    const isSecure =
      process.env.NODE_ENV === 'production' &&
      (req.headers.get('x-forwarded-proto') === 'https' ||
        req.nextUrl.protocol === 'https:');

    // user_token sil — admin_token cookie zaten duruyor (impersonation start
    // sırasında silinmedi). Admin tekrar /admin/* path'ine erişir.
    response.cookies.set('user_token', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[admin/impersonate/end POST]', err);
    return NextResponse.json({ error: 'end_failed' }, { status: 500 });
  }
}
