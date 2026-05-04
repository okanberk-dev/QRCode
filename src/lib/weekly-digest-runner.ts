// Weekly digest runner — shared helper used by:
//   - /api/cron/weekly-digest (real send, Pazartesi 09:00 UTC)
//   - /api/cron/weekly-digest-summary (dryRun, Pazartesi 10:00 UTC ops mail)
//
// Lifecycle email pattern'iyle aynı disiplin (CLAUDE.md §21.13 self-fetch
// antipattern bypass): cron logic'i lib'a taşınır, route handler sadece
// auth + JSON wrap eder. Next.js `route.ts` non-HTTP export'ları hata
// veriyor, helper'lar `src/lib/`'a aittir.

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendWeeklyDigest } from '@/lib/email';
import { getNotificationPrefsForUser } from '@/lib/notification-preferences';
import { extractWeeklyInsight, type WeeklyInsight } from '@/lib/weekly-insight';
import { deriveCustomerFields, type CustomerSegment } from '@/lib/customers';

export interface WeeklyDigestRecipient {
  restaurantId: string;
  restaurantName: string;
  ownerEmail: string;
  recipientEmail: string;
  total: number;
  avgRating: number;
  highRatings: number;
  lowRatings: number;
  hasAi: boolean;
  emailSent: boolean;
}

export interface WeeklyDigestRunResult {
  totalRestaurants: number;
  sent: number;
  skipped: number;
  optedOut: number;
  failed: number;
  recipients: WeeklyDigestRecipient[];
  durationMs: number;
}

/**
 * @param dryRun true → mail GÖNDERMEZ, sadece "kim alacaktı" listesini
 *   döndürür. Ops summary cron'u 10:00 UTC'de bunu kullanır.
 */
export async function runWeeklyDigest(options?: { dryRun?: boolean }): Promise<WeeklyDigestRunResult> {
  const startedAt = Date.now();
  const dryRun = options?.dryRun ?? false;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      notificationEmail: true,
      googlePlaceId: true,
      aiAnalyticsEnabled: true,
      userId: true,
      user: { select: { email: true, locale: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  let optedOut = 0;
  let failed = 0;
  const recipients: WeeklyDigestRecipient[] = [];

  // Stable ISO-week key — aynı restoran için bu hafta cron tekrar çağrıldığında
  // OpenAI cache hit olur (CLAUDE.md §15 cache pattern).
  const isoWeekKey = (() => {
    const d = new Date();
    const year = d.getUTCFullYear();
    const onejan = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getUTCDay() + 1) / 7);
    return `${year}-W${week}`;
  })();

  for (const rest of restaurants) {
    const email = rest.notificationEmail || rest.user?.email;
    if (!email) {
      skipped++;
      continue;
    }

    const prefs = await getNotificationPrefsForUser(rest.userId);
    if (!prefs.weeklyReport) {
      optedOut++;
      continue;
    }

    const where = {
      restaurantId: rest.id,
      createdAt: { gte: sevenDaysAgo },
    };

    const [total, avgAgg, distribution, highRatings, aspectAggs, commentRows, segmentRows] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.aggregate({ _avg: { rating: true }, where }),
      prisma.feedback.groupBy({
        by: ['rating'],
        where,
        _count: true,
        orderBy: { rating: 'desc' },
      }),
      prisma.feedback.count({ where: { ...where, rating: { gte: 4 } } }),
      prisma.feedback.aggregate({
        _avg: { foodRating: true, serviceRating: true, atmosphereRating: true },
        where,
      }),
      prisma.feedback.findMany({
        where: { ...where, comment: { not: null } },
        select: { rating: true, comment: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      // Phase 8c+ (CLAUDE.md §38.21) — bu hafta yorum bırakan müşterilerin
      // segment dağılımı. contact_key bazlı aggregate (visits + avgRating)
      // → deriveCustomerFields ile segment derive. KVKK consent + non-anonim
      // filter (owner /api/customers paterni). max 500 contact_key cap (haftalık
      // hacim için fazlasıyla yeterli).
      prisma.$queryRaw<Array<{
        contact_key: string;
        visits: bigint;
        avg_rating: number | null;
        last_at: Date;
      }>>(Prisma.sql`
        SELECT
          COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) AS contact_key,
          COUNT(*)::bigint AS visits,
          AVG(f.rating)::float AS avg_rating,
          MAX(f.created_at) AS last_at
        FROM feedback f
        WHERE f.has_kvkk_consent = TRUE
          AND f.restaurant_id = ${rest.id}
          AND f.created_at >= ${sevenDaysAgo}
          AND COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) IS NOT NULL
        GROUP BY contact_key
        LIMIT 500
      `),
    ]);

    if (total === 0) {
      skipped++;
      continue;
    }

    const avgRating = avgAgg._avg.rating ? parseFloat(avgAgg._avg.rating.toFixed(1)) : 0;
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distribution.forEach((row) => {
      dist[row.rating] = row._count;
    });
    const lowRatings = (dist[1] || 0) + (dist[2] || 0) + (dist[3] || 0);
    const sentToGoogle = rest.googlePlaceId ? highRatings : 0;
    const conversionRate = highRatings > 0
      ? parseFloat(((sentToGoogle / highRatings) * 100).toFixed(0))
      : null;

    const round1 = (n: number | null | undefined) =>
      n == null ? null : parseFloat(n.toFixed(1));

    const aspects = {
      food: round1(aspectAggs._avg.foodRating),
      service: round1(aspectAggs._avg.serviceRating),
      atmosphere: round1(aspectAggs._avg.atmosphereRating),
    };

    const locale = rest.user?.locale === 'en' ? 'en' : 'tr';

    // Pulse AI çıkarımı — fail-safe (key yok / parse fail → empty + section gizli).
    const safeComments = (commentRows as Array<{ rating: number; comment: string | null }>).map((r) => ({
      rating: r.rating,
      comment: (r.comment || '').trim(),
    })).filter((r) => r.comment.length > 0);
    const aiInsight: WeeklyInsight = rest.aiAnalyticsEnabled
      ? await extractWeeklyInsight(
          {
            restaurantName: rest.name,
            total,
            avgRating,
            highRatings,
            lowRatings,
            distribution: dist,
            aspects,
            comments: safeComments,
          },
          locale,
          `${rest.id}:${isoWeekKey}`,
          rest.userId ?? undefined,
        )
      : { summary: '', recommendation: '', source: 'fallback' };
    const hasAi = !!(aiInsight.summary || aiInsight.recommendation);

    // Phase 8c+ — segment dağılımı (deriveCustomerFields). Tüm değerler 0
    // ise mailde section gizlenir (template fail-safe).
    const segmentCounts: Record<CustomerSegment, number> = { vip: 0, loyal: 0, new: 0, risk: 0 };
    for (const row of segmentRows) {
      const visits = Number(row.visits);
      const derived = deriveCustomerFields({
        visits,
        avgRating: row.avg_rating,
        lastAt: row.last_at,
      });
      segmentCounts[derived.segment] += 1;
    }

    let emailSent = false;
    if (!dryRun) {
      try {
        const ok = await sendWeeklyDigest({
          to: email,
          locale,
          restaurantName: rest.name,
          period: {
            from: sevenDaysAgo,
            to: new Date(),
          },
          stats: {
            total,
            avgRating,
            highRatings,
            lowRatings,
            distribution: dist,
            conversionRate,
            aspects,
          },
          aiInsight,
          segmentCounts,
        });
        emailSent = ok;
        if (ok) sent++;
        else failed++;
      } catch (err) {
        console.error('[WEEKLY_DIGEST] send failed for', rest.id, (err as Error).message);
        failed++;
      }
    } else {
      sent++;
      emailSent = false;
    }

    recipients.push({
      restaurantId: rest.id,
      restaurantName: rest.name,
      ownerEmail: rest.user?.email ?? '',
      recipientEmail: email,
      total,
      avgRating,
      highRatings,
      lowRatings,
      hasAi,
      emailSent,
    });
  }

  return {
    totalRestaurants: restaurants.length,
    sent,
    skipped,
    optedOut,
    failed,
    recipients,
    durationMs: Date.now() - startedAt,
  };
}
