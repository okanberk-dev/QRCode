// CLAUDE.md §X — Reputation OS Suite (health endpoint).
//
// Owner UI'na baseline + latest + previous snapshot + delta + recommendations
// döner. Read-only, panel-scoped, 5dk fresh cache.

import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import { loadReplyCoverage } from '@/lib/reputation/reply-stats';
import { getHealthSnapshotDelta } from '@/lib/reputation/snapshot';
import {
  computeHealthScore,
  getProfileRecommendations,
  scoreLabel,
  type HealthSnapshotInput,
} from '@/lib/reputation/health-score';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();
  const { id } = await params;
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();

  // Defensive: yeni tablo migrate olmadıysa graceful degrade
  try {
    // CLAUDE.md §40.1 — connection_limit=1 altında paralel read'leri
    // `prisma.$transaction([...])` tek connection üstünde sıralar.
    // `getHealthSnapshotDelta` regular Promise döndüğü için `$transaction`'a
    // konamaz (mixed promise) — sequential çalıştırılır; içerde kendi
    // `$transaction`'ı var, böylece 2 connection cycle total.
    const delta = await getHealthSnapshotDelta(id);
    const [latestRow, restaurant] = await prisma.$transaction([
      prisma.restaurantHealthSnapshot.findFirst({
        where: { restaurantId: id },
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
          healthScore: true,
          capturedAt: true,
        },
      }),
      prisma.restaurant.findUnique({
        where: { id },
        select: { user: { select: { locale: true } } },
      }),
    ]);

    const locale = restaurant?.user?.locale === 'en' ? 'en' : 'tr';

    // Eğer hiç snapshot yoksa son fallback: feedback aggregate'i live çek
    // ki UI "veri yok" yerine bir ön değer gösterebilsin.
    let snapshotInput: HealthSnapshotInput | null = null;
    if (latestRow) {
      snapshotInput = {
        googleRating: latestRow.googleRating,
        googleReviewCount: latestRow.googleReviewCount,
        googleMediaCount: latestRow.googleMediaCount,
        googleUnansweredQs: latestRow.googleUnansweredQs,
        profileComplete: latestRow.profileComplete,
        feedbackTotal: latestRow.feedbackTotal,
        feedbackAvgRating: latestRow.feedbackAvgRating,
        feedbackLowRated: latestRow.feedbackLowRated,
        feedbackReplied: latestRow.feedbackReplied,
      };
    } else {
      // Snapshot yok — sadece feedback aggregate'i çek (Google yok)
      const total = await prisma.feedback.count({ where: { restaurantId: id } });
      if (total > 0) {
        const [avg, low, replied] = await prisma.$transaction([
          prisma.feedback.aggregate({ where: { restaurantId: id }, _avg: { rating: true } }),
          prisma.feedback.count({ where: { restaurantId: id, rating: { lte: 3 } } }),
          prisma.feedback.count({ where: { restaurantId: id, replies: { some: {} } } }),
        ]);
        snapshotInput = {
          googleRating: null,
          googleReviewCount: null,
          googleMediaCount: null,
          googleUnansweredQs: null,
          profileComplete: null,
          feedbackTotal: total,
          feedbackAvgRating: avg._avg.rating ?? null,
          feedbackLowRated: low,
          feedbackReplied: replied,
        };
      }
    }

    // Live reply coverage (1–3★ feedback + Google, §58): stored snapshots
    // counted redirect events as unanswered feedback ("%3").
    if (snapshotInput) {
      snapshotInput.replyable = await loadReplyCoverage(id).catch(() => null);
    }
    const breakdown = snapshotInput ? computeHealthScore(snapshotInput) : null;
    const recommendations = snapshotInput ? getProfileRecommendations(snapshotInput, locale) : [];

    return NextResponse.json(
      {
        latestCapturedAt: latestRow?.capturedAt?.toISOString() ?? null,
        score: breakdown?.overall ?? latestRow?.healthScore ?? null,
        scoreLabel: breakdown ? scoreLabel(breakdown.overall, locale) : latestRow?.healthScore != null ? scoreLabel(latestRow.healthScore, locale) : null,
        breakdown,
        metrics: snapshotInput,
        baseline: delta.baseline
          ? {
              score: delta.baseline.score,
              capturedAt: delta.baseline.capturedAt.toISOString(),
            }
          : null,
        previousMonthly: delta.previous
          ? {
              score: delta.previous.score,
              capturedAt: delta.previous.capturedAt.toISOString(),
            }
          : null,
        recommendations,
      },
      {
        headers: {
          // Owner panel polling daha sık olur ama health daily-changing veri,
          // 5dk freshness konservatif. CLAUDE.md §40.6 private+s-maxage.
          'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=900',
        },
      },
    );
  } catch (err) {
    // Tablo henüz migrate olmadıysa (preview deploy) → graceful empty payload
    console.warn('[reputation health] degraded', err);
    return NextResponse.json({
      latestCapturedAt: null,
      score: null,
      scoreLabel: null,
      breakdown: null,
      metrics: null,
      baseline: null,
      previousMonthly: null,
      recommendations: [],
      degraded: true,
    });
  }
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
