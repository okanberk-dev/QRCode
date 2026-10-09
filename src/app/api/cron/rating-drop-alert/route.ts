// Wave C2 (CLAUDE.md §38.194) — weekly rating drop early warning.
// Weekly Monday 11:00 UTC. Eligibility: last 7 days avg vs prior 28-day
// baseline delta ≤ -0.5 AND last 7 days review count ≥ 5 (statistical
// floor — a single bad review on a low-volume restaurant shouldn't fire
// an alert). LifecycleEmailLog cooldown 7 days per restaurant.

import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { sendRatingDropAlertEmail } from '@/lib/email';
import { alreadySent, recordSent } from '@/lib/email/lifecycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;
const MIN_REVIEWS_LAST_WEEK = 5;
const DELTA_THRESHOLD = -0.5;

interface Summary {
  candidates: number;
  triggered: number;
  sent: number;
  skipped: number;
  failures: number;
  durationMs: number;
}

export async function runRatingDropAlert(): Promise<Summary> {
  const start = Date.now();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const twentyEightDaysAgo = new Date(now.getTime() - 4 * SEVEN_DAYS_MS);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';

  // Restaurants with ≥ MIN_REVIEWS_LAST_WEEK reviews in the last 7 days
  // (statistical floor). Then compute baseline + delta per row.
  //
  // §38.197 — Hesabı silinmek üzere planlanmış owner'a rating drop
  // uyarısı gönderme (30g grace lifecycle suppression paterni).
  const candidates = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      user: { scheduledDeletionAt: null },
      feedbacks: { some: { createdAt: { gte: sevenDaysAgo } } },
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      notificationEmail: true,
      user: { select: { email: true, name: true, locale: true } },
    },
  });

  let triggered = 0;
  let sent = 0;
  let skipped = 0;
  let failures = 0;

  for (const r of candidates) {
    try {
      const recipient = r.notificationEmail || r.user?.email;
      if (!recipient) {
        skipped += 1;
        continue;
      }

      // Two aggregates — last 7 days + the 21 days BEFORE that (28d baseline
      // window excluding the recent week so the delta isn't self-dampened).
      const [currentAgg, baselineAgg] = await prisma.$transaction([
        prisma.feedback.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
          where: { restaurantId: r.id, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.feedback.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
          where: { restaurantId: r.id, createdAt: { gte: twentyEightDaysAgo, lt: sevenDaysAgo } },
        }),
      ]);

      const currentCount = currentAgg._count._all;
      const baselineCount = baselineAgg._count._all;

      if (currentCount < MIN_REVIEWS_LAST_WEEK) {
        skipped += 1;
        continue;
      }
      if (baselineCount < MIN_REVIEWS_LAST_WEEK) {
        // No reliable baseline (cold start or quiet weeks) — don't fire.
        skipped += 1;
        continue;
      }
      const currentAvg = currentAgg._avg.rating ?? 0;
      const baselineAvg = baselineAgg._avg.rating ?? 0;
      const delta = currentAvg - baselineAvg;
      if (delta > DELTA_THRESHOLD) {
        skipped += 1;
        continue;
      }
      triggered += 1;

      const already = await alreadySent({
        restaurantId: r.id,
        type: 'rating_drop_alert',
        cooldownDays: 7,
      });
      if (already) {
        skipped += 1;
        continue;
      }

      const userLocale: 'tr' | 'en' = r.user?.locale === 'en' ? 'en' : 'tr';
      const ok = await sendRatingDropAlertEmail({
        to: recipient,
        firstName: r.user?.name ?? null,
        restaurantName: r.name,
        currentAvg: Math.round(currentAvg * 10) / 10,
        baselineAvg: Math.round(baselineAvg * 10) / 10,
        delta: Math.round(delta * 10) / 10,
        reviewCount: currentCount,
        inboxUrl: `${appUrl}/${userLocale}/dashboard/feedbacks?filter=low`,
        locale: userLocale,
      });
      if (ok) {
        await recordSent({
          restaurantId: r.id,
          type: 'rating_drop_alert',
          metadata: {
            currentAvg: Math.round(currentAvg * 10) / 10,
            baselineAvg: Math.round(baselineAvg * 10) / 10,
            delta: Math.round(delta * 10) / 10,
            currentCount,
            baselineCount,
          },
        });
        sent += 1;
      } else {
        failures += 1;
      }
      await new Promise((res) => setTimeout(res, 120));
    } catch (err) {
      failures += 1;
      console.error('[RATING_DROP_ALERT] per-restaurant failed', {
        restaurantId: r.id,
        errName: err instanceof Error ? err.name : 'unknown',
      });
      Sentry.captureException(err, {
        tags: { cron: 'rating-drop-alert' },
        extra: { restaurantId: r.id },
      });
    }
  }

  return {
    candidates: candidates.length,
    triggered,
    sent,
    skipped,
    failures,
    durationMs: Date.now() - start,
  };
}

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runRatingDropAlert();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[RATING_DROP_ALERT] cron failed', err);
    Sentry.captureException(err, { tags: { cron: 'rating-drop-alert' } });
    return NextResponse.json({ error: 'cron_failed' }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/rating-drop-alert', handleCron);
