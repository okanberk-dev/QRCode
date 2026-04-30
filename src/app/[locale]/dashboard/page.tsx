import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Building2, Inbox, QrCode, ShieldCheck, Star } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr as trLocale, enUS as enLocale } from 'date-fns/locale';
import RestaurantAnalyticsPanel from '@/components/dashboard/RestaurantAnalyticsPanel';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import OnboardingNudge, { type OnboardingStep } from '@/components/dashboard/OnboardingNudge';
import { BarChart, Eyebrow, LegendDot, PageHeader, Sparkline, StatCard } from '@/components/ui';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Dashboard — Buaze' : 'Dashboard — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;

  if (!token) {
    redirect(`/${locale}/auth/login`);
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    redirect(`/${locale}/auth/login`);
  }

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: {
      restaurants: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { feedbacks: true } },
        },
      },
    },
  });

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Calculate stats
  const totalReviews = user.restaurants.reduce((a, r) => a + r._count.feedbacks, 0);
  // Platform redirect count — feedbacks recorded with a platform target.
  // Used as the 4th KPI per design AdminDashboard pattern (`Aylık yönlendirme`).
  const redirectCount = await prisma.feedback.count({
    where: {
      restaurantId: { in: user.restaurants.map(r => r.id) },
      rating: { gte: 4 },
      platform: { not: null },
    }
  });

  const latestFeedbacks = await prisma.feedback.findMany({
    where: {
      restaurantId: { in: user.restaurants.map(r => r.id) }
    },
    orderBy: { createdAt: 'desc' },
    // 4 öğe — Pulse 2026-04 design OwnerDashboard "Son yorumlar" 1:1
    take: 4,
    include: {
      restaurant: { select: { name: true } }
    }
  });

  // 7-day feedback trend (Pulse 2026-04 design OwnerDashboard inline BarChart, 1:1)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trendFeedbacks = await prisma.feedback.findMany({
    where: {
      restaurantId: { in: user.restaurants.map((r) => r.id) },
      createdAt: { gte: sevenDaysAgo },
    },
    select: { createdAt: true },
  });

  // Mobile dashboard "BUGÜN" hero card aggregate'leri (mobile-screens-1.jsx
  // MOwnerHome line 110-138 1:1). scansToday = bugünkü feedback count
  // (gerçek QR scan tracking olmadığından proxy). 30g scan = son 30 gün
  // feedback count. redirectPct = rating>=4 + platform set olanların oranı.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgoMobile = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const restIds = user.restaurants.map((r) => r.id);
  const [scansToday, scans30d, redirected30d, total30d] = restIds.length
    ? await Promise.all([
        prisma.feedback.count({ where: { restaurantId: { in: restIds }, createdAt: { gte: todayStart } } }),
        prisma.feedback.count({ where: { restaurantId: { in: restIds }, createdAt: { gte: thirtyDaysAgoMobile } } }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: thirtyDaysAgoMobile },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
        prisma.feedback.count({ where: { restaurantId: { in: restIds }, createdAt: { gte: thirtyDaysAgoMobile } } }),
      ])
    : [0, 0, 0, 0];
  const reviewsToday = scansToday;
  const redirectPct = total30d > 0 ? Math.round((redirected30d / total30d) * 100) : 0;
  const scans30dShort = scans30d >= 1000 ? `${(scans30d / 1000).toFixed(1)}k` : String(scans30d);
  const isTrLocale = locale === 'tr';
  const dayLabelsTr = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const dayLabelsEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLabels = isTrLocale ? dayLabelsTr : dayLabelsEn;
  const trendData: { label: string; value: number }[] = [];
  // İkincil seri — günlük ortalama puan (hover tooltip'ine yazılır).
  const trendRatingsPerDay: number[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (6 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    // Mon-Sun mapping (getDay: 0=Sun, 1=Mon, ...)
    const jsDay = dayStart.getDay();
    const labelIdx = jsDay === 0 ? 6 : jsDay - 1;
    const dayFbs = trendFeedbacks.filter(
      (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
    );
    const count = dayFbs.length;
    const ratingSum = dayFbs.reduce((sum, f) => sum + (f.rating || 0), 0);
    const ratingAvg = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
    trendData.push({ label: dayLabels[labelIdx], value: count });
    trendRatingsPerDay.push(ratingAvg);
  }

  // Per-restaurant avg rating for "Konum performansı" widget
  const restaurantRatings = user.restaurants.length
    ? await prisma.feedback.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: user.restaurants.map((r) => r.id) } },
        _avg: { rating: true },
        _count: { _all: true },
      })
    : [];
  const ratingByRestaurant = new Map(
    restaurantRatings.map((r) => [r.restaurantId, { avg: r._avg.rating ?? 0, count: r._count._all }]),
  );
  const locationPerf = user.restaurants
    .map((r) => {
      const stat = ratingByRestaurant.get(r.id);
      return { id: r.id, name: r.name, avg: stat?.avg ?? 0, count: stat?.count ?? 0 };
    })
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 5);

  // Star distribution across all locations (Pulse 2026-04 design OwnerDashboard
  // "Puan dağılımı" card — large total + 5 star bars).
  const starGroups = restIds.length
    ? await prisma.feedback.groupBy({
        by: ['rating'],
        where: { restaurantId: { in: restIds } },
        _count: { _all: true },
      })
    : [];
  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of starGroups) {
    if (g.rating >= 1 && g.rating <= 5) starCounts[g.rating] = g._count._all;
  }
  const starTotal = Object.values(starCounts).reduce((a, b) => a + b, 0);
  const starRows = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: starCounts[star],
    pct: starTotal > 0 ? (starCounts[star] / starTotal) * 100 : 0,
  }));

  // QR performance — most recently generated QR codes per (restaurant, table,
  // platform). Real scan tracking yok; sparkline buckets daily feedback
  // counts in last 7 days for the QR's restaurant as a proxy.
  const qrPerfRows = restIds.length
    ? await prisma.qrGeneration.findMany({
        where: { restaurantId: { in: restIds }, type: 'feedback' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          tableNumber: true,
          platform: true,
          createdAt: true,
          restaurant: { select: { name: true, id: true } },
        },
      })
    : [];

  // Per-restaurant 7-day sparkline (one fetch keyed by restaurantId).
  const trendByRestaurant = restIds.length
    ? await prisma.feedback.findMany({
        where: { restaurantId: { in: restIds }, createdAt: { gte: sevenDaysAgo } },
        select: { restaurantId: true, createdAt: true },
      })
    : [];
  const sparklineByRestaurant = new Map<string, number[]>();
  for (const r of restIds) sparklineByRestaurant.set(r, Array(7).fill(0));
  for (const f of trendByRestaurant) {
    if (!f.restaurantId) continue;
    const dayIdx = Math.floor((Date.now() - f.createdAt.getTime()) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) {
      const arr = sparklineByRestaurant.get(f.restaurantId);
      if (arr) arr[6 - dayIdx] = (arr[6 - dayIdx] || 0) + 1;
    }
  }

  const seenKeys = new Set<string>();
  const qrPerfTop: Array<{
    id: string;
    name: string;
    platform: string | null;
    sparkline: number[];
    restaurantId: string;
  }> = [];
  for (const q of qrPerfRows) {
    const key = `${q.restaurant.id}::${q.tableNumber || ''}::${q.platform || ''}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const restName = q.restaurant.name;
    const label = q.tableNumber
      ? `${restName} · ${isTrLocale ? 'Masa' : 'Table'} ${q.tableNumber}`
      : q.platform
        ? `${restName} · ${q.platform}`
        : restName;
    qrPerfTop.push({
      id: q.id,
      name: label,
      platform: q.platform,
      sparkline: sparklineByRestaurant.get(q.restaurant.id) || Array(7).fill(0),
      restaurantId: q.restaurant.id,
    });
    if (qrPerfTop.length >= 5) break;
  }

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTr = locale === 'tr';

  // Weighted average rating across the operator's locations
  const totalRatedCount = restaurantRatings.reduce((a, r) => a + r._count._all, 0);
  const avgRating = totalRatedCount === 0
    ? 0
    : restaurantRatings.reduce((a, r) => a + (r._avg.rating ?? 0) * r._count._all, 0) / totalRatedCount;

  // Onboarding nudge — derive setup completeness from existing data signals.
  // Backend shape unchanged; we just project booleans the UI can read.
  const hasRestaurant = user.restaurants.length > 0;
  const hasActiveRestaurant = user.restaurants.some((r) => r.isActive);
  const hasReviews = totalReviews > 0;
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      label: isTr ? 'İşletme profilini tamamla' : 'Complete business profile',
      done: !!user.name && hasRestaurant,
      href: `/${locale}/dashboard/account?section=profile`,
    },
    {
      id: 2,
      label: isTr ? 'İlk işletmeyi ekle' : 'Add first business',
      done: hasRestaurant,
      href: `/${locale}/dashboard/restaurants`,
    },
    {
      id: 3,
      label: isTr ? 'İlk QR kodunu oluştur' : 'Generate first QR code',
      done: hasActiveRestaurant,
      href: `/${locale}/dashboard/qr`,
    },
    {
      id: 4,
      label: isTr ? 'Yorum platform bağlantılarını ekle' : 'Add review platform links',
      done: hasReviews,
      href: `/${locale}/dashboard/platforms`,
    },
    {
      id: 5,
      label: isTr ? 'Müşteri yorumlarını izle' : 'Track customer feedback',
      done: hasReviews,
      href: `/${locale}/dashboard/feedbacks`,
    },
  ];

  // 7-day aggregate footer for the trend card (design's 3-stat row beneath
  // BarChart). Total scans proxy = total feedbacks last 7d. Avg rating + redirect
  // rate computed across same window.
  const last7Total = trendByRestaurant.length;
  const last7Reviews = restIds.length
    ? await prisma.feedback.aggregate({
        where: { restaurantId: { in: restIds }, createdAt: { gte: sevenDaysAgo } },
        _avg: { rating: true },
      })
    : { _avg: { rating: null as number | null } };
  const last7AvgRating = last7Reviews._avg.rating ?? 0;
  const last7Redirected = restIds.length
    ? await prisma.feedback.count({
        where: {
          restaurantId: { in: restIds },
          createdAt: { gte: sevenDaysAgo },
          rating: { gte: 4 },
          platform: { not: null },
        },
      })
    : 0;
  const last7RedirectPct = last7Total > 0 ? Math.round((last7Redirected / last7Total) * 100) : 0;

  // Prior 7-day window for KPI deltas (design's "son 7 gün" suffix shows
  // week-over-week change — value is all-time, delta is W-1 → W comparison).
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [prev7Count, prev7Reviews, prev7Redirected] = restIds.length
    ? await Promise.all([
        prisma.feedback.count({
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
        }),
        prisma.feedback.aggregate({
          _avg: { rating: true },
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
      ])
    : [0, { _avg: { rating: null as number | null } }, 0];

  const pctDelta = (curr: number, prev: number): { value: string; kind: 'up' | 'down' | 'neutral' } => {
    if (prev === 0) {
      if (curr === 0) return { value: '0%', kind: 'neutral' };
      return { value: 'Yeni', kind: 'up' };
    }
    const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
    return {
      value: `${pct >= 0 ? '+' : ''}${pct}%`,
      kind: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
    };
  };

  const totalReviewsDelta = pctDelta(last7Total, prev7Count);
  const scansDelta = totalReviewsDelta; // scans proxy = same feedback count
  const redirectsDelta = pctDelta(last7Redirected, prev7Redirected);

  const prevAvg = prev7Reviews._avg.rating ?? 0;
  const ratingDeltaNum = last7AvgRating > 0 && prevAvg > 0
    ? Math.round((last7AvgRating - prevAvg) * 10) / 10
    : null;
  const ratingDelta: { value: string; kind: 'up' | 'down' | 'neutral' } = ratingDeltaNum === null
    ? { value: '—', kind: 'neutral' }
    : ratingDeltaNum === 0
      ? { value: '0', kind: 'neutral' }
      : { value: `${ratingDeltaNum > 0 ? '+' : ''}${ratingDeltaNum.toFixed(1)}`, kind: ratingDeltaNum > 0 ? 'up' : 'down' };

  // Mobile BUGÜN deltas — 30d vs prior 30d (design shows +18%, +0.2, +4pp).
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const [prev30Scans, last30Avg, prev30Avg, last30Redirected, prev30Redirected, last30Total] = restIds.length
    ? await Promise.all([
        prisma.feedback.count({
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgoMobile },
          },
        }),
        prisma.feedback.aggregate({
          _avg: { rating: true },
          where: { restaurantId: { in: restIds }, createdAt: { gte: thirtyDaysAgoMobile } },
        }),
        prisma.feedback.aggregate({
          _avg: { rating: true },
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgoMobile },
          },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: thirtyDaysAgoMobile },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgoMobile },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restIds },
            createdAt: { gte: thirtyDaysAgoMobile },
          },
        }),
      ])
    : [0, { _avg: { rating: null as number | null } }, { _avg: { rating: null as number | null } }, 0, 0, 0];

  const scans30dDelta = pctDelta(scans30d, prev30Scans);
  const last30AvgRating = last30Avg._avg.rating ?? 0;
  const prev30AvgRating = prev30Avg._avg.rating ?? 0;
  const ratingDelta30Num = last30AvgRating > 0 && prev30AvgRating > 0
    ? Math.round((last30AvgRating - prev30AvgRating) * 10) / 10
    : null;
  const ratingDelta30 = ratingDelta30Num === null
    ? '—'
    : `${ratingDelta30Num >= 0 ? '+' : ''}${ratingDelta30Num.toFixed(1)}`;
  const last30RedirectPct = last30Total > 0 ? Math.round((last30Redirected / last30Total) * 100) : 0;
  const prev30Total = prev30Scans;
  const prev30RedirectPct = prev30Total > 0 ? Math.round((prev30Redirected / prev30Total) * 100) : 0;
  const redirectDelta30 = `${last30RedirectPct - prev30RedirectPct >= 0 ? '+' : ''}${last30RedirectPct - prev30RedirectPct}pp`;

  // QR scan count proxy per QR — feedbacks with matching (restaurant, tableNumber, platform).
  // Real scan tracking yok; bu proxy "bu QR'dan gelen yorum sayısı" demek.
  const qrScanCounts = new Map<string, number>();
  if (qrPerfTop.length > 0) {
    const allFeedbacks = await prisma.feedback.findMany({
      where: { restaurantId: { in: qrPerfTop.map((q) => q.restaurantId) } },
      select: { restaurantId: true, tableNumber: true, platform: true },
    });
    for (const q of qrPerfTop) {
      const item = qrPerfRows.find((r) => r.id === q.id);
      if (!item) continue;
      const matched = allFeedbacks.filter(
        (f) =>
          f.restaurantId === item.restaurant.id &&
          (f.tableNumber || null) === (item.tableNumber || null) &&
          (f.platform || null) === (item.platform || null),
      ).length;
      qrScanCounts.set(q.id, matched);
    }
  }

  return (
    <div
      className="mx-auto max-w-[1200px] space-y-6 px-4 sm:px-7 py-6 lg:py-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <PageHeader
        eyebrow={isTr ? 'İŞLETME PANELİ' : 'OWNER PANEL'}
        title={isTr ? 'Panel' : 'Dashboard'}
      />

      <OnboardingNudge locale={locale} steps={onboardingSteps} />

      {/* Mobile-only "BUGÜN" hero card (Pulse 2026-04 mobile-screens-1.jsx
          MOwnerHome line 110-138 1:1). Desktop'ta KPI grid + 7-day chart
          aynı bilgiyi taşır, bu hero mobil-spesifik kompakt özet. */}
      <section className="md:hidden relative overflow-hidden rounded-[20px] bg-[#0A0A0A] p-[18px] text-white">
        <div
          aria-hidden
          className="absolute -top-[30px] -right-[30px] h-[140px] w-[140px] rounded-full"
          style={{ background: 'rgba(198,242,78,0.08)', filter: 'blur(20px)' }}
        />
        <div className="relative flex items-center justify-between">
          <span className="pulse-eyebrow text-[#C6F24E]">{isTr ? 'BUGÜN' : 'TODAY'}</span>
          <span className="text-[10px] text-white/50">
            {new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="bz-h-tight-2 mt-2.5" style={{ fontSize: 38 }}>
          {scansToday}
        </div>
        <div className="text-[12px] text-white/65">
          {isTr ? 'QR taraması' : 'QR scans'} · {reviewsToday} {isTr ? 'yorum' : 'reviews'}
        </div>
        <div className="mt-3.5 h-px bg-white/10" />
        <div className="mt-3.5 grid grid-cols-3">
          {[
            { l: isTr ? '30g taranma' : '30d scans', v: scans30dShort, d: scans30dDelta.value },
            { l: isTr ? 'Ort. puan' : 'Avg rating', v: avgRating > 0 ? avgRating.toFixed(1) : '—', d: ratingDelta30 },
            { l: isTr ? 'Yönlend.' : 'Redirect', v: `${redirectPct}%`, d: redirectDelta30 },
          ].map((s, i) => (
            <div
              key={s.l}
              className={i ? 'border-l border-white/10 pl-2.5 pr-2.5' : 'pr-2.5'}
            >
              <div className="pulse-eyebrow text-[8px] text-white/45">{s.l}</div>
              <div className="bz-h-tight mt-1 text-[16px]">{s.v}</div>
              {s.d && <div className="mt-0.5 text-[10px] font-semibold text-[#C6F24E]">{s.d}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Mobile-only quick actions 4-grid (mobile-screens-1.jsx line 141-159) */}
      <div className="md:hidden grid grid-cols-4 gap-2">
        {[
          { id: 'qr', icon: <QrCode size={18} strokeWidth={2} />, l: isTr ? 'QR' : 'QR', href: `/${locale}/dashboard/qr` },
          { id: 'feedback', icon: <Star size={18} strokeWidth={2} />, l: isTr ? 'Yorum' : 'Reviews', href: `/${locale}/dashboard/feedbacks` },
          { id: 'menu', icon: <Building2 size={18} strokeWidth={2} />, l: isTr ? 'Menü' : 'Menu', href: `/${locale}/dashboard/menu` },
          { id: 'platforms', icon: <ShieldCheck size={18} strokeWidth={2} />, l: isTr ? 'Platform' : 'Links', href: `/${locale}/dashboard/platforms` },
        ].map((a) => (
          <Link
            key={a.id}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border border-[#EDEDED] bg-white px-1 py-3.5 transition-colors hover:border-[#0A0A0A]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#FAFAFA]">
              {a.icon}
            </span>
            <span className="text-[11px] font-medium text-[#0A0A0A]">{a.l}</span>
          </Link>
        ))}
      </div>

      {/* Mobile-only SON 7 GÜN trend card (mobile-screens-1.jsx line 161-171) */}
      <section className="md:hidden bz-card p-4">
        <div className="flex items-center justify-between">
          <Eyebrow>{isTr ? 'SON 7 GÜN' : 'LAST 7 DAYS'}</Eyebrow>
          <span className="text-[10px] text-[#737373]">{isTr ? 'Taranma' : 'Scans'}</span>
        </div>
        <div className="bz-h-tight mt-1" style={{ fontSize: 20 }}>
          {last7Total.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
        </div>
        <div className="mt-3">
          <BarChart data={trendData} height={100} />
        </div>
      </section>

      {/* Mobile-only SON YORUMLAR list (mobile-screens-1.jsx line 173-184 + MFeedbackRow line 205-233) */}
      {latestFeedbacks.length > 0 && (
        <section className="md:hidden">
          <div className="flex items-center justify-between mb-2.5">
            <Eyebrow>{isTr ? 'SON YORUMLAR' : 'RECENT FEEDBACK'}</Eyebrow>
            <Link
              href={`/${locale}/dashboard/feedbacks`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#525252]"
            >
              {isTr ? 'Tümü' : 'All'}
              <ArrowRight size={11} strokeWidth={2} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {latestFeedbacks.slice(0, 3).map((fb) => {
              const isLow = fb.rating <= 3;
              const branchLabel = fb.branch || fb.restaurant?.name || (isTr ? 'İşletme' : 'Location');
              const timeAgo = formatDistanceToNowStrict(new Date(fb.createdAt), {
                addSuffix: true,
                locale: isTr ? trLocale : enLocale,
              });
              return (
                <div key={fb.id} className="bz-card p-3.5">
                  <div className="flex justify-between items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="flex gap-px">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={11}
                              className={s <= fb.rating ? 'text-[#C6F24E]' : 'text-[#E5E5E5]'}
                              fill={s <= fb.rating ? '#C6F24E' : '#E5E5E5'}
                            />
                          ))}
                        </span>
                        {isLow && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                            style={{ background: '#FEE2E2', color: '#991B1B' }}
                          >
                            {isTr ? 'Bekliyor' : 'Pending'}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[12.5px] text-[#0A0A0A] leading-[1.45] font-medium overflow-hidden"
                        style={{
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                        }}
                      >
                        {fb.comment || (isTr ? 'Yorum bırakılmadı.' : 'No comment.')}
                      </p>
                      <div className="mt-2 flex gap-2 text-[10.5px] text-[#737373]">
                        <span className="truncate">
                          {fb.name || (isTr ? 'Anonim' : 'Anonymous')}
                        </span>
                        <span>·</span>
                        <span className="truncate">{branchLabel}</span>
                        <span>·</span>
                        <span className="whitespace-nowrap">{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Desktop-only 4-stat KPI grid (1:1 Pulse 2026-04 OwnerDashboard).
          Mobil tarafta üstteki BUGÜN hero ve SON 7 GÜN card aynı verileri taşır. */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label={isTr ? 'Toplam yorum' : 'Total reviews'}
          value={totalReviews.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={totalReviewsDelta.value}
          deltaKind={totalReviewsDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
          icon={<Inbox size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Ortalama puan' : 'Avg rating'}
          value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
          delta={ratingDelta.value}
          deltaKind={ratingDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
          icon={<Star size={14} strokeWidth={2} fill="#C6F24E" stroke="#C6F24E" />}
          accent="#C6F24E"
        />
        <StatCard
          label={isTr ? 'QR taranma' : 'QR scans'}
          value={scans30d.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={scansDelta.value}
          deltaKind={scansDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
          icon={<QrCode size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Platforma yönlendirme' : 'Platform redirects'}
          value={redirectCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={redirectsDelta.value}
          deltaKind={redirectsDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
          icon={<ArrowUpRight size={14} strokeWidth={2} />}
        />
      </div>

      {/* Etkileşim eğilimi + Puan dağılımı (desktop-only, 1:1 design 2fr 1fr split) */}
      <div className="hidden md:grid gap-3.5 lg:grid-cols-[2fr_1fr]">
        <section className="bz-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <Eyebrow>{isTr ? 'Etkileşim eğilimi' : 'Interaction trend'}</Eyebrow>
              <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
                {isTr ? 'Son 7 gün' : 'Last 7 days'}
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4">
              <LegendDot color="#0A0A0A" label={isTr ? 'Taranma' : 'Scans'} />
              <LegendDot color="#C6F24E" label={isTr ? 'Puan' : 'Rating'} />
            </div>
          </div>
          <BarChart
            data={trendData}
            height={140}
            showValues
            secondaryValues={{
              label: isTr ? 'Ort. puan' : 'Avg rating',
              values: trendRatingsPerDay,
            }}
          />
          <div className="mt-5 pt-3.5 border-t border-[#EDEDED] grid grid-cols-3 gap-2 text-[12px] text-[#525252]">
            <span>
              <strong className="text-[#0A0A0A]">{last7Total}</strong>{' '}
              <span className="hidden sm:inline">{isTr ? 'toplam taranma' : 'total scans'}</span>
              <span className="sm:hidden">{isTr ? 'taranma' : 'scans'}</span>
            </span>
            <span>
              <strong className="text-[#0A0A0A]">{last7AvgRating > 0 ? last7AvgRating.toFixed(1) : '—'}</strong>{' '}
              <span className="hidden sm:inline">{isTr ? 'ort. puan' : 'avg rating'}</span>
              <span className="sm:hidden">{isTr ? 'puan' : 'rating'}</span>
            </span>
            <span>
              <strong className="text-[#0A0A0A]">{last7RedirectPct}%</strong>{' '}
              <span className="hidden sm:inline">{isTr ? 'yönlendirme oranı' : 'redirect rate'}</span>
              <span className="sm:hidden">{isTr ? 'yönlend.' : 'redirect'}</span>
            </span>
          </div>
        </section>

        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? 'Puan dağılımı' : 'Rating distribution'}</Eyebrow>
          <div className="bz-h-tight-2 mt-2" style={{ fontSize: 32 }}>
            {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            <span style={{ fontSize: 14, color: '#737373', fontWeight: 400 }}> / 5</span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {starRows.map((r) => {
              const barColor = r.star >= 4 ? '#0A0A0A' : r.star === 3 ? '#A3A3A3' : '#DC2626';
              return (
                <div key={r.star} className="flex items-center gap-2.5 text-[12px]">
                  <span className="w-3 text-[#525252]" style={{ fontWeight: 600 }}>
                    {r.star}
                  </span>
                  <Star size={11} className="text-[#C6F24E]" fill="#C6F24E" />
                  <div className="flex-1 h-1.5 bg-[#F5F5F5] rounded-[3px] overflow-hidden">
                    <div
                      className="h-full rounded-[3px]"
                      style={{ width: `${r.pct}%`, background: barColor }}
                    />
                  </div>
                  <span className="w-9 text-right text-[#737373] tabular-nums">
                    {r.count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Son yorumlar + QR performansı (desktop-only, 1:1 design 1fr 1fr split) */}
      {(latestFeedbacks.length > 0 || qrPerfTop.length > 0) && (
        <div className="hidden md:grid gap-3.5 lg:grid-cols-2">
          {latestFeedbacks.length > 0 && (
            <section className="bz-card">
              <div className="flex items-center justify-between p-5">
                <div>
                  <Eyebrow>{isTr ? 'Son yorumlar' : 'Recent reviews'}</Eyebrow>
                  <div className="bz-h-tight mt-1" style={{ fontSize: 16 }}>
                    {isTr ? 'Gelen kutusu' : 'Inbox'}
                  </div>
                </div>
                <Link
                  href={`/${locale}/dashboard/feedbacks`}
                  className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5"
                >
                  {isTr ? 'Tümü' : 'View all'}
                  <ArrowRight size={12} strokeWidth={2} />
                </Link>
              </div>
              <div className="border-t border-[#EDEDED]">
                {latestFeedbacks.map((fb) => {
                  const initials = (fb.name || fb.restaurant?.name || 'M').charAt(0).toUpperCase();
                  const high = fb.rating >= 4;
                  const branchLabel = fb.branch || fb.restaurant?.name || (isTr ? 'İşletme' : 'Location');
                  const timeAgo = formatDistanceToNowStrict(new Date(fb.createdAt), {
                    addSuffix: true,
                    locale: isTr ? trLocale : enLocale,
                  });
                  return (
                    <div
                      key={fb.id}
                      className="flex items-start gap-3 px-5 py-3.5 border-b border-[#F5F5F5] last:border-b-0"
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold shrink-0"
                        style={{
                          background: high ? '#0A0A0A' : '#DC2626',
                          color: high ? '#C6F24E' : '#fff',
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[13px] font-semibold truncate">
                            {fb.name || (isTr ? 'Anonim' : 'Anonymous')}
                          </span>
                          <span className="flex gap-px shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={11}
                                className={s <= fb.rating ? 'text-[#C6F24E]' : 'text-[#E5E5E5]'}
                                fill={s <= fb.rating ? '#C6F24E' : '#E5E5E5'}
                              />
                            ))}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[12.5px] text-[#525252] leading-[1.5]">
                          {fb.comment || (isTr ? 'Yorum bırakılmadı.' : 'No comment.')}
                        </p>
                        <div className="mt-1 flex gap-2.5 text-[10.5px] text-[#A3A3A3]">
                          <span className="truncate">
                            {branchLabel}
                            {fb.tableNumber ? ` · ${isTr ? 'Masa' : 'Table'} ${fb.tableNumber}` : ''}
                          </span>
                          <span>·</span>
                          <span className="whitespace-nowrap">{timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {qrPerfTop.length > 0 && (
            <section className="bz-card">
              <div className="p-5">
                <Eyebrow>{isTr ? 'QR performansı' : 'QR performance'}</Eyebrow>
                <div className="bz-h-tight mt-1" style={{ fontSize: 16 }}>
                  {isTr ? 'En aktif QR kodları' : 'Most active QRs'}
                </div>
              </div>
              <div className="border-t border-[#EDEDED]">
                {qrPerfTop.map((q) => {
                  const scans = qrScanCounts.get(q.id) ?? 0;
                  const platformLabel = q.platform
                    ? q.platform === 'google'
                      ? 'Google'
                      : q.platform === 'yemeksepeti'
                        ? 'Yemeksepeti'
                        : q.platform === 'getir'
                          ? 'Getir'
                          : q.platform === 'trendyol_go'
                            ? 'Trendyol GO'
                            : q.platform
                    : isTr
                      ? 'Genel'
                      : 'General';
                  return (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F5F5] last:border-b-0"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                        style={{ background: '#0A0A0A' }}
                      >
                        <QrCode size={18} className="text-[#C6F24E]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold truncate">{q.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#737373]">
                          <span className="truncate">{platformLabel}</span>
                          <span>·</span>
                          <span className="whitespace-nowrap">
                            {scans.toLocaleString(isTr ? 'tr-TR' : 'en-US')} {isTr ? 'yorum' : 'reviews'}
                          </span>
                        </div>
                      </div>
                      <Sparkline values={q.sparkline} w={56} h={20} color="#0A0A0A" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Detaylı analitik (operasyonel detay — tasarım grid'inin altında, desktop only) */}
      <div className="hidden md:block">
        <RestaurantAnalyticsPanel
          locale={locale}
          restaurants={user.restaurants.map((restaurant) => ({
            id: restaurant.id,
            name: restaurant.name,
          }))}
        />
      </div>

      {/* Konum performansı (sade liste — tasarımda yok ama owner için faydalı) */}
      {locationPerf.length > 0 && (
        <section className="bz-card p-6 sm:p-7">
          <div>
            <Eyebrow>{isTr ? 'Konum performansı' : 'Location performance'}</Eyebrow>
            <div className="bz-h-tight mt-1" style={{ fontSize: 16 }}>
              {isTr ? 'Puana göre' : 'By rating'}
            </div>
          </div>
          <ul className="mt-4 divide-y divide-[#EDEDED]">
            {locationPerf.map((loc) => (
              <li key={loc.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/${locale}/dashboard/restaurants/${loc.id}`}
                    className="block truncate text-[13px] font-medium text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                  >
                    {loc.name}
                  </Link>
                  <div className="pulse-eyebrow text-[#737373] mt-0.5">
                    {loc.count} {isTr ? 'yorum' : 'reviews'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="bz-h-tight text-[18px] tabular-nums">
                    {loc.avg > 0 ? loc.avg.toFixed(1) : '—'}
                  </span>
                  <Star size={14} className="text-[#C6F24E]" fill="#C6F24E" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Restaurants */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2
            className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.015em] bz-h-tight"
          >
            {t.dash_restaurants}
          </h2>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="inline-flex items-center gap-1.5 bg-[#0A0A0A] text-white px-4 py-2.5 rounded-full text-[13px] font-medium hover:bg-[#1A1A1A] transition-colors"
          >
            {t.dash_add_restaurant}
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>

        {user.restaurants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#EDEDED]">
              <Building2 size={22} className="text-[#737373]" />
            </div>
            <p
              className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
            >
              {t.dash_no_restaurant}
            </p>
            <p className="mt-2 text-[14px] text-[#525252] leading-[1.55] max-w-[400px] mx-auto">
              {isTr
                ? 'İlk restoranınızı ekleyerek itibarınızı yönetmeye başlayın.'
                : 'Add your first restaurant to start managing your reputation.'}
            </p>
            <Link
              href={`/${locale}/dashboard/restaurants`}
              className="mt-5 inline-flex items-center gap-1.5 bg-[#C6F24E] text-[#0A0A0A] px-5 py-2.5 rounded-full text-[13px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {t.dash_add_restaurant}
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user.restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bz-card p-6 transition-colors hover:border-[#C6F24E]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-[17px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
                    >
                      {restaurant.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <p className="pulse-eyebrow text-[#737373] truncate">/{restaurant.slug}</p>
                      <CopyUrlButton
                        url={`${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}/r/${restaurant.slug}`}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                  <span
                    className={`pulse-eyebrow shrink-0 rounded-full px-2 py-1 ${
                      restaurant.isActive
                        ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                        : 'bg-[#F5F5F5] text-[#737373]'
                    }`}
                  >
                    {restaurant.isActive ? (isTr ? 'AKTİF' : 'ACTIVE') : isTr ? 'PASİF' : 'INACTIVE'}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-2 border-y border-[#EDEDED] py-3">
                  <Star size={14} className="text-[#C6F24E]" fill="currentColor" />
                  <span className="text-[13px] text-[#525252]">
                    <span
                      className="font-semibold text-[#0A0A0A] bz-h-tight"
                    >
                      {restaurant._count.feedbacks}
                    </span>{' '}
                    {isTr ? 'yorum toplandı' : 'reviews collected'}
                  </span>
                </div>
                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/${locale}/dashboard/restaurants/${restaurant.id}`}
                    className="flex-1 rounded-full bg-[#0A0A0A] px-4 py-2.5 text-center text-[12px] font-medium text-white hover:bg-[#1A1A1A] transition-colors"
                  >
                    {t.dash_manage}
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/qr?restaurant=${restaurant.id}`}
                    className="flex-1 rounded-full border border-[#0A0A0A] px-4 py-2.5 text-center text-[12px] font-medium text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
                  >
                    {t.dash_qr}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upgrade CTA */}
      {user.plan === 'trial' && (
        <section className="rounded-2xl bg-[#0A0A0A] p-8 sm:p-10 text-white">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[560px]">
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'GROWTH' : 'GROWTH'}
              </span>
              <h3
                className="mt-3 text-[24px] sm:text-[30px] font-medium tracking-[-0.02em] leading-[1.15] bz-h-tight"
              >
                {isTr ? 'Kesintisiz itibar yönetimi.' : 'Uninterrupted reputation management.'}
              </h3>
              <p className="mt-3 text-[14px] text-white/70 leading-[1.6]">
                {isTr
                  ? `Deneme sürenizin bitmesine ${trialDaysLeft} gün kaldı. Tüm özellikleri sınırsız kullanmak için şimdi yükseltin.`
                  : `Only ${trialDaysLeft} days left in your trial. Upgrade now for unlimited access.`}
              </p>
            </div>
            <Link
              href={`/${locale}/pricing`}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-[#C6F24E] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {t.dash_upgrade}
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
