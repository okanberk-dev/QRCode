import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { SYSTEM_FEEDBACK } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const daysParam = req.nextUrl.searchParams.get('days');
    const restaurantIdParam = req.nextUrl.searchParams.get('restaurantId');
    const branchParam = req.nextUrl.searchParams.get('branch');
    const platformParam = req.nextUrl.searchParams.get('platform');
    const today = new Date();

    // Build base date filter (supports: today/1, month, numeric days, all).
    // UTC-based to match the /feedback route and stay consistent regardless of
    // server timezone.
    const dateFilter: Prisma.FeedbackWhereInput = {};
    if (daysParam === '1' || daysParam === 'today') {
      const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
      dateFilter.createdAt = { gte: startOfToday };
    } else if (daysParam === 'month') {
      const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 0, 0, 0, 0));
      dateFilter.createdAt = { gte: firstOfMonth };
    } else if (daysParam && daysParam !== 'all') {
      const days = parseInt(daysParam);
      if (Number.isFinite(days) && days > 0) {
        const pastDate = new Date();
        pastDate.setUTCDate(pastDate.getUTCDate() - days);
        dateFilter.createdAt = { gte: pastDate };
      }
    }

    // Branch filter
    if (branchParam && branchParam !== 'all') {
      dateFilter.branch = branchParam;
    }

    // Platform filter — tek WHERE eklemesi tüm aggregation'ları otomatik
    // filtreler (count, groupBy, today, distribution). UI'da chip toggle.
    if (platformParam && platformParam !== 'all') {
      dateFilter.platform = platformParam;
    }

    // ─── IDOR Security Override ───
    if (actor.role === 'superadmin') {
      // superadmin — optionally filter to a specific restaurant
      if (restaurantIdParam && restaurantIdParam !== 'all') {
        dateFilter.restaurantId = restaurantIdParam;
      }
    } else if (actor.role === 'manager') {
      dateFilter.restaurantId = actor.restaurantId;
    // `team_member` (davet edilen ekip üyesi) owner ile aynı dalda scope'lanır:
    // getScopedRestaurantIds -> getTeamMemberScope zaten SADECE TeamMember.locations
    // listesini döner (owner pasifse boş). Scope genişlemesi yok; eksik olan sadece
    // bu dalın team_member'ı kapsamamasıydı -> davetli kullanici gelen kutusunda 403
    // aliyordu (/api/feedback/counts zaten generic helper'i kullaniyordu -> sayaclar
    // dolu, liste bos = kirik cekirdek akis).
    } else if (actor.role === 'restaurant_owner' || actor.role === 'team_member') {
      const userRestIds = await getScopedRestaurantIds(actor) || [];

      if (restaurantIdParam && restaurantIdParam !== 'all') {
        if (!userRestIds.includes(restaurantIdParam)) {
          return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
        }
        dateFilter.restaurantId = restaurantIdParam;
      } else {
        dateFilter.restaurantId = { in: userRestIds };
      }
    } else {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    // Today filter (UTC — matches /feedback?days=today behaviour).
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // Basic stats — Stage 108 §38.188: 6 sequential count() → single
    // $transaction batch. Supabase pooler `connection_limit=1` (CLAUDE.md
    // §40.1) tek connection üstünde batch'i sıralı çalıştırır ama 6 ayrı
    // round-trip yerine 1 protocol round-trip → ~80-150ms latency tasarrufu
    // owner KPI cold load'da. dateFilter immutable, scope intact.
    const [totalCount, todayCount, lowRatingCount, googleRedirectsCount, highRatingCount, sentToGoogleCount] =
      await prisma.$transaction([
        prisma.feedback.count({ where: dateFilter }),
        prisma.feedback.count({ where: { ...dateFilter, createdAt: { gte: startOfToday } } }),
        prisma.feedback.count({ where: { ...dateFilter, rating: { lte: 3 } } }),
        // 4-5★ ratings + special "google redirect" comment marker
        prisma.feedback.count({
          where: { ...dateFilter, rating: { gte: 4 }, comment: SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT },
        }),
        // ─── Google Review Conversion ───
        // A 4-5★ rating is a "conversion opportunity". Counted as actually
        // sent to Google only if the parent Restaurant has a googlePlaceId set
        // (otherwise /r/[slug] shows a thank-you page and no redirect happens).
        prisma.feedback.count({
          where: { ...dateFilter, rating: { gte: 4 } },
        }),
        prisma.feedback.count({
          where: {
            ...dateFilter,
            rating: { gte: 4 },
            restaurant: { googlePlaceId: { not: null } },
          },
        }),
      ]);
    const missedHighRatings = highRatingCount - sentToGoogleCount;
    const conversionRate = highRatingCount > 0
      ? parseFloat(((sentToGoogleCount / highRatingCount) * 100).toFixed(1))
      : null;

    // Per-restaurant breakdown — only useful when the caller is looking at
    // more than one restaurant. We still compute it always (≤ 3 quick
    // queries) so the frontend can decide whether to show the leaderboard.
    const isSingleRestaurant = typeof dateFilter.restaurantId === 'string';
    let byRestaurant: Array<{
      id: string;
      name: string;
      hasGoogleLink: boolean;
      highRatings: number;
      sentToGoogle: number;
      conversionRate: number | null;
    }> = [];

    if (!isSingleRestaurant) {
      // Build the groupBy where clause carefully: the dateFilter may already
      // contain a restaurantId scope (e.g. { in: [...] } for restaurant_owner).
      // We must NOT overwrite it with { not: null }.
      const groupByWhere: Prisma.FeedbackWhereInput = { ...dateFilter, rating: { gte: 4 } };
      if (!groupByWhere.restaurantId) {
        groupByWhere.restaurantId = { not: null };
      }
      const highByRest = await prisma.feedback.groupBy({
        by: ['restaurantId'],
        where: groupByWhere,
        _count: true,
      });

      if (highByRest.length > 0) {
        const rawIds = highByRest
          .map((r) => r.restaurantId as string | null)
          .filter((id): id is string => !!id);
        const restaurantIds = Array.from(new Set(rawIds));

        const restaurants = await prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true, googlePlaceId: true },
        });

        const restMap = new Map(restaurants.map((r) => [r.id, r]));

        byRestaurant = highByRest
          .map((row) => {
            if (!row.restaurantId) return null;
            const rest = restMap.get(row.restaurantId);
            if (!rest) return null;
            const hasGoogleLink = !!rest.googlePlaceId;
            const sent = hasGoogleLink ? row._count : 0;
            const rate = row._count > 0
              ? parseFloat(((sent / row._count) * 100).toFixed(1))
              : null;
            return {
              id: rest.id,
              name: rest.name,
              hasGoogleLink,
              highRatings: row._count,
              sentToGoogle: sent,
              conversionRate: rate,
            };
          })
          .filter(Boolean) as typeof byRestaurant;

        // Sort: biggest opportunity first (highest highRatings, lowest rate)
        byRestaurant.sort((a, b) => b.highRatings - a.highRatings);
      }
    }

    const googleConversion = {
      totalResponses: totalCount,
      highRatings: highRatingCount,
      sentToGoogle: sentToGoogleCount,
      missedOpportunities: missedHighRatings,
      conversionRate,
      byRestaurant,
    };

    const aggregations = await prisma.feedback.aggregate({
      _avg: { rating: true },
      where: dateFilter
    });
    // Returned as a real number so UI callers can safely invoke
    // .toFixed() on the value. Previously this was a string ("4.5") which
    // blew up admin/analytics as `D.toFixed is not a function` once the
    // page tried `stats.avgRating.toFixed(1)`.
    const avgRating = aggregations._avg.rating
      ? parseFloat(aggregations._avg.rating.toFixed(1))
      : 0;

    // Aspect breakdown: Food / Service / Atmosphere averages + sample size.
    // Feedback rows where the respective aspect is null are automatically
    // excluded from the average and counted separately.
    const aspectAggs = await prisma.feedback.aggregate({
      _avg: {
        foodRating: true,
        serviceRating: true,
        atmosphereRating: true,
      },
      _count: {
        foodRating: true,
        serviceRating: true,
        atmosphereRating: true,
      },
      where: dateFilter,
    });

    const round1 = (n: number | null | undefined) =>
      n === null || n === undefined ? null : parseFloat(n.toFixed(1));

    const aspects = {
      food: {
        avg: round1(aspectAggs._avg.foodRating),
        count: aspectAggs._count.foodRating ?? 0,
      },
      service: {
        avg: round1(aspectAggs._avg.serviceRating),
        count: aspectAggs._count.serviceRating ?? 0,
      },
      atmosphere: {
        avg: round1(aspectAggs._avg.atmosphereRating),
        count: aspectAggs._count.atmosphereRating ?? 0,
      },
    };

    // Distribution
    const distributionRaw = await prisma.feedback.groupBy({
      by: ['rating'],
      where: dateFilter,
      _count: true,
      orderBy: { rating: 'desc' }
    });
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distributionRaw.forEach((item) => {
      distribution[item.rating] = item._count;
    });

    // Weekly trend (last 7 days) — scan counts + avg rating per day.
    // The previous implementation awaited each day sequentially (7 round-trips
    // with 2 queries each = 14 total, serially blocked). Now we build the 7
    // ranges up-front and fire all 14 queries in a single Promise.all so the
    // total wall-time is one round-trip regardless of day count.
    const dayBuckets = Array.from({ length: 7 }, (_, idx) => {
      const offset = 6 - idx;
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      return { d, start, end };
    });

    const trendResults = await Promise.all(
      dayBuckets.map(({ start, end }) => {
        const trendFilter: Prisma.FeedbackWhereInput = {
          ...dateFilter,
          createdAt: { gte: start, lt: end },
        };
        return Promise.all([
          prisma.feedback.count({ where: trendFilter }),
          prisma.feedback.aggregate({ _avg: { rating: true }, where: trendFilter }),
        ]);
      })
    );

    const trends = dayBuckets.map(({ d }, idx) => {
      const [count, aggregations] = trendResults[idx];
      return {
        date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        count,
        avgRating: parseFloat(aggregations._avg.rating?.toFixed(1) || '0'),
      };
    });

    // Day of week distribution (Pzt, Sal, ...) - Limit to last 2000 for performance
    const dayDistributionRaw = await prisma.feedback.findMany({
      where: dateFilter,
      select: { createdAt: true },
      take: 2000,
      orderBy: { createdAt: 'desc' }
    });

    // Day.getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    const daysMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    dayDistributionRaw.forEach((f) => {
      const day = f.createdAt.getDay();
      daysMap[day] = (daysMap[day] || 0) + 1;
    });

    // Display Mon..Sun in Turkish week order.
    const weekOrder = [1, 2, 3, 4, 5, 6, 0];
    const weekLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const dayDistribution = weekOrder.map((d, i) => ({
      name: weekLabels[i],
      count: daysMap[d],
    }));

    // Word Cloud - Sample last 1000 comments for performance
    const allComments = await prisma.feedback.findMany({
      where: { ...dateFilter, comment: { not: '' } },
      select: { comment: true },
      take: 1000,
      orderBy: { createdAt: 'desc' }
    });

    const stopWords = new Set([
      'bir', 've', 'iyi', 'çok', 'için', 'bu', 'da', 'de', 'ile', 'ama', 'fakat',
      'daha', 'güzel', 'teşekkürler', 'teşekkür', 'harika', 'gerçekten', 'kadar',
      'gibi', 'en', 'ise', 'olarak', 'var', 'yok', 'mı', 'mi', 'mu', 'mü',
      'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'bana', 'bizi', 'her', 'hiç',
      ...SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT.toLowerCase().split(' ')
    ]);

    const wordCounts: Record<string, number> = {};
    allComments.forEach((fb) => {
      if (!fb.comment) return;
      const cleanString = fb.comment.toLowerCase().replace(/[^a-zçğıöşü\s]/g, ' ');
      const words = cleanString.split(/\s+/);
      words.forEach((word: string) => {
        if (word.length > 2 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    const wordCloud = Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30);

    // Platform distribution (with avg rating per platform)
    const platformGroupRaw = await prisma.feedback.groupBy({
      by: ['platform'],
      where: dateFilter,
      _count: true,
      _avg: { rating: true },
    });

    const platformLabels: Record<string, string> = {
      google: 'Google',
      yemeksepeti: 'Yemeksepeti',
      getir: 'Getir',
      trendyol_go: 'Trendyol GO',
    };

    const platformDistribution = platformGroupRaw.map((row) => ({
      platform: row.platform || 'unspecified',
      label: row.platform ? (platformLabels[row.platform] || row.platform) : 'Genel',
      count: row._count,
      avgRating: round1(row._avg?.rating),
    }));



    // §38.53 — KPI strip metric'leri (Yorumlar sayfası 4-card).
    // Tasarım PageFeedbacks: Bu hafta (count + delta) / Ort puan (delta) /
    // Yanıt süresi (avg latency saat) / Yanıt oranı (replied/total %).
    // Workspace owner-scoped (mevcut dateFilter restaurant scope intact).
    const oneWeekAgo = new Date();
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);

    // 4 yeni aggregate query — connection_limit=1 disipline (CLAUDE.md §14.1)
    // Promise.all paralel scope'lu. Mevcut dateFilter intact (range filter)
    // ile kombine edilmez — Bu hafta + Ort puan delta sabit 7d/14d window.
    const baseScope: Prisma.FeedbackWhereInput = {};
    if ('restaurantId' in dateFilter) {
      baseScope.restaurantId = dateFilter.restaurantId as typeof baseScope.restaurantId;
    }
    if ('branch' in dateFilter) {
      baseScope.branch = dateFilter.branch as typeof baseScope.branch;
    }
    if ('platform' in dateFilter) {
      baseScope.platform = dateFilter.platform as typeof baseScope.platform;
    }

    const [thisWeekCount, prevWeekCount, prevWeekAvg, repliedCount, replyTimeRows] =
      await prisma.$transaction([
        prisma.feedback.count({
          where: { ...baseScope, createdAt: { gte: oneWeekAgo } },
        }),
        prisma.feedback.count({
          where: { ...baseScope, createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
        }),
        prisma.feedback.aggregate({
          _avg: { rating: true },
          where: { ...baseScope, createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
        }),
        prisma.feedback.count({
          where: { ...dateFilter, replies: { some: {} } },
        }),
        // Reply latency: feedback + first reply createdAt — JS-side avg compute.
        // Last 90 days cap (HARD_LIMIT 1000) — workspace KPI tek-snapshot,
        // tüm zamanları bekleyen owner için anlamsız.
        prisma.feedback.findMany({
          where: {
            ...dateFilter,
            replies: { some: {} },
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          select: {
            createdAt: true,
            replies: {
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { createdAt: true },
            },
          },
          take: 1000,
        }),
      ]);

    // Avg response time (ms) — JS-side aggregate.
    let totalResponseMs = 0;
    let responseSampleSize = 0;
    for (const f of replyTimeRows) {
      const reply = f.replies[0];
      if (!reply) continue;
      const diff = reply.createdAt.getTime() - f.createdAt.getTime();
      if (diff > 0) {
        totalResponseMs += diff;
        responseSampleSize += 1;
      }
    }
    const avgResponseTimeMs =
      responseSampleSize > 0 ? totalResponseMs / responseSampleSize : null;

    // Reply rate (%) — replied / total × 100. Range filter'a göre dateFilter scope.
    const replyRatePct = totalCount > 0 ? Math.round((repliedCount / totalCount) * 100) : 0;

    // This week delta — count vs prev week
    const thisWeekDelta =
      prevWeekCount > 0
        ? Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100)
        : thisWeekCount > 0
          ? 100
          : 0;

    // Avg rating delta — bu hafta vs prev week (stat'ın range filter'ından bağımsız sabit).
    const prevWeekAvgRating = prevWeekAvg._avg.rating
      ? parseFloat(prevWeekAvg._avg.rating.toFixed(2))
      : 0;
    const avgRatingDelta = prevWeekAvgRating > 0 ? avgRating - prevWeekAvgRating : null;

    return NextResponse.json(
      {
        totalCount,
        todayCount,
        avgRating,
        lowRatingCount,
        googleRedirectsCount,
        distribution,
        trends, // Detailed trend (count + rating)
        dayDistribution, // Distribution by day of week
        wordCloud,
        aspects, // Food / Service / Atmosphere breakdown
        googleConversion, // Google review conversion funnel + per-restaurant breakdown
        platformDistribution, // Platform-based review counts
        // §38.53 — KPI strip metric'leri
        kpiStrip: {
          thisWeekCount,
          thisWeekDelta, // % change vs prev week
          avgRatingDelta, // float diff vs prev week (null = no prev data)
          avgResponseTimeMs, // null = no replies in 90d
          replyRatePct, // 0-100
          repliedCount, // for "X / Y replied" subtitle
        },
      },
      {
        headers: {
          // Edge cache (CLAUDE.md §38.100 Stage 24). KPI strip aggregate
          // payload; 30s fresh + 2min SWR dashboard refresh hit ratio'sunu
          // ~%60-70'e çıkarır. `private` directive cookie-isolated cache.
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'İstatistikler çekilemedi' }, { status: 500 });
  }
}
