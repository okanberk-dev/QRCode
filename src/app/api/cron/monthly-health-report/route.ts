// CLAUDE.md §X — Reputation OS Suite (monthly health report cron).
//
// Her ayın 1'inde 09:00 UTC çalışır (monthly-health-snapshot cron'undan
// 7 saat sonra — snapshot create + mail send aynı gün). Bağlı tüm
// restoranlar için son snapshot + baseline'ı tüketip aylık rapor mailini
// gönderir.
//
// Idempotency: `LifecycleEmailLog` (CLAUDE.md §21.34) reuse —
// `type='monthly_health_report'` + per (userId, restaurantId) per month
// dedupe. Cron retry'da aynı ay mail tekrarlanmaz.
//
// Recipients: restoran sahibi (owner) email'i. notificationEmail varsa
// onu da include (CLAUDE.md §15 + §21.6 paterni). Hiç email yoksa skip.

import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { prisma } from '@/lib/prisma';
import { getHealthSnapshotDelta } from '@/lib/reputation/snapshot';
import { getProfileRecommendations, type HealthSnapshotInput } from '@/lib/reputation/health-score';
import { alreadySent, recordSent } from '@/lib/email/lifecycle';
import { sendMonthlyHealthReportEmail } from '@/lib/email';
import * as Sentry from '@sentry/nextjs';
import { notifyOpsOfMailFailure } from '@/lib/email/ops-alert';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const BATCH_SIZE = 200;

interface MonthlyHealthReportSummary {
  restaurantsChecked: number;
  mailsSent: number;
  skipped: number;
  failures: number;
  durationMs: number;
}

export async function runMonthlyHealthReport(): Promise<MonthlyHealthReportSummary> {
  const start = Date.now();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const reportMonth = new Date();
  reportMonth.setUTCDate(1);
  reportMonth.setUTCHours(0, 0, 0, 0);

  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      googleReviewManagementEnabled: true,
      // §38.197 — Hesabı silinmek üzere planlanmış owner'a aylık health
      // raporu gönderme (30g grace lifecycle suppression paterni).
      user: { scheduledDeletionAt: null },
    },
    take: BATCH_SIZE,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      notificationEmail: true,
      user: { select: { id: true, email: true, name: true, locale: true } },
    },
  });

  let mailsSent = 0;
  let skipped = 0;
  let failures = 0;

  for (const r of restaurants) {
    const recipient = r.notificationEmail || r.user?.email || null;
    if (!recipient) {
      skipped += 1;
      continue;
    }

    try {
      // Idempotency — bu ay aynı restoran için zaten gitti mi?
      const dupCheck = await alreadySent({
        userId: r.user?.id,
        restaurantId: r.id,
        type: 'monthly_health_report',
        cooldownDays: 25, // ayın 1'i + 25 gün = bir ay önce gönderildiyse skip
      });
      if (dupCheck) {
        skipped += 1;
        continue;
      }

      // Latest + baseline + previous snapshot
      const delta = await getHealthSnapshotDelta(r.id);
      // Metric'ler: son monthly snapshot row'undan
      const latestRow = await prisma.restaurantHealthSnapshot.findFirst({
        where: { restaurantId: r.id, kind: 'monthly' },
        orderBy: { capturedAt: 'desc' },
        select: {
          googleRating: true,
          googleReviewCount: true,
          googleMediaCount: true,
          googleUnansweredQs: true,
          profileComplete: true,
          feedbackTotal: true,
          feedbackAvgRating: true,
          feedbackLowRated: true,
          feedbackReplied: true,
        },
      });
      const prevRow = await prisma.restaurantHealthSnapshot.findFirst({
        where: { restaurantId: r.id, kind: 'monthly' },
        orderBy: { capturedAt: 'desc' },
        skip: 1,
        select: {
          googleReviewCount: true,
          feedbackTotal: true,
          feedbackAvgRating: true,
        },
      });

      const metrics = {
        googleRating: latestRow?.googleRating ?? null,
        googleReviewCount: latestRow?.googleReviewCount ?? null,
        googleMediaCount: latestRow?.googleMediaCount ?? null,
        googleUnansweredQs: latestRow?.googleUnansweredQs ?? null,
        feedbackTotal: latestRow?.feedbackTotal ?? null,
        feedbackAvgRating: latestRow?.feedbackAvgRating ?? null,
        feedbackReplied: latestRow?.feedbackReplied ?? null,
        feedbackLowRated: latestRow?.feedbackLowRated ?? null,
      };

      const deltaMetrics = {
        googleReviewCount:
          latestRow?.googleReviewCount != null && prevRow?.googleReviewCount != null
            ? latestRow.googleReviewCount - prevRow.googleReviewCount
            : null,
        feedbackTotal:
          latestRow?.feedbackTotal != null && prevRow?.feedbackTotal != null
            ? latestRow.feedbackTotal - prevRow.feedbackTotal
            : null,
        feedbackAvgRating:
          latestRow?.feedbackAvgRating != null && prevRow?.feedbackAvgRating != null
            ? +(latestRow.feedbackAvgRating - prevRow.feedbackAvgRating).toFixed(2)
            : null,
      };

      const snapshotInput: HealthSnapshotInput = {
        googleRating: metrics.googleRating,
        googleReviewCount: metrics.googleReviewCount,
        googleMediaCount: metrics.googleMediaCount,
        googleUnansweredQs: metrics.googleUnansweredQs,
        profileComplete: latestRow?.profileComplete ?? null,
        feedbackTotal: metrics.feedbackTotal,
        feedbackAvgRating: metrics.feedbackAvgRating,
        feedbackLowRated: metrics.feedbackLowRated,
        feedbackReplied: metrics.feedbackReplied,
      };
      const ownerLocale = (r.user?.locale === 'en' ? 'en' : 'tr') as 'tr' | 'en';
      const recs = getProfileRecommendations(snapshotInput, ownerLocale);

      const ok = await sendMonthlyHealthReportEmail({
        to: recipient,
        locale: ownerLocale,
        ownerName: r.user?.name ?? null,
        restaurantName: r.name,
        reportMonth,
        baseline: delta.baseline,
        latest: delta.latest,
        previous: delta.previous,
        metrics,
        delta: deltaMetrics,
        recommendations: recs.slice(0, 5).map((rec) => ({
          severity: rec.severity,
          title: rec.title,
          body: rec.body,
        })),
        appUrl,
      });

      if (ok) {
        await recordSent({
          userId: r.user?.id,
          restaurantId: r.id,
          type: 'monthly_health_report',
          metadata: { reportMonth: reportMonth.toISOString() },
        });
        mailsSent += 1;
      } else {
        failures += 1;
        await notifyOpsOfMailFailure({
          template: 'monthly_health_report',
          recipient,
          reason: 'sender_returned_false',
          metadata: { restaurantId: r.id, restaurantName: r.name },
        });
      }
    } catch (err) {
      failures += 1;
      Sentry.captureException(err, {
        tags: { module: 'monthly-health-report-cron' },
        extra: { restaurantId: r.id },
      });
    }
  }

  return {
    restaurantsChecked: restaurants.length,
    mailsSent,
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
    const summary = await runMonthlyHealthReport();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[monthly-health-report] cron failed', err);
    const message = err instanceof Error ? err.message : 'cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/monthly-health-report', handleCron);
