import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { sanitizeAuditPayload } from '@/lib/audit-log';
import { withServerTiming } from '@/lib/server-timing';

// Stage A3 §38.95 — owner-side KVKK transparency.
//
// Owner kendi audit log'unu görür (where actorId === user.id AND actorSource = 'user'
// VEYA targetId === user.id — admin tarafından owner'a yapılan aksiyonlar
// da görünür: "Admin şifrenizi sıfırladı", "Admin hesabınızı pasifleştirdi").
//
// KVKK §13.9 disipline: kişisel verilerin işlenmesine dair şeffaflık. Owner
// kendi hesabına ne olduğunu görür, raw IP/UA görmez (admin viewer'da bile
// schema'da yok). Payload PII redacted (email/phone mask).

export const dynamic = 'force-dynamic';

const LIMIT = 100;
const RETENTION_DAYS = 365 * 2;

async function handleGET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  // Admin source bu endpoint'i kullanmaz — admin /api/admin/audit-logs için.
  if (actor.source !== 'user') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const userId = typeof actor.id === 'string' ? actor.id : null;
  if (!userId) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  // Window: last 2 years (KVKK retention boundary).
  const windowStart = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Owner's own actions (actorId match) + admin actions targeting this owner
  // (targetId match). KVKK transparency requires both perspectives.
  let entries: Array<{
    id: string;
    // Stage A — actorId nullable; the hard-delete flow sets it NULL on
    // anonymised audit rows (KVKK right-to-be-forgotten).
    actorId: string | null;
    actorSource: string;
    action: string;
    targetId: string | null;
    payload: unknown;
    createdAt: Date;
  }> = [];

  try {
    entries = await prisma.adminAuditLog.findMany({
      where: {
        createdAt: { gte: windowStart },
        OR: [
          { actorId: userId, actorSource: 'user' },
          { targetId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
      select: {
        id: true,
        actorId: true,
        actorSource: true,
        action: true,
        targetId: true,
        payload: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error('[account/audit-log GET]', err);
    // Resilient fallback — empty list, UI shows "henüz kayıt yok".
    return NextResponse.json({ data: [] });
  }

  // Resolve actor labels for admin-source entries (owner doesn't need to know
  // admin email/role beyond username for KVKK trail).
  // Stage A — anonimleştirilmiş kayıtların actorId'i null olabilir; filter
  // ve dedupe sırasında bunları atla.
  const adminIds = Array.from(
    new Set(
      entries
        .filter((e) => e.actorSource === 'admin' && e.actorId)
        .map((e) => e.actorId as string),
    ),
  );
  let adminUsers: Array<{ id: string; username: string; role: string }> = [];
  try {
    if (adminIds.length) {
      adminUsers = await prisma.adminUser.findMany({
        where: { id: { in: adminIds } },
        select: { id: true, username: true, role: true },
      });
    }
  } catch {
    // Non-fatal.
  }
  const adminMap = new Map(adminUsers.map((a) => [a.id, a]));

  return NextResponse.json(
    {
      data: entries.map((e) => {
        let actorLabel: string;
        if (e.actorSource === 'admin') {
          // Hard-delete sonrası actorId null olabilir — anonim aktör.
          const a = e.actorId ? adminMap.get(e.actorId) : null;
          actorLabel = a ? `${a.username} (Yönetici)` : 'Yönetici';
        } else {
          actorLabel = 'Sen';
        }
        return {
          id: e.id,
          action: e.action,
          actorSource: e.actorSource,
          actorLabel,
          // Owner-facing payload — full mask (no email/phone leak from admin
          // actions like password reset). Always sanitize.
          payload: sanitizeAuditPayload(e.payload),
          createdAt: e.createdAt.toISOString(),
        };
      }),
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
