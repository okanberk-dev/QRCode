import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { writeAdminAuditLog } from '@/lib/audit-log';

// Stage A4 §38.96 — impersonation auto-timeout cron.
//
// Schedule: */5 * * * * (5 dakika). 30dk window'lı session'lar manual /end
// olmadan kapatılır. CLAUDE.md §21.13 self-fetch antipattern'ından kaçınmak
// için `runExpireImpersonationSessions()` shared helper export'lu (admin
// manuel trigger ileride).

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// CLAUDE.md §38.11 paterni — Vercel Pro default 60s; 5dk window'da batch
// expire için 60s yeterli ama defansif 300s.
export const maxDuration = 300;

interface ExpireResult {
  ok: boolean;
  expiredCount: number;
  durationMs: number;
}

export async function runExpireImpersonationSessions(): Promise<ExpireResult> {
  const started = Date.now();
  const now = new Date();

  // Aktif (endedAt=null) + süresi geçmiş (endsAt<now) session'ları seç.
  // Index `[endedAt, endsAt]` (schema A4 §38.96) bu query için kuruldu.
  const expired = await prisma.impersonationSession.findMany({
    where: { endedAt: null, endsAt: { lt: now } },
    select: { id: true, adminId: true, targetUserId: true },
    take: 500,
  });

  if (expired.length === 0) {
    return { ok: true, expiredCount: 0, durationMs: Date.now() - started };
  }

  // Bulk close — atomic updateMany.
  await prisma.impersonationSession.updateMany({
    where: { id: { in: expired.map((s) => s.id) } },
    data: { endedAt: now, endedReason: 'timeout' },
  });

  // Audit log + Sentry warn — "active session expired without manual close"
  // ops monitoring sinyali. Per-session entry; volume düşük (typical < 5/run).
  for (const s of expired) {
    await writeAdminAuditLog({
      actorId: s.adminId,
      actorSource: 'admin',
      action: 'admin.impersonate.end',
      targetId: s.targetUserId,
      payload: { sessionId: s.id, endedReason: 'timeout' },
    });
  }

  Sentry.captureMessage('impersonation:timeout', {
    level: 'warning',
    tags: {
      kind: 'impersonation',
      impersonating: 'true',
      endedReason: 'timeout',
    },
    extra: {
      expiredCount: expired.length,
      sessionIds: expired.map((s) => s.id),
    },
  });

  return { ok: true, expiredCount: expired.length, durationMs: Date.now() - started };
}

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runExpireImpersonationSessions();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[cron/expire-impersonation-sessions]', err);
    Sentry.captureException(err, {
      tags: { cron: 'expire-impersonation-sessions' },
    });
    return NextResponse.json({ ok: false, error: 'cron_failed' }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/expire-impersonation-sessions', handleCron);
