import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import type { Locale } from '@/lib/translations';
import {
  BarChart,
  Eyebrow,
  LegendDot,
  PageHeader,
  PlatformChip,
  PLATFORMS,
  StatCard,
  type PlatformId,
} from '@/components/ui';
import AnalyticsFilterBar from '@/components/dashboard/analytics/AnalyticsFilterBar';
import type { InteractionTrendPoint } from '@/components/dashboard/analytics/InteractionTrendChart';

// Recharts'ı sadece bu chart için lazy yükle (mobile ilk paint'te skeleton).
const InteractionTrendChart = dynamicImport(
  () => import('@/components/dashboard/analytics/InteractionTrendChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] sm:h-[300px] md:h-[340px] w-full animate-pulse rounded-xl bg-[#FAFAFA]" />
    ),
  },
);

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Analitik — Buaze' : 'Analytics — Buaze',
    robots: { index: false, follow: false },
  };
}

const STOP_WORDS = new Set([
  've', 'çok', 'bir', 'için', 'ile', 'ama', 'gibi', 'daha', 'olan',
  'olur', 'oldu', 'the', 'and', 'was', 'very', 'were', 'are', 'this',
  'that', 'they', 'have', 'had', 'from', 'then', 'with', 'which', 'just',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zçğıöşüA-ZÇĞİÖŞÜ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

function pctDelta(curr: number, prev: number): { value: string; kind: 'up' | 'down' | 'neutral' } {
  if (prev === 0) {
    if (curr === 0) return { value: '0%', kind: 'neutral' };
    return { value: 'Yeni', kind: 'up' };
  }
  const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
  return {
    value: `${pct >= 0 ? '+' : ''}${pct}%`,
    kind: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
  };
}

function ppDelta(currPct: number, prevPct: number, invertGood = false): { value: string; kind: 'up' | 'down' | 'neutral' } {
  const diff = currPct - prevPct;
  const rounded = Math.round(diff * 10) / 10;
  const sign = rounded >= 0 ? '+' : '';
  const isPositive = invertGood ? rounded < 0 : rounded > 0;
  const isNegative = invertGood ? rounded > 0 : rounded < 0;
  return {
    value: `${sign}${rounded}pp`,
    kind: isPositive ? 'up' : isNegative ? 'down' : 'neutral',
  };
}

const DAY_LABELS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PLATFORM_DISPLAY: Array<{ id: PlatformId; key: string }> = [
  { id: 'google', key: 'google' },
  { id: 'yemeksepeti', key: 'yemeksepeti' },
  { id: 'tripadvisor', key: 'tripadvisor' },
  { id: 'getir', key: 'getir' },
  { id: 'trendyol_go', key: 'trendyol_go' },
];

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ range?: string; platform?: string; branch?: string; restaurantId?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(`/${locale}/auth/login`);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { restaurants: { select: { id: true, name: true } } },
  });
  if (!user) redirect(`/${locale}/auth/login`);

  // Parse filters from URL searchParams (server-side, no client fetch).
  const rangeKey = (sp.range && RANGE_DAYS[sp.range] ? sp.range : '30d') as keyof typeof RANGE_DAYS;
  const windowDays = RANGE_DAYS[rangeKey];
  const platformFilter = sp.platform && sp.platform !== 'all' ? sp.platform : null;
  const branchFilter = sp.branch && sp.branch !== 'all' ? sp.branch : null;

  // Multi-restaurant owner: optional restaurantId filter (whitelist scope).
  const ownedIds = user.restaurants.map((r) => r.id);
  const restaurantIds =
    sp.restaurantId && sp.restaurantId !== 'all' && ownedIds.includes(sp.restaurantId)
      ? [sp.restaurantId]
      : ownedIds;

  const now = Date.now();
  const windowStart = new Date(now - windowDays * 24 * 60 * 60 * 1000);
  const prevWindowStart = new Date(now - windowDays * 2 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

  // Apply platform + branch filters to all queries via shared base WHERE.
  const baseWhere = {
    restaurantId: { in: restaurantIds },
    ...(platformFilter ? { platform: platformFilter } : {}),
    ...(branchFilter ? { branch: branchFilter } : {}),
  } as const;

  const [
    feedbacksWindow,
    feedbacksPrevWindow,
    feedbacks7d,
    redirectedWindow,
    redirectedPrevWindow,
    lowRatedWindow,
    lowRatedPrevWindow,
    todayCount,
    feedbacksWithComments,
  ] = restaurantIds.length
    ? await Promise.all([
        prisma.feedback.findMany({
          where: { ...baseWhere, createdAt: { gte: windowStart } },
          select: { rating: true, platform: true, createdAt: true },
        }),
        prisma.feedback.count({
          where: { ...baseWhere, createdAt: { gte: prevWindowStart, lt: windowStart } },
        }),
        prisma.feedback.findMany({
          where: { ...baseWhere, createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),
        prisma.feedback.count({
          where: {
            ...baseWhere,
            createdAt: { gte: windowStart },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
        prisma.feedback.count({
          where: {
            ...baseWhere,
            createdAt: { gte: prevWindowStart, lt: windowStart },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
        prisma.feedback.count({
          where: {
            ...baseWhere,
            createdAt: { gte: windowStart },
            rating: { lte: 3 },
          },
        }),
        prisma.feedback.count({
          where: {
            ...baseWhere,
            createdAt: { gte: prevWindowStart, lt: windowStart },
            rating: { lte: 3 },
          },
        }),
        prisma.feedback.count({
          where: { ...baseWhere, createdAt: { gte: startOfToday } },
        }),
        prisma.feedback.findMany({
          where: {
            ...baseWhere,
            createdAt: { gte: ninetyDaysAgo },
            comment: { not: null },
          },
          select: { rating: true, comment: true },
        }),
      ])
    : [[], 0, [], 0, 0, 0, 0, 0, []];

  // Distinct branches for filter dropdown (across owned restaurants, not
  // affected by current branch filter so user can pick a different one).
  const branchRows = ownedIds.length
    ? await prisma.feedback.findMany({
        where: { restaurantId: { in: ownedIds }, branch: { not: null } },
        distinct: ['branch'],
        select: { branch: true },
        take: 50,
      })
    : [];
  const branches = branchRows
    .map((r) => r.branch as string)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, isTr ? 'tr-TR' : 'en-US'));

  // KPI calculations
  const scansCount = feedbacksWindow.length;
  const reviewsCount = scansCount;
  const reviewsDelta = pctDelta(reviewsCount, feedbacksPrevWindow);
  const scansDelta = reviewsDelta; // same proxy

  const redirectRate = scansCount > 0 ? Math.round((redirectedWindow / scansCount) * 100) : 0;
  const prevRedirectRate = feedbacksPrevWindow > 0 ? Math.round((redirectedPrevWindow / feedbacksPrevWindow) * 100) : 0;
  const redirectDelta = ppDelta(redirectRate, prevRedirectRate);

  const lowRatingRate = scansCount > 0 ? Math.round((lowRatedWindow / scansCount) * 100) : 0;
  const prevLowRatingRate = feedbacksPrevWindow > 0 ? Math.round((lowRatedPrevWindow / feedbacksPrevWindow) * 100) : 0;
  const lowRatingDelta = ppDelta(lowRatingRate, prevLowRatingRate, true);

  // Window-day daily distribution (etkileşim chart) — dynamic length.
  // Dual-series: scans (toplam yorum/taranma) + redirects (rating>=4+platform).
  // Recharts AreaChart 7/30/90 günü tutarlı render eder; eski BarChart 90
  // bar için layout kırılıyordu (CLAUDE.md §34.7 cleanup log).
  const dateFmt = new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
  });
  const interactionData: InteractionTrendPoint[] = Array.from({ length: windowDays }, (_, i) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (windowDays - 1 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayFbs = feedbacksWindow.filter(
      (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
    );
    const scans = dayFbs.length;
    const redirects = dayFbs.filter(
      (f) => (f.rating ?? 0) >= 4 && f.platform != null && f.platform !== '',
    ).length;
    return { date: dateFmt.format(dayStart), scans, redirects };
  });

  // Platform paylaşımı — sadece "Tümü" filter'ında anlamlı (tek platform
  // seçiliyse breakdown gereksiz). Platform filter aktifse bu kart gizlenir.
  const platformShare = PLATFORM_DISPLAY.map((p) => {
    const count = feedbacksWindow.filter(
      (f) => (f.platform || '').toLowerCase() === p.key && f.rating >= 4,
    ).length;
    return { id: p.id, key: p.key, count };
  })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const totalRedirects = platformShare.reduce((a, p) => a + p.count, 0);
  const showPlatformShare = !platformFilter;

  // Günlük dağılım (7-day day-of-week) — fixed 7d window
  const dayLabels = isTr ? DAY_LABELS_TR : DAY_LABELS_EN;
  const dayBuckets: number[] = Array(7).fill(0);
  for (const f of feedbacks7d) {
    const jsDay = f.createdAt.getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    dayBuckets[idx] = (dayBuckets[idx] || 0) + 1;
  }
  const dayData = dayBuckets.map((v, i) => ({ label: dayLabels[i], value: v }));

  // Sentiment word chips — 90 day window
  const posFreq = new Map<string, number>();
  const negFreq = new Map<string, number>();
  feedbacksWithComments.forEach((f) => {
    if (!f.comment) return;
    if (f.rating === 3) return;
    const target = f.rating >= 4 ? posFreq : negFreq;
    tokenize(f.comment).forEach((w) =>
      target.set(w, (target.get(w) || 0) + 1),
    );
  });
  const allWords = new Set<string>([...posFreq.keys(), ...negFreq.keys()]);
  const sentimentThemes = Array.from(allWords)
    .map((label) => {
      const pos = posFreq.get(label) ?? 0;
      const neg = negFreq.get(label) ?? 0;
      return {
        label,
        count: pos + neg,
        tone: pos >= neg ? ('pos' as const) : ('neg' as const),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);

  const windowLabel = isTr ? `${windowDays} GÜNLÜK` : `${windowDays}-DAY`;
  const windowSuffix = isTr ? `önceki ${windowDays} güne göre` : `vs prev ${windowDays}d`;

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow={isTr ? 'İŞLETME PANELİ' : 'OWNER PANEL'}
        title={isTr ? 'Analitik' : 'Analytics'}
        description={
          isTr
            ? 'Yorum, yönlendirme ve trafik metriklerini filtrele.'
            : 'Filter review, redirect, and traffic metrics.'
        }
      />

      <AnalyticsFilterBar
        isTr={isTr}
        branches={branches}
        restaurants={user.restaurants}
      />

      {/* 5 KPI cards: Bugün + window-based metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          label={isTr ? 'Bugün' : 'Today'}
          value={todayCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          deltaSuffix={isTr ? 'yorum' : 'reviews'}
          accent="#C6F24E"
        />
        <StatCard
          label={isTr ? `${windowDays} gün taranma` : `${windowDays}d scans`}
          value={scansCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={scansDelta.value}
          deltaKind={scansDelta.kind}
          deltaSuffix={windowSuffix}
        />
        <StatCard
          label={isTr ? `${windowDays} gün yorum` : `${windowDays}d reviews`}
          value={reviewsCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={reviewsDelta.value}
          deltaKind={reviewsDelta.kind}
          deltaSuffix={windowSuffix}
        />
        <StatCard
          label={isTr ? 'Yönlendirme oranı' : 'Redirect rate'}
          value={`${redirectRate}%`}
          delta={redirectDelta.value}
          deltaKind={redirectDelta.kind}
          deltaSuffix={windowSuffix}
        />
        <StatCard
          label={isTr ? 'Düşük puan oranı' : 'Low rating rate'}
          value={`${lowRatingRate}%`}
          delta={lowRatingDelta.value}
          deltaKind={lowRatingDelta.kind}
          deltaSuffix={windowSuffix}
        />
      </div>

      {/* 2-col 2fr/1fr: window-day etkileşim + Platform paylaşımı (koşullu) */}
      <div className={`grid gap-3.5 ${showPlatformShare ? 'lg:grid-cols-[2fr_1fr]' : ''}`}>
        <section className="bz-card p-5 sm:p-6">
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
            <div>
              <Eyebrow>{`${windowLabel} ${isTr ? 'ETKİLEŞİM' : 'INTERACTION'}`}</Eyebrow>
              <div className="bz-h-tight mt-1 text-[18px]">
                {isTr ? 'Yorum ve yönlendirme trendi' : 'Reviews & redirects trend'}
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4 shrink-0">
              <LegendDot color="#0A0A0A" label={isTr ? 'Yorum' : 'Reviews'} />
              <LegendDot color="#A8D62E" label={isTr ? 'Yönlendirme' : 'Redirects'} />
            </div>
          </header>
          <InteractionTrendChart data={interactionData} isTr={isTr} />
        </section>

        {showPlatformShare && (
          <section className="bz-card p-5 sm:p-6">
            <Eyebrow>{isTr ? 'PLATFORM PAYLAŞIMI' : 'PLATFORM SHARE'}</Eyebrow>
            <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
              {totalRedirects} {isTr ? 'yönlendirme' : 'redirects'}
            </div>
            <div className="mt-3.5 flex flex-col gap-3">
              {platformShare.length === 0 ? (
                <p className="text-[12px] text-[#737373]">
                  {isTr ? 'Henüz yönlendirme yok.' : 'No redirects yet.'}
                </p>
              ) : (
                platformShare.map((p) => {
                  const pct = totalRedirects > 0 ? Math.round((p.count / totalRedirects) * 100) : 0;
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="inline-flex items-center gap-2">
                          <PlatformChip id={p.id} size={16} />
                          {PLATFORMS[p.id].label}
                        </span>
                        <span className="bz-mono font-semibold">{p.count}</span>
                      </div>
                      <div
                        className="rounded-[3px] overflow-hidden"
                        style={{ height: 6, background: '#F5F5F5' }}
                      >
                        <div
                          className="h-full rounded-[3px]"
                          style={{ width: `${pct}%`, background: PLATFORMS[p.id].color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>

      {/* 2-col 1fr/1fr: Günlük dağılım + Duygu analizi */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? 'GÜNLÜK DAĞILIM' : 'DAY DISTRIBUTION'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3" style={{ fontSize: 18 }}>
            {isTr ? 'Hangi günler en çok yorum geliyor?' : 'When are reviews coming in?'}
          </div>
          <BarChart data={dayData} height={140} showValues />
        </section>

        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? 'DUYGU ANALİZİ' : 'SENTIMENT'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3.5" style={{ fontSize: 18 }}>
            {isTr ? 'Yorumlardan çıkan kelimeler' : 'Words from reviews'}
          </div>
          {sentimentThemes.length === 0 ? (
            <p className="text-[12px] text-[#737373]">
              {isTr ? 'Henüz yeterli yorum yok.' : 'Not enough comments yet.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {sentimentThemes.map((tag) => {
                const isPos = tag.tone === 'pos';
                const size = 12 + Math.min(tag.count / 4, 8);
                return (
                  <span
                    key={tag.label}
                    className="inline-flex items-center gap-1.5 rounded-full"
                    style={{
                      padding: '5px 12px',
                      background: isPos ? '#EAF9B8' : '#FEF2F2',
                      color: isPos ? '#3D4D00' : '#991B1B',
                      fontSize: `${size}px`,
                      fontWeight: 500,
                    }}
                  >
                    {tag.label}
                    <span style={{ opacity: 0.6, fontSize: 10 }}>{tag.count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
