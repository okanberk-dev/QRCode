import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractThemes } from '@/lib/analytics-themes';
import { deriveCustomerFields, type CustomerSegment } from '@/lib/customers';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Inbox,
  QrCode,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr as trLocale, enUS as enLocale } from 'date-fns/locale';
import RatingChart from '@/components/admin/RatingChart';
import PlatformDistribution from '@/components/admin/PlatformDistribution';
import TrendsChart from '@/components/admin/TrendsChart';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import OnboardingNudge, { type OnboardingStep } from '@/components/dashboard/OnboardingNudge';
import ActivationChecklistCard from '@/components/dashboard/ActivationChecklistCard';
import { Eyebrow, PageHeader, Sparkline, StatCard, PLATFORMS } from '@/components/ui';
import { SegmentChip } from '@/components/customers/SegmentChip';

// TrendsChart taşır 'use client' direktifini — server-side pre-render
// minimal HTML, browser'da Recharts hydrate. `dynamic({ ssr: false })`
// Next.js 15 Server Component'te yasak (CLAUDE.md §27).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Panel — Buaze' : 'Dashboard — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

// Tek source-of-truth filter — "ratings>=4 + platform set" 6+ yerden tekrar
// ediyordu. Const olarak dosya-üstünde tut, abstraction değil (CLAUDE.md §7).
const REDIRECT_WHERE = {
  rating: { gte: 4 },
  platform: { not: null },
} as const;

const PLATFORM_LABELS_TR: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
};

function isExpectedNavigationError(error: unknown) {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_');
}

export default async function DashboardPage(props: {
  params: Promise<{ locale: Locale }>;
}) {
  try {
    return await renderDashboardPage(props);
  } catch (error) {
    if (!isExpectedNavigationError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error('[DashboardPage] Server render failed', { message, stack });
    }
    throw error;
  }
}

async function renderDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);

  const payload = await verifyJwt(token);
  if (!payload) redirect(`/${locale}/auth/login`);

  // User + restaurants (single fetch, scoped via include).
  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string },
    include: {
      restaurants: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          initialGoogleRating: true,
          currentGoogleRating: true,
          _count: { select: { feedbacks: true } },
        },
      },
    },
  });
  if (!user) redirect(`/${locale}/auth/login`);

  const restIds = user.restaurants.map((r) => r.id);
  const restIdIn = { in: restIds };

  // Time windows used by KPIs + trend.
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 86400000);
  const fourteenDaysAgo = new Date(now - 14 * 86400000);

  // ---- Tek toplu Prisma transaction bloğu ----
  // Supabase pooler production'da connection_limit=1 ile çalışır; aynı
  // request içinde çok sayıda paralel query açmak pool_timeout riskini
  // artırır. Array transaction tek connection üstünden sırayla çalışır.
  // Boş restIds için Prisma `in: []` zaten 0 satır döner; fallback path
  // gereksiz. (Postgres `WHERE id = ANY(ARRAY[]::text[])` syntactically OK.)
  const [
    redirectCountAllTime,
    latestFeedbacks,
    trendFeedbacks,
    restaurantRatings,
    starGroups,
    platformGroups,
    qrPerfRows,
    qrScanGroups,
    last7Avg,
    last7Redirected,
    prev7Count,
    prev7Avg,
    prev7Redirected,
    last7Scans,
    prev7Scans,
    pendingTasks,
    themesFeedbacks,
  ] = await prisma.$transaction([
    // KPI 4: Platforma yönlendirme (all-time) — değer KPI'da; delta last7 vs prev7
    prisma.feedback.count({ where: { restaurantId: restIdIn, ...REDIRECT_WHERE } }),
    // Son yorumlar listesi (4 görünür "Son yorumlar" kartı için + 4 ek
    // CANLI AKIŞ timeline için — aynı veri reuse).
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { restaurant: { select: { name: true } } },
    }),
    // Trend (son 7 gün) — daily bucket için ham veri
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, rating: true, restaurantId: true },
    }),
    // Per-restaurant avg + count (totalReviews + avgRating tek source)
    prisma.feedback.groupBy({
      by: ['restaurantId'],
      where: { restaurantId: restIdIn },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // Star distribution (5-bar chart)
    prisma.feedback.groupBy({
      by: ['rating'],
      where: { restaurantId: restIdIn },
      _count: { _all: true },
    }),
    // Platform distribution (Yorum Görünümü section)
    prisma.feedback.groupBy({
      by: ['platform'],
      where: { restaurantId: restIdIn, platform: { not: null } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    // QR generations (top 5 için meta)
    prisma.qrGeneration.findMany({
      where: { restaurantId: restIdIn, type: 'feedback' },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        tableNumber: true,
        platform: true,
        createdAt: true,
        restaurant: { select: { name: true, id: true } },
      },
    }),
    // QR scan counts — gerçek scan event tracking (CLAUDE.md §34.x).
    // Eski versiyon feedback proxy idi; artık QrScan tablosundan groupBy.
    prisma.qrScan.groupBy({
      by: ['restaurantId', 'tableNumber', 'platform'],
      where: { restaurantId: restIdIn },
      _count: { _all: true },
    }),
    // Last 7 gün ortalama puan (delta için baz)
    prisma.feedback.aggregate({
      where: { restaurantId: restIdIn, createdAt: { gte: sevenDaysAgo } },
      _avg: { rating: true },
    }),
    // Last 7 gün yönlendirme (delta için baz)
    prisma.feedback.count({
      where: { restaurantId: restIdIn, createdAt: { gte: sevenDaysAgo }, ...REDIRECT_WHERE },
    }),
    // Önceki 7 gün count (delta için)
    prisma.feedback.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    // Önceki 7 gün ortalama puan
    prisma.feedback.aggregate({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
      _avg: { rating: true },
    }),
    // Önceki 7 gün yönlendirme
    prisma.feedback.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        ...REDIRECT_WHERE,
      },
    }),
    // Last 7 gün QR scans (gerçek tracking) — KPI 3 + delta
    prisma.qrScan.count({
      where: { restaurantId: restIdIn, createdAt: { gte: sevenDaysAgo } },
    }),
    // Prev 7 gün QR scans (delta baz)
    prisma.qrScan.count({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    // Bekleyen görevler — yanıtlanmamış low-rating yorumlar (HIGH 3 dashboard
    // task card için, tasarım .design-pulse-2026/.../page-dashboard.jsx).
    // Phase 8c+ (CLAUDE.md §38.17): email/phone explicit select — Phase 8c
    // segment helper'ı için contact_key türetilebilir (deriveCustomerFields
    // sonrası SegmentChip render). include → select migration aynı zamanda
    // CLAUDE.md §14.1 defensive select disiplini.
    prisma.feedback.findMany({
      where: { restaurantId: restIdIn, rating: { lte: 3 }, replies: { none: {} } },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rating: true,
        comment: true,
        branch: true,
        createdAt: true,
        restaurantId: true,
        restaurant: { select: { name: true } },
      },
    }),
    // SIK BAHSEDİLEN KONULAR — son 30 gün yorum metinleri (extractThemes
    // helper'ı için ham veri). Min 8 yorum + OpenAI key gereği helper içinde
    // (yetersiz → empty fallback). Cache 1 saat (CLAUDE.md §34.9).
    prisma.feedback.findMany({
      where: {
        restaurantId: restIdIn,
        createdAt: { gte: new Date(now - 30 * 86400000) },
        comment: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { rating: true, comment: true },
    }),
  ]);

  // ---- Derived metrics ----
  const totalReviews = restaurantRatings.reduce((a, r) => a + r._count._all, 0);
  const totalRatedCount = totalReviews;
  const avgRating =
    totalRatedCount === 0
      ? 0
      : restaurantRatings.reduce(
          (a, r) => a + (r._avg.rating ?? 0) * r._count._all,
          0,
        ) / totalRatedCount;

  const last7Total = trendFeedbacks.length;
  const last7AvgRating = last7Avg._avg.rating ?? 0;
  const last7RedirectPct = last7Total > 0 ? Math.round((last7Redirected / last7Total) * 100) : 0;

  // Per-restaurant avg map (Konum performansı widget için)
  const ratingByRestaurant = new Map(
    restaurantRatings.map((r) => [
      r.restaurantId,
      { avg: r._avg.rating ?? 0, count: r._count._all },
    ]),
  );
  const locationPerf = user.restaurants
    .map((r) => {
      const stat = ratingByRestaurant.get(r.id);
      return { id: r.id, name: r.name, avg: stat?.avg ?? 0, count: stat?.count ?? 0 };
    })
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 5);

  // Star distribution
  const starCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of starGroups) {
    if (g.rating >= 1 && g.rating <= 5) starCounts[g.rating as 1 | 2 | 3 | 4 | 5] = g._count._all;
  }

  // Platform distribution — Top platforms (3 değil, hepsi göster ama sıralı).
  // PlatformDistribution component zaten sıralayıp pill + bar grid çiziyor.
  const platformDistData = platformGroups
    .filter((g) => g.platform)
    .map((g) => ({
      platform: g.platform!,
      label: PLATFORM_LABELS_TR[g.platform!] ?? g.platform!,
      count: g._count._all,
      avgRating: g._avg.rating ?? null,
    }));

  // 7-day trend buckets (TrendsChart Recharts için)
  const dayLabelsTr = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const dayLabelsEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLabels = isTr ? dayLabelsTr : dayLabelsEn;
  const trendsChartData: { date: string; count: number; avgRating: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (6 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const jsDay = dayStart.getDay();
    const labelIdx = jsDay === 0 ? 6 : jsDay - 1;
    const dayFbs = trendFeedbacks.filter(
      (f) => f.createdAt >= dayStart && f.createdAt < dayEnd,
    );
    const count = dayFbs.length;
    const ratingSum = dayFbs.reduce((sum, f) => sum + (f.rating || 0), 0);
    const ratingAvg = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
    trendsChartData.push({ date: dayLabels[labelIdx], count, avgRating: ratingAvg });
  }

  // Per-restaurant 7-day sparkline (QR Performansı için).
  const sparklineByRestaurant = new Map<string, number[]>();
  for (const r of restIds) sparklineByRestaurant.set(r, Array(7).fill(0));
  for (const f of trendFeedbacks) {
    if (!f.restaurantId) continue;
    const dayIdx = Math.floor((Date.now() - f.createdAt.getTime()) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) {
      const arr = sparklineByRestaurant.get(f.restaurantId);
      if (arr) arr[6 - dayIdx] = (arr[6 - dayIdx] || 0) + 1;
    }
  }

  // QR scan count map — QrScan tablosundan groupBy(restaurantId, tableNumber, platform)
  const qrScanCounts = new Map<string, number>();
  for (const g of qrScanGroups) {
    if (!g.restaurantId) continue;
    const key = `${g.restaurantId}::${g.tableNumber || ''}::${g.platform || ''}`;
    qrScanCounts.set(key, g._count._all);
  }

  // QR Performansı top 5 — dedup (restaurant, table, platform) tuple'ı
  const seenKeys = new Set<string>();
  const qrPerfTop: Array<{
    id: string;
    name: string;
    platform: string | null;
    sparkline: number[];
    restaurantId: string;
    scans: number;
  }> = [];
  for (const q of qrPerfRows) {
    const key = `${q.restaurant.id}::${q.tableNumber || ''}::${q.platform || ''}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const restName = q.restaurant.name;
    const label = q.tableNumber
      ? `${restName} · ${isTr ? 'Masa' : 'Table'} ${q.tableNumber}`
      : q.platform
        ? `${restName} · ${q.platform}`
        : restName;
    qrPerfTop.push({
      id: q.id,
      name: label,
      platform: q.platform,
      sparkline: sparklineByRestaurant.get(q.restaurant.id) || Array(7).fill(0),
      restaurantId: q.restaurant.id,
      scans: qrScanCounts.get(key) ?? 0,
    });
    if (qrPerfTop.length >= 5) break;
  }

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86400000))
    : 0;

  // SIK BAHSEDİLEN KONULAR — son 30 gün yorumlarından AI ile tema çıkarımı.
  // extractThemes helper içinde min 8 yorum + OpenAI key kontrolü; yoksa
  // empty fallback (UI section gizli). Cache 1 saat (CLAUDE.md §34.9).
  const themeComments: Array<{ rating: number; comment: string }> = themesFeedbacks
    .filter((f): f is { rating: number; comment: string } =>
      typeof f.comment === 'string' && f.comment.length > 0,
    )
    .map((f) => ({ rating: f.rating, comment: f.comment }));
  const themeCacheKey = `dashboard-themes:${user.id}:30d`;
  const dashboardThemes = await extractThemes(themeComments, locale, themeCacheKey, user.id);

  // Phase 8c+ — pendingTasks her satırı için customer segment chip crossover
  // (CLAUDE.md §38.17). Anonim feedback (email + phone null) → segment yok →
  // chip render skip. Aggregate post-fetch tek raw query (CLAUDE.md §28.3.4
  // "mevcut endpoint'e yeni alan ekleme" + audit'in "Seçenek B: SQL basit, +1
  // round-trip" kararı). 4-row küçük yük, +5ms tolere edilebilir.
  type PendingContactKey = { restaurantId: string; contactKey: string };
  const pendingContactKeys: PendingContactKey[] = [];
  for (const task of pendingTasks) {
    if (!task.restaurantId) continue; // schema nullable; runtime where filter zaten daraltır
    const key =
      (task.email?.trim().toLowerCase() ?? '') ||
      (task.phone?.trim() ?? '');
    if (key) pendingContactKeys.push({ restaurantId: task.restaurantId, contactKey: key });
  }

  type CustomerAggregateRow = {
    restaurant_id: string;
    contact_key: string;
    visits: bigint;
    avg_rating: number | null;
    last_at: Date;
  };
  let pendingCustomerAggregates: CustomerAggregateRow[] = [];
  if (pendingContactKeys.length > 0) {
    // Postgres VALUES tuple matching — (restaurant_id, contact_key) çiftleri.
    // SQL injection guard: tüm değerler Prisma parametreleri olarak geçer.
    const tuples = pendingContactKeys.map(
      (p) => Prisma.sql`(${p.restaurantId}, ${p.contactKey})`,
    );
    try {
      pendingCustomerAggregates = await prisma.$queryRaw<CustomerAggregateRow[]>(Prisma.sql`
        SELECT
          f.restaurant_id,
          COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) AS contact_key,
          COUNT(*)::bigint AS visits,
          AVG(f.rating)::float AS avg_rating,
          MAX(f.created_at) AS last_at
        FROM feedback f
        WHERE f.has_kvkk_consent = TRUE
          AND COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) IS NOT NULL
          AND (
            f.restaurant_id,
            COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
          ) IN (${Prisma.join(tuples)})
        GROUP BY f.restaurant_id, contact_key
      `);
    } catch (err) {
      // Fail-soft — segment chip crossover faili mevcut "BUGÜN BEKLEYEN"
      // section'ını kıramaz; chip görünmez ama task list intact.
      console.error('[DASHBOARD_PENDING_AGGREGATE]', err);
      pendingCustomerAggregates = [];
    }
  }

  type PendingTaskWithSegment = (typeof pendingTasks)[number] & {
    segment: CustomerSegment | null;
  };
  const pendingTasksWithSegment: PendingTaskWithSegment[] = pendingTasks.map((task) => {
    const key =
      (task.email?.trim().toLowerCase() ?? '') ||
      (task.phone?.trim() ?? '');
    if (!key) return { ...task, segment: null };
    const agg = pendingCustomerAggregates.find(
      (a) => a.restaurant_id === task.restaurantId && a.contact_key === key,
    );
    if (!agg) return { ...task, segment: null };
    const derived = deriveCustomerFields({
      visits: Number(agg.visits),
      avgRating: agg.avg_rating,
      lastAt: agg.last_at,
    });
    return { ...task, segment: derived.segment };
  });

  // ---- Onboarding nudge (mevcut signal'lardan türet) ----
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
      href: `/${locale}/dashboard/integrations`,
    },
    {
      id: 5,
      label: isTr ? 'Müşteri yorumlarını izle' : 'Track customer feedback',
      done: hasReviews,
      href: `/${locale}/dashboard/feedbacks`,
    },
  ];

  // ---- KPI delta hesaplamaları (tek pencere: 7d vs prev 7d) ----
  const pctDelta = (curr: number, prev: number): { value: string; kind: 'up' | 'down' | 'neutral' } => {
    if (prev === 0) {
      if (curr === 0) return { value: '0%', kind: 'neutral' };
      return { value: isTr ? 'Yeni' : 'New', kind: 'up' };
    }
    const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
    return {
      value: `${pct >= 0 ? '+' : ''}${pct}%`,
      kind: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
    };
  };

  const totalReviewsDelta = pctDelta(last7Total, prev7Count);
  const scansDelta = pctDelta(last7Scans, prev7Scans);
  const redirectsDelta = pctDelta(last7Redirected, prev7Redirected);

  const prevAvg = prev7Avg._avg.rating ?? 0;
  const ratingDeltaNum =
    last7AvgRating > 0 && prevAvg > 0
      ? Math.round((last7AvgRating - prevAvg) * 10) / 10
      : null;
  const ratingDelta: { value: string; kind: 'up' | 'down' | 'neutral' } =
    ratingDeltaNum === null
      ? { value: '—', kind: 'neutral' }
      : ratingDeltaNum === 0
        ? { value: '0', kind: 'neutral' }
        : {
            value: `${ratingDeltaNum > 0 ? '+' : ''}${ratingDeltaNum.toFixed(1)}`,
            kind: ratingDeltaNum > 0 ? 'up' : 'down',
          };

  // ---- Quick actions (mobile + desktop unified) ----
  const quickActions = [
    {
      id: 'qr',
      icon: <QrCode size={18} strokeWidth={2} />,
      label: isTr ? 'QR' : 'QR',
      href: `/${locale}/dashboard/qr`,
    },
    {
      id: 'feedback',
      icon: <Star size={18} strokeWidth={2} />,
      label: isTr ? 'Yorumlar' : 'Reviews',
      href: `/${locale}/dashboard/feedbacks`,
    },
    {
      id: 'menu',
      icon: <Building2 size={18} strokeWidth={2} />,
      label: isTr ? 'Menü' : 'Menu',
      href: `/${locale}/dashboard/menu`,
    },
    {
      id: 'platforms',
      icon: <ShieldCheck size={18} strokeWidth={2} />,
      label: isTr ? 'Platform' : 'Links',
      href: `/${locale}/dashboard/integrations`,
    },
  ];

  // ---- Google Rating Impact ----
  const impactStats = user.restaurants
    .filter((r) => r.initialGoogleRating !== null && r.currentGoogleRating !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      initial: r.initialGoogleRating!,
      current: r.currentGoogleRating!,
      diff: Math.round((r.currentGoogleRating! - r.initialGoogleRating!) * 10) / 10,
    }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3); // top 3

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

      {/* Activation checklist (CLAUDE.md §19.5 + §23.7 Phase 11.29) — primary
          restaurant için 5-step kurulum kartı. 100% complete + dismiss
          olduğunda kart gizli. */}
      {user.restaurants[0] && (
        <ActivationChecklistCard
          restaurantId={user.restaurants[0].id}
          locale={locale}
        />
      )}

      {/* Bekleyen görevler — tasarım .design-pulse-2026/.../page-dashboard.jsx
          BUGÜN BEKLEYEN paterni. Yanıtlanmamış düşük puanlı yorumlar (rating ≤3
          + replies count == 0). Owner için aksiyon-odaklı workflow item'ı —
          itibar koruması için kritik (CLAUDE.md §15 Pulse AI suggest-reply ile
          işbirliği yapar; "Yanıtla" butonu inbox'a feedback fokuslu açar). */}
      {pendingTasks.length > 0 && (
        <section className="bz-card p-5 sm:p-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Eyebrow>{isTr ? 'BUGÜN BEKLEYEN' : 'PENDING TODAY'}</Eyebrow>
              <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px]">
                {pendingTasks.length}{' '}
                {isTr ? 'görev — yanıtsız düşük puan' : 'tasks — unanswered low rating'}
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/feedbacks?tab=low&hasReply=false`}
              className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 shrink-0"
            >
              {isTr ? 'Tümü' : 'View all'}
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </header>
          <ul className="space-y-2">
            {pendingTasksWithSegment.map((task) => {
              const initial = (task.name || task.email || '?').charAt(0).toUpperCase();
              const ageMin = Math.floor((Date.now() - task.createdAt.getTime()) / 60000);
              const ageLabel =
                ageMin < 60
                  ? `${ageMin} ${isTr ? 'dk' : 'm'}`
                  : ageMin < 1440
                    ? `${Math.floor(ageMin / 60)} ${isTr ? 'sa' : 'h'}`
                    : `${Math.floor(ageMin / 1440)} ${isTr ? 'g' : 'd'}`;
              const branch = task.branch || task.restaurant?.name || '';
              return (
                <li key={task.id}>
                  <Link
                    href={`/${locale}/dashboard/feedbacks?focus=${task.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 transition-colors hover:bg-[#FEE2E2]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DC2626] text-[12px] font-semibold text-white">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0A0A0A]">
                        <span className="truncate">{task.name || (isTr ? 'Anonim' : 'Anonymous')}</span>
                        <span className="flex shrink-0 gap-px">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={10}
                              className={s <= task.rating ? 'text-[#DC2626]' : 'text-[#FECACA]'}
                              fill={s <= task.rating ? '#DC2626' : '#FECACA'}
                            />
                          ))}
                        </span>
                        {/* Phase 8c+ segment chip — desktop'ta yıldızların yanında
                            (CLAUDE.md §38.17). Anonim feedback'te chip render
                            edilmez (segment null). */}
                        {task.segment && (
                          <span className="hidden sm:inline-flex shrink-0">
                            <SegmentChip segment={task.segment} locale={locale} size="sm" />
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-[#525252]">
                        {task.comment || (isTr ? 'Yorum bırakılmadı.' : 'No comment.')}
                      </p>
                      {/* Mobile: chip comment'in altında ayrı satır — desktop'ta
                          gizli (yıldızların yanına render edilir). */}
                      {task.segment && (
                        <div className="mt-1 flex sm:hidden">
                          <SegmentChip segment={task.segment} locale={locale} size="sm" />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-[10.5px] text-[#737373]">
                      <span className="bz-mono tabular-nums">{ageLabel}</span>
                      {branch && <span className="truncate max-w-[80px]">{branch}</span>}
                    </div>
                    <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[10.5px] font-semibold text-white">
                      {isTr ? 'Yanıtla' : 'Reply'}
                      <ArrowRight size={10} strokeWidth={2.5} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Unified KPI Grid — mobile 2x2 → desktop 4-col. Tek delta pencere
          (son 7 gün vs önceki 7 gün) — kullanıcı dostu, karışıklık yok. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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
          value={last7Scans.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={scansDelta.value}
          deltaKind={scansDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
          icon={<QrCode size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Platforma yönlendirme' : 'Platform redirects'}
          value={redirectCountAllTime.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          delta={redirectsDelta.value}
          deltaKind={redirectsDelta.kind}
          deltaSuffix={isTr ? 'son 7 gün' : 'last 7 days'}
          icon={<ArrowUpRight size={14} strokeWidth={2} />}
        />
      </div>

      {/* Quick Actions — mobil 2×2 (touch target ≥ 44px Apple HIG), desktop 4-col. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {quickActions.map((a) => (
          <Link
            key={a.id}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border border-[#EDEDED] bg-white px-1 py-3.5 transition-colors hover:border-[#0A0A0A]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#FAFAFA] text-[#0A0A0A]">
              {a.icon}
            </span>
            <span className="text-[11px] sm:text-[12px] font-medium text-[#0A0A0A]">
              {a.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Trend & Etkileşim — TEK section. Eski custom BarChart "Etkileşim
          eğilimi" + ayrı "İleri İstatistikler" trend chart'ı tek yerde
          birleştirildi (Recharts AreaChart, secondary rating line). Footer
          3-stat kompakt summary. Derin filtre/funnel/leaderboard için
          /analytics linki. */}
      <section className="bz-card p-5 sm:p-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <Eyebrow>{isTr ? 'TREND VE ETKİLEŞİM' : 'TREND & ENGAGEMENT'}</Eyebrow>
            <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px]">
              {isTr ? 'Son 7 gün' : 'Last 7 days'}
            </h2>
          </div>
          <Link
            href={`/${locale}/dashboard/analytics`}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#525252] hover:text-[#0A0A0A] transition-colors self-start sm:self-end"
          >
            {isTr ? 'Detaylı analitik' : 'Detailed analytics'}
            <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </header>

        <TrendsChart data={trendsChartData} />

        <div className="mt-5 pt-3.5 border-t border-[#EDEDED] grid grid-cols-3 gap-2 text-[12px] text-[#525252]">
          <span>
            <strong className="text-[#0A0A0A] tabular-nums">{last7Total}</strong>{' '}
            <span className="hidden sm:inline">{isTr ? 'toplam yorum' : 'total reviews'}</span>
            <span className="sm:hidden">{isTr ? 'yorum' : 'reviews'}</span>
          </span>
          <span>
            <strong className="text-[#0A0A0A] tabular-nums">
              {last7AvgRating > 0 ? last7AvgRating.toFixed(1) : '—'}
            </strong>{' '}
            <span className="hidden sm:inline">{isTr ? 'ort. puan' : 'avg rating'}</span>
            <span className="sm:hidden">{isTr ? 'puan' : 'rating'}</span>
          </span>
          <span>
            <strong className="text-[#0A0A0A] tabular-nums">{last7RedirectPct}%</strong>{' '}
            <span className="hidden sm:inline">{isTr ? 'yönlendirme oranı' : 'redirect rate'}</span>
            <span className="sm:hidden">{isTr ? 'yönlend.' : 'redirect'}</span>
          </span>
        </div>
      </section>

      {/* KANAL DAĞILIMI — tasarım .design-pulse-2026/.../page-dashboard.jsx
          ChannelCard 4-card grid paterni. Top 4 platform card (brand icon +
          name + count + avg rating + delta tahmini). Mobile 2-col, sm+ 4-col. */}
      {platformDistData.length > 0 && (
        <section>
          <header className="mb-3 flex items-end justify-between gap-3">
            <div>
              <Eyebrow>{isTr ? 'KANAL DAĞILIMI' : 'CHANNEL BREAKDOWN'}</Eyebrow>
              <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px]">
                {isTr ? 'Platform performansı' : 'Platform performance'}
              </h2>
            </div>
            <Link
              href={`/${locale}/dashboard/analytics`}
              className="text-[12px] text-[#525252] hover:text-[#0A0A0A] inline-flex items-center gap-1"
            >
              {isTr ? 'Tüm kanallar' : 'All channels'}
              <ArrowRight size={11} strokeWidth={2} />
            </Link>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {platformDistData.slice(0, 4).map((p) => {
              const brand = (PLATFORMS as Record<string, { color: string; short: string; label: string }>)[
                p.platform
              ];
              const tone = brand?.color ?? '#A3A3A3';
              const short = brand?.short ?? p.label.slice(0, 2).toUpperCase();
              return (
                <div key={p.platform} className="bz-card p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10.5px] font-semibold text-white"
                      style={{ background: tone }}
                    >
                      {short}
                    </span>
                    <span className="truncate text-[12.5px] font-semibold text-[#0A0A0A]">
                      {p.label}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="bz-mono tabular-nums text-[20px] font-semibold text-[#0A0A0A]">
                      {p.avgRating != null ? p.avgRating.toFixed(1) : '—'}
                    </span>
                    <span className="text-[11px] text-[#525252]">
                      {p.count} {isTr ? 'yorum' : 'reviews'}
                    </span>
                  </div>
                  {/* Mini progress bar — count vs leader */}
                  <div className="h-1 rounded-full bg-[#F5F5F5] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          platformDistData[0]?.count
                            ? Math.max(8, (p.count / platformDistData[0].count) * 100)
                            : 0
                        }%`,
                        background: tone,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SIK BAHSEDİLEN KONULAR — tasarım .design-pulse-2026/.../page-dashboard.jsx
          Topic breakdown paterni. extractThemes (AI helper, gpt-4o-mini, cached
          1h) son 30 gün yorumlarından top temaları çıkarır. Min 8 yorum yoksa
          ya da OpenAI key yoksa section gizli (empty fallback). */}
      {dashboardThemes.themes.length > 0 && (
        <section className="bz-card p-5 sm:p-6">
          <header className="mb-5 flex items-end justify-between gap-3">
            <div>
              <Eyebrow>{isTr ? 'SIK BAHSEDİLEN KONULAR' : 'TRENDING TOPICS'}</Eyebrow>
              <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px]">
                {isTr ? 'Müşteriler ne konuşuyor' : 'What customers talk about'}
              </h2>
            </div>
            <span className="bz-mono text-[10.5px] text-[#737373] tabular-nums shrink-0">
              {isTr ? 'SON 30 GÜN' : 'LAST 30 DAYS'}
            </span>
          </header>
          <ul className="space-y-3.5">
            {dashboardThemes.themes.slice(0, 5).map((t) => {
              const top = dashboardThemes.themes[0]?.count ?? 1;
              const pct = top > 0 ? (t.count / top) * 100 : 0;
              return (
                <li key={t.theme}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-medium text-[#0A0A0A] truncate">{t.theme}</span>
                    <span className="bz-mono tabular-nums text-[11px] text-[#737373] shrink-0">
                      {t.count} {isTr ? 'bahsedilme' : 'mentions'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F5F5F5] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0A0A0A] transition-all duration-500"
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {dashboardThemes.synthesis && (
            <div className="mt-5 rounded-xl bg-[#0A0A0A] p-4 text-[13px] leading-[1.55] text-white">
              <span className="pulse-eyebrow text-[#C6F24E] block mb-1.5">
                {isTr ? 'PULSE AI ÇIKARIMI' : 'PULSE AI INSIGHT'}
              </span>
              <p className="text-white/85">{dashboardThemes.synthesis}</p>
            </div>
          )}
        </section>
      )}

      {/* CANLI AKIŞ — tasarım .design-pulse-2026/.../page-dashboard.jsx
          ActivityRow timeline paterni. latestFeedbacks reuse (8 kayıt; üst
          kart 4'ünü gösterir, burası 8'i timeline format'ta). SentimentDot
          rating'e göre (≥4 lime, =3 gray, ≤2 red). */}
      {latestFeedbacks.length > 0 && (
        <section className="bz-card p-5 sm:p-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden className="bz-pulse-dot" />
              <Eyebrow>{isTr ? 'CANLI AKIŞ' : 'LIVE FEED'}</Eyebrow>
            </div>
            <span className="bz-mono text-[10.5px] text-[#737373] tabular-nums">
              {latestFeedbacks.length} {isTr ? 'son etkinlik' : 'recent events'}
            </span>
          </header>
          <ul className="space-y-0">
            {latestFeedbacks.map((fb, idx) => {
              const sentColor = fb.rating >= 4 ? '#16A34A' : fb.rating <= 2 ? '#DC2626' : '#A3A3A3';
              const action = isTr
                ? fb.rating >= 4
                  ? 'yüksek puanlı yorum bıraktı'
                  : fb.rating <= 2
                    ? 'düşük puanlı yorum bıraktı'
                    : 'yorum bıraktı'
                : fb.rating >= 4
                  ? 'left a high-rated review'
                  : fb.rating <= 2
                    ? 'left a low-rated review'
                    : 'left a review';
              const target = `${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)} ${
                fb.platform
                  ? PLATFORM_LABELS_TR[fb.platform] ?? fb.platform
                  : fb.restaurant?.name ?? ''
              }`;
              const timeAgo = formatDistanceToNowStrict(new Date(fb.createdAt), {
                addSuffix: false,
                locale: isTr ? trLocale : enLocale,
              });
              return (
                <li
                  key={fb.id}
                  className={`flex items-center gap-3 py-2.5 text-[12.5px] ${
                    idx < latestFeedbacks.length - 1 ? 'border-b border-[#F5F5F5]' : ''
                  }`}
                >
                  <span className="bz-mono tabular-nums text-[11px] text-[#737373] w-14 shrink-0 truncate">
                    {timeAgo}
                  </span>
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: sentColor }}
                  />
                  <div className="min-w-0 flex-1 truncate text-[#525252]">
                    <Link
                      href={`/${locale}/dashboard/feedbacks?focus=${fb.id}`}
                      className="font-semibold text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                    >
                      {fb.name || (isTr ? 'Anonim' : 'Anonymous')}
                    </Link>{' '}
                    {action}{' — '}
                    <span className="text-[#737373]">{target}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Yorum Görünümü — TEK section, 2-col responsive. Puan dağılımı
          (5-bar histogram) + Platform dağılımı (pill + bar grid) yan yana.
          /analytics derin breakdown için zaten var. */}
      {(totalReviews > 0 || platformDistData.length > 0) && (
        <section className="bz-card p-5 sm:p-6">
          <header className="mb-5">
            <Eyebrow>{isTr ? 'YORUM GÖRÜNÜMÜ' : 'REVIEW INSIGHTS'}</Eyebrow>
            <h2 className="bz-h-tight mt-1 text-[18px] sm:text-[20px]">
              {isTr ? 'Puanlar ve platformlar' : 'Ratings & platforms'}
            </h2>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="bz-h-tight-2 text-[28px] sm:text-[32px] tabular-nums">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </span>
                <span className="text-[13px] text-[#737373]">
                  / 5 · {totalReviews.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
                  {isTr ? 'yorum' : 'reviews'}
                </span>
              </div>
              <RatingChart distribution={starCounts} totalCount={totalReviews} />
            </div>

            <div>
              <div className="mb-4">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'PLATFORM DAĞILIMI' : 'PLATFORM SPLIT'}
                </span>
              </div>
              {platformDistData.length > 0 ? (
                <PlatformDistribution data={platformDistData} locale={locale} />
              ) : (
                <p className="text-[13px] text-[#737373]">
                  {isTr
                    ? 'Henüz platform bağlantılı yorum gelmedi.'
                    : 'No platform-linked reviews yet.'}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Son yorumlar + QR performansı (unified responsive: mobile dikey
          stack, lg+ 2-col split). Eski mobile-only ayrı liste silindi. */}
      {(latestFeedbacks.length > 0 || qrPerfTop.length > 0) && (
        <div className="grid gap-3.5 lg:grid-cols-2">
          {latestFeedbacks.length > 0 && (
            <section className="bz-card">
              <div className="flex items-center justify-between p-5">
                <div>
                  <Eyebrow>{isTr ? 'Son yorumlar' : 'Recent reviews'}</Eyebrow>
                  <div className="bz-h-tight mt-1 text-[16px]">
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
                {latestFeedbacks.slice(0, 4).map((fb) => {
                  const initials = (fb.name || fb.restaurant?.name || 'M')
                    .charAt(0)
                    .toUpperCase();
                  const high = fb.rating >= 4;
                  const lowRated = fb.rating <= 3;
                  const branchLabel =
                    fb.branch || fb.restaurant?.name || (isTr ? 'İşletme' : 'Location');
                  const timeAgo = formatDistanceToNowStrict(new Date(fb.createdAt), {
                    addSuffix: true,
                    locale: isTr ? trLocale : enLocale,
                  });
                  return (
                    <Link
                      key={fb.id}
                      href={`/${locale}/dashboard/feedbacks?focus=${fb.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 border-b border-[#F5F5F5] last:border-b-0 transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:bg-[#FAFAFA]"
                      aria-label={`${fb.name || (isTr ? 'Anonim' : 'Anonymous')} — ${fb.rating}★ — ${
                        isTr ? 'detay ve yanıtla' : 'view and reply'
                      }`}
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
                            {fb.tableNumber
                              ? ` · ${isTr ? 'Masa' : 'Table'} ${fb.tableNumber}`
                              : ''}
                          </span>
                          <span>·</span>
                          <span className="whitespace-nowrap">{timeAgo}</span>
                          {lowRated && (
                            <>
                              <span>·</span>
                              <span className="rounded-full bg-[#EAF9B8] px-2 py-0.5 text-[10px] font-semibold text-[#0A0A0A]">
                                {isTr ? 'Yanıtla →' : 'Reply →'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {qrPerfTop.length > 0 && (
            <section className="bz-card">
              <div className="p-5">
                <Eyebrow>{isTr ? 'QR performansı' : 'QR performance'}</Eyebrow>
                <div className="bz-h-tight mt-1 text-[16px]">
                  {isTr ? 'En aktif QR kodları' : 'Most active QRs'}
                </div>
              </div>
              <div className="border-t border-[#EDEDED]">
                {qrPerfTop.map((q) => {
                  const platformLabel = q.platform
                    ? PLATFORM_LABELS_TR[q.platform] ?? q.platform
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
                            {q.scans.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
                            {isTr ? 'taranma' : 'scans'}
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

      {/* Konum performansı ve Google Etkisi (Grid layout) */}
      {(locationPerf.length > 0 || impactStats.length > 0) && (
        <div className="grid gap-3.5 lg:grid-cols-2">
          {locationPerf.length > 0 && (
            <section className="bz-card p-6 sm:p-7">
              <div>
                <Eyebrow>{isTr ? 'Konum performansı' : 'Location performance'}</Eyebrow>
                <div className="bz-h-tight mt-1 text-[16px]">
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

          {impactStats.length > 0 && (
            <section className="bz-card p-6 sm:p-7 bg-[#FAFAFA] border-[#EAF9B8] border-2 shadow-[0_4px_24px_rgba(198,242,78,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Star size={120} fill="#C6F24E" color="#C6F24E" />
              </div>
              <div className="relative z-10">
                <Eyebrow className="text-[#525252]">
                  {isTr ? 'BUAZE ETKİSİ' : 'BUAZE IMPACT'}
                </Eyebrow>
                <div className="bz-h-tight mt-1 text-[18px] sm:text-[20px] font-semibold text-[#0A0A0A]">
                  {isTr ? 'Google Puan Artışı' : 'Google Rating Growth'}
                </div>
                <p className="mt-2 text-[13px] text-[#525252] leading-relaxed max-w-[280px]">
                  {isTr 
                    ? 'Buaze sayesinde yorum toplama ve hızlı geri dönüşlerle işletme puanınız yükselişte.'
                    : 'Your business rating is growing thanks to review collection and fast replies via Buaze.'}
                </p>
                
                <div className="mt-6 space-y-4">
                  {impactStats.map(stat => (
                    <div key={stat.id} className="rounded-xl bg-white p-4 border border-[#EDEDED] shadow-sm flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#0A0A0A] truncate">{stat.name}</div>
                        <div className="text-[12px] text-[#737373] mt-0.5 flex items-center gap-1.5">
                          <span>{isTr ? 'Başlangıç' : 'Initial'}: {stat.initial.toFixed(1)}</span>
                          <ArrowRight size={10} />
                          <strong className="text-[#0A0A0A]">{isTr ? 'Güncel' : 'Current'}: {stat.current.toFixed(1)}</strong>
                        </div>
                      </div>
                      {stat.diff > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EAF9B8] px-2 py-0.5 text-[11px] font-semibold text-[#0A0A0A]">
                            <ArrowUpRight size={10} strokeWidth={3} />
                            +{stat.diff.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {stat.diff === 0 && (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-semibold text-[#525252]">
                            = {isTr ? 'Aynı' : 'Same'}
                          </span>
                        </div>
                      )}
                      {stat.diff < 0 && (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                            {stat.diff.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Restaurants */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.015em] bz-h-tight">
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
            <p className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight">
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
                    <h3 className="truncate text-[17px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight">
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
                    {restaurant.isActive
                      ? isTr
                        ? 'AKTİF'
                        : 'ACTIVE'
                      : isTr
                        ? 'PASİF'
                        : 'INACTIVE'}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-2 border-y border-[#EDEDED] py-3">
                  <Star size={14} className="text-[#C6F24E]" fill="currentColor" />
                  <span className="text-[13px] text-[#525252]">
                    <span className="font-semibold text-[#0A0A0A] bz-h-tight">
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
              <h3 className="mt-3 text-[24px] sm:text-[30px] font-medium tracking-[-0.02em] leading-[1.15] bz-h-tight">
                {isTr
                  ? 'Kesintisiz itibar yönetimi.'
                  : 'Uninterrupted reputation management.'}
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
