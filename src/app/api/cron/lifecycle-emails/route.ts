import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  applyLifecycleRules,
  buildLifecycleContexts,
  type LifecycleApplyParams,
} from '@/lib/lifecycle-email-rules';
import type { LifecycleEmailType } from '@/lib/email/lifecycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Lifecycle email cron (CLAUDE.md §21.34 + §23.7 Phase 11.30).
// Vercel Cron tarafından günde 1 kez çağrılır (`0 8 * * *` UTC).
//
// Akış:
//   1. CRON_SECRET guard
//   2. Batch active user'ları çek (BATCH_SIZE=100)
//   3. buildLifecycleContexts → her user × restaurant için aggregate context
//   4. applyLifecycleRules → 4 kuralı sırayla check, idempotent gönderim
//   5. Summary döner: sent (per type), skipped, failures, duration
//
// Idempotency: LifecycleEmailLog ile (CLAUDE.md §21.34). Cooldown'lar:
//   - qr_not_downloaded:      lifetime
//   - first_feedback_tips:    lifetime
//   - upgrade_suggestion:     30 gün
//   - inactive_reactivation:  30 gün
//
// BATCH_SIZE = 1000 (Phase 11.32 fix): eskiden 100'dü, hep aynı en eski 100
// user kapsanıyordu — 101+ user'lar lifecycle email asla almıyordu (deterministik
// bug, audit'te yakalandı). 1000 effectively unbounded for current scale; Buaze
// 1000+ user'a ulaştığında cursor-based pagination eklenir.

const BATCH_SIZE = 1000;

interface LifecycleSummary {
  usersChecked: number;
  contextsProcessed: number;
  sent: Record<LifecycleEmailType, number>;
  skipped: number;
  failures: number;
  durationMs: number;
}

/**
 * Cron logic — shared helper. Hem GET handler hem (gelecekte) admin manual
 * trigger doğrudan çağırabilir (CLAUDE.md §21.13 self-fetch antipattern).
 */
export async function runLifecycleEmails(): Promise<LifecycleSummary> {
  const start = Date.now();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';

  const users = await prisma.user.findMany({
    where: { isActive: true },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);
  let contexts: LifecycleApplyParams[] = [];
  try {
    contexts = await buildLifecycleContexts(userIds, appUrl);
  } catch (err) {
    console.error('[lifecycle-emails cron] buildLifecycleContexts failed', err);
  }

  // CLAUDE.md §43 + §21.34 — monthly_health_report ayrı cron'da gönderilir
  // (`/api/cron/monthly-health-report`). Lifecycle cron buradan sıfır kalır;
  // counter Record<LifecycleEmailType, number> tip parity'si için ekli.
  const sent: Record<LifecycleEmailType, number> = {
    qr_not_downloaded: 0,
    first_feedback_tips: 0,
    upgrade_suggestion: 0,
    inactive_reactivation: 0,
    monthly_health_report: 0,
    // Wave B5 — placeholder; counter only reaches non-zero from the synchronous
    // trigger in /api/feedback POST, not from this cron. Listed for TS Record
    // exhaustiveness (CLAUDE.md §43 monthly_health_report parity).
    first_feedback_celebration: 0,
  };
  let skipped = 0;
  let failures = 0;

  for (const ctx of contexts) {
    try {
      const results = await applyLifecycleRules(ctx);
      for (const r of results) {
        if (r.sent) sent[r.type]++;
        else if (r.error) failures++;
        else skipped++;
      }
    } catch (err) {
      console.error('[lifecycle-emails cron] applyLifecycleRules failed', err);
      failures++;
    }
  }

  return {
    usersChecked: userIds.length,
    contextsProcessed: contexts.length,
    sent,
    skipped,
    failures,
    durationMs: Date.now() - start,
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runLifecycleEmails();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[lifecycle-emails cron] failed', err);
    const message = err instanceof Error ? err.message : 'cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
