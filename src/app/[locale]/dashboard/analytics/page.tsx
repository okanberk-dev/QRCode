import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import {
  BarChart,
  Eyebrow,
  PageHeader,
  PlatformChip,
  PLATFORMS,
  StatCard,
  type PlatformId,
} from '@/components/ui';

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
  // For "low rating rate" lower is better → invert good direction
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

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(`/${locale}/auth/login`);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { restaurants: { select: { id: true } } },
  });
  if (!user) redirect(`/${locale}/auth/login`);

  const restaurantIds = user.restaurants.map((r) => r.id);

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Aggregate queries — 30d window for KPIs + chart, 7d for day distribution.
  const [
    feedbacks30d,
    feedbacksPrev30d,
    feedbacks7d,
    redirected30d,
    redirectedPrev30d,
    lowRated30d,
    lowRatedPrev30d,
    feedbacksWithComments,
  ] = restaurantIds.length
    ? await Promise.all([
        // 30-day total scans (proxy: feedback count)
        prisma.feedback.findMany({
          where: { restaurantId: { in: restaurantIds }, createdAt: { gte: thirtyDaysAgo } },
          select: { rating: true, platform: true, createdAt: true },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        }),
        prisma.feedback.findMany({
          where: { restaurantId: { in: restaurantIds }, createdAt: { gte: sevenDaysAgo } },
          select: { createdAt: true },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: thirtyDaysAgo },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            rating: { gte: 4 },
            platform: { not: null },
          },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: thirtyDaysAgo },
            rating: { lte: 3 },
          },
        }),
        prisma.feedback.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            rating: { lte: 3 },
          },
        }),
        // Sentiment data — 90 days for richer signal
        prisma.feedback.findMany({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: new Date(now - 90 * 24 * 60 * 60 * 1000) },
            comment: { not: null },
          },
          select: { rating: true, comment: true },
        }),
      ])
    : [[], 0, [], 0, 0, 0, 0, []];

  // KPI calculations
  const scans30dCount = feedbacks30d.length;
  const reviews30dCount = scans30dCount; // same proxy as feedback count
  const reviewsPrev30dCount = feedbacksPrev30d;
  const scansDelta = pctDelta(scans30dCount, feedbacksPrev30d);
  const reviewsDelta = pctDelta(reviews30dCount, reviewsPrev30dCount);

  const redirectRate = scans30dCount > 0 ? Math.round((redirected30d / scans30dCount) * 100) : 0;
  const prevRedirectRate = feedbacksPrev30d > 0 ? Math.round((redirectedPrev30d / feedbacksPrev30d) * 100) : 0;
  const redirectDelta = ppDelta(redirectRate, prevRedirectRate);

  const lowRatingRate = scans30dCount > 0 ? Math.round((lowRated30d / scans30dCount) * 100) : 0;
  const prevLowRatingRate = feedbacksPrev30d > 0 ? Math.round((lowRatedPrev30d / feedbacksPrev30d) * 100) : 0;
  // Düşük puan oranı için "good = lower" — invertGood true (azalış up arrow)
  const lowRatingDelta = ppDelta(lowRatingRate, prevLowRatingRate, true);

  // 30-day daily distribution (etkileşim chart)
  const interactionData: { label: string; value: number }[] = Array.from({ length: 30 }, (_, i) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (29 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = feedbacks30d.filter(
      (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
    ).length;
    return {
      label: '', // design'da label yok — sadece bar
      value: count,
    };
  });

  // Platform paylaşımı (30-day)
  const platformShare = PLATFORM_DISPLAY.map((p) => {
    const count = feedbacks30d.filter(
      (f) => (f.platform || '').toLowerCase() === p.key && f.rating >= 4,
    ).length;
    return { id: p.id, key: p.key, count };
  })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const totalRedirects = platformShare.reduce((a, p) => a + p.count, 0);

  // Günlük dağılım (7-day day-of-week)
  const dayLabels = isTr ? DAY_LABELS_TR : DAY_LABELS_EN;
  const dayBuckets: number[] = Array(7).fill(0);
  for (const f of feedbacks7d) {
    const jsDay = f.createdAt.getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    dayBuckets[idx] = (dayBuckets[idx] || 0) + 1;
  }
  const dayData = dayBuckets.map((v, i) => ({ label: dayLabels[i], value: v }));

  // Duygu analizi (sentiment word chips) — 90 day window
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

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow={isTr ? 'İŞLETME PANELİ' : 'OWNER PANEL'}
        title="analytics"
      />

      {/* 4 KPI cards (1:1 design OwnerAnalytics line 370-374) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label={isTr ? '30 gün taranma' : '30d scans'}
          value={scans30dCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={scansDelta.value}
          deltaKind={scansDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
        />
        <StatCard
          label={isTr ? '30 gün yorum' : '30d reviews'}
          value={reviews30dCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={reviewsDelta.value}
          deltaKind={reviewsDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
        />
        <StatCard
          label={isTr ? 'Yönlendirme oranı' : 'Redirect rate'}
          value={`${redirectRate}%`}
          delta={redirectDelta.value}
          deltaKind={redirectDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
        />
        <StatCard
          label={isTr ? 'Düşük puan oranı' : 'Low rating rate'}
          value={`${lowRatingRate}%`}
          delta={lowRatingDelta.value}
          deltaKind={lowRatingDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
        />
      </div>

      {/* 2-col 2fr/1fr: 30 günlük etkileşim + Platform paylaşımı */}
      <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]">
        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? '30 GÜNLÜK ETKİLEŞİM' : '30-DAY INTERACTION'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-4" style={{ fontSize: 18 }}>
            {isTr ? 'Taranma · Yorum · Yönlendirme' : 'Scans · Reviews · Redirects'}
          </div>
          <BarChart data={interactionData} height={180} />
        </section>

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
      </div>

      {/* 2-col 1fr/1fr: Günlük dağılım + Duygu analizi */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="bz-card p-5 sm:p-6">
          <Eyebrow>{isTr ? 'GÜNLÜK DAĞILIM' : 'DAY DISTRIBUTION'}</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3" style={{ fontSize: 18 }}>
            {isTr ? 'Hangi günler en çok yorum geliyor?' : 'When are reviews coming in?'}
          </div>
          <BarChart data={dayData} height={140} />
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
