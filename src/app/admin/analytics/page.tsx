'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, HelpCircle, Loader2, Star, TrendingUp, Globe2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import ExportReportButton from '@/components/dashboard/ExportReportButton';
import { PageHeader, PlatformChip, PLATFORMS, Skeleton, type PlatformId } from '@/components/ui';

// Stage 28 §38.104 Fix A1 — recharts-heavy BI section hydration defer.
// AdminBiSection MRR/Churn/NPS/Cohort 4 chart taşır (~35 KB recharts
// gzipped). SSR'da pre-render anlamlı değil (admin-only data, client-side
// fetch + chart render); `ssr: false` ile bundle hydration deferred →
// analytics page initial paint hızlanır, BI section async hydrate olur.
// Skeleton loading fallback CLAUDE.md §27 dynamic + §11.17 content-shape
// paterni reuse.
const AdminBiSection = dynamic(() => import('@/components/admin/AdminBiSection'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-2xl" />,
});

const PLATFORM_OPTIONS: PlatformId[] = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
];

interface TrendPoint {
  date: string;
  count: number;
  avgRating: number;
}

interface PlatformDatum {
  platform: string;
  label: string;
  count: number;
  avgRating: number | null;
}

interface WordCloudEntry {
  text: string;
  value: number;
}

interface StatsResp {
  totalCount?: number;
  avgRating?: number;
  distribution?: Record<string, number>;
  platformDistribution?: PlatformDatum[];
  trends?: TrendPoint[];
  wordCloud?: WordCloudEntry[];
}

interface GoogleIntegrationRestaurant {
  restaurantId: string;
  restaurantName: string;
  ownerEmail: string | null;
  selectedLocation: {
    accountId: string;
    locationId: string;
    title: string;
    selectedAt: string;
    lastReviewNotifiedAt: string | null;
  } | null;
}

interface GoogleIntegrationRow {
  integrationId: string;
  integrationOwner: string;
  ownerEmail: string | null;
  hasRefreshToken: boolean;
  accessTokenExpiresAt: string;
  accessTokenExpired: boolean;
  syncedAt: string | null;
  totalLocations: number;
  restaurants: GoogleIntegrationRestaurant[];
  createdAt: string;
  updatedAt: string;
}

interface GoogleIntegrationsResp {
  integrations: GoogleIntegrationRow[];
  meta: { total: number; withRefreshToken: number; expiredAccess: number };
}

const PLATFORM_COLORS: Record<string, string> = {
  google: '#4285F4',
  yemeksepeti: '#FA0050',
  getir: '#5D3EBC',
  trendyol_go: '#F27A1A',
  tripadvisor: '#00AF87',
  airbnb: '#FF5A5F',
  booking: '#003580',
  yandex: '#FC3F1D',
  unspecified: '#737373',
  unknown: '#737373',
};

export default function AdminAnalyticsPage() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [platform, setPlatform] = useState<'all' | PlatformId>('all');
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleData, setGoogleData] = useState<GoogleIntegrationsResp | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ days: range.replace('d', '') });
        if (platform !== 'all') params.set('platform', platform);
        const res = await fetch(`/api/feedback/stats?${params.toString()}`);
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [range, platform]);

  // Google Business Profile bağlantı görünürlüğü — superadmin only.
  // Endpoint zaten role gate ediyor, manager rolü 403 alır ve burada
  // sessizce gizlenir (kasıtlı; aşağıdaki section render guard'ı
  // boş `googleData?.integrations` durumunda hiçbir şey göstermez).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGoogleLoading(true);
      setGoogleError(null);
      try {
        const res = await fetch('/api/admin/google-integrations');
        if (cancelled) return;
        if (res.status === 403) {
          // Manager / non-superadmin — sessizce gizle.
          setGoogleData(null);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as GoogleIntegrationsResp;
        setGoogleData(data);
      } catch (err) {
        if (cancelled) return;
        setGoogleError(err instanceof Error ? err.message : 'unknown');
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = stats?.totalCount ?? 0;
  const avg = stats?.avgRating ?? 0;

  const distribution = stats?.distribution ?? {};
  const distSum = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
  const promoters = Number(distribution['5']) || 0;
  const detractors = (Number(distribution['1']) || 0) + (Number(distribution['2']) || 0);
  const promoterPct = Math.round((promoters / distSum) * 100);
  const detractorPct = Math.round((detractors / distSum) * 100);
  const passivePct = Math.max(0, 100 - promoterPct - detractorPct);
  const nps = promoterPct - detractorPct;
  const npsTone: 'lime' | 'neutral' | 'red' = nps >= 50 ? 'lime' : nps >= 0 ? 'neutral' : 'red';
  const npsLabel =
    nps >= 70
      ? isTr ? 'Mükemmel' : 'Excellent'
      : nps >= 30
      ? isTr ? 'İyi' : 'Good'
      : nps >= 0
      ? isTr ? 'Ortalama' : 'Average'
      : isTr ? 'Dikkat' : 'At risk';

  // §38.49 — useMemo to keep `trends` reference stable across renders;
  // useMemo dep below depends on it (otherwise re-fires every render).
  const trends = useMemo(() => stats?.trends ?? [], [stats]);
  const trendPath = useMemo(() => buildTrendPath(trends), [trends]);

  const ratingRows = [5, 4, 3, 2, 1].map((r) => {
    const count = Number(distribution[String(r)] ?? 0);
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    return { r, count, pct };
  });

  const platformRows = useMemo(
    () =>
      (stats?.platformDistribution ?? [])
        .map((p) => ({
          key: p.platform || 'unspecified',
          label: p.label,
          count: p.count,
          color: PLATFORM_COLORS[p.platform ?? 'unspecified'] || PLATFORM_COLORS.unspecified,
        }))
        .sort((a, b) => b.count - a.count),
    [stats?.platformDistribution],
  );

  const wordCloud = stats?.wordCloud ?? [];
  const maxWordValue = wordCloud.length > 0 ? wordCloud[0].value : 1;

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-4 overflow-hidden">
      <PageHeader
        eyebrow={isTr ? 'ANALİZ' : 'ANALYTICS'}
        title={isTr ? 'Analitik & raporlama' : 'Analytics & reporting'}
        description={
          isTr
            ? 'Aralık seçici ile günlük, haftalık ve aylık metrikleri karşılaştır. CSV export ile raporu dışarı aktar.'
            : 'Compare daily, weekly, and monthly metrics with the range picker. Export reports as CSV.'
        }
        actions={
          <>
            <div className="grid grid-cols-3 rounded-lg border border-[#EDEDED] bg-white p-0.5 sm:inline-flex">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`pulse-eyebrow rounded-md px-3 py-1.5 transition-colors ${
                    range === r ? 'bg-[#0A0A0A] text-white' : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPlatform('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  platform === 'all'
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={platform === 'all'}
              >
                {isTr ? 'Tümü' : 'All'}
              </button>
              {PLATFORM_OPTIONS.map((pid) => {
                const active = platform === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setPlatform(active ? 'all' : pid)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                      active
                        ? 'border-[#0A0A0A] bg-white text-[#0A0A0A]'
                        : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                    }`}
                    aria-pressed={active}
                    title={PLATFORMS[pid].label}
                  >
                    <PlatformChip id={pid} size={14} />
                    <span className="hidden md:inline">{PLATFORMS[pid].label}</span>
                  </button>
                );
              })}
            </div>
            <ExportReportButton
              label={isTr ? 'CSV indir' : 'Export CSV'}
              format="csv"
              range={range}
            />
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          {/* ─── KPI ROW ─── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={isTr ? 'TOPLAM YORUM' : 'TOTAL REVIEWS'}
              value={total.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
              icon={<BarChart3 size={14} />}
            />
            <StatCard
              label={isTr ? 'ORTALAMA PUAN' : 'AVERAGE RATING'}
              value={avg.toFixed(1)}
              icon={<Star size={14} className="fill-[#C6F24E] text-[#C6F24E]" />}
            />
            <StatCard
              label="NPS"
              value={nps.toString()}
              accent={npsTone}
              icon={<TrendingUp size={14} />}
            />
            <StatCard
              label={isTr ? 'DÖNEM' : 'PERIOD'}
              value={range.toUpperCase()}
              icon={<BarChart3 size={14} />}
            />
          </div>

          {/* ─── DARK NPS SCOREBOARD ─── */}
          <section className="overflow-hidden rounded-xl bg-[#0A0A0A] p-5 text-white shadow-lg sm:p-7">
            <div className="grid min-w-0 gap-6 xl:grid-cols-[1.35fr_1fr]">
              <div className="min-w-0">
                <p className="pulse-eyebrow text-white/60">
                  {isTr ? `NPS SKORU · ${range.toUpperCase()}` : `NPS SCORE · ${range.toUpperCase()}`}
                </p>
                <p className="mt-3 font-heading text-[72px] font-medium leading-none tracking-tight text-[#C6F24E] sm:text-[104px]">
                  {nps}
                </p>
                <p className="mt-3 max-w-[680px] text-[14px] leading-relaxed text-white/75">
                  {npsLabel}
                  {trends.length >= 2 && (() => {
                    const first = trends[0].count;
                    const last = trends[trends.length - 1].count;
                    const delta = first === 0 ? 0 : Math.round(((last - first) / Math.max(first, 1)) * 100);
                    if (delta === 0) return null;
                    const arrow = delta > 0 ? '↑' : '↓';
                    const color = delta > 0 ? '#C6F24E' : '#FB7185';
                    return (
                      <>
                        {' · '}
                        <span style={{ color }}>
                          {arrow} {delta > 0 ? '+' : ''}{delta}%
                        </span>{' '}
                        {isTr ? 'dönem başından' : 'since period start'}
                      </>
                    );
                  })()}
                </p>

                <div className="mt-6 space-y-2.5">
                  <NpsBar
                    label={isTr ? 'Destekçi (5★)' : 'Promoters (5★)'}
                    pct={promoterPct}
                    color="#C6F24E"
                    textColor="text-[#0A0A0A]"
                    badgeBg="bg-[#C6F24E]"
                  />
                  <NpsBar
                    label={isTr ? 'Nötr (3-4★)' : 'Passives (3-4★)'}
                    pct={passivePct}
                    color="#F5F5F5"
                    textColor="text-[#0A0A0A]"
                    badgeBg="bg-white/80"
                  />
                  <NpsBar
                    label={isTr ? 'Eleştiren (1-2★)' : 'Detractors (1-2★)'}
                    pct={detractorPct}
                    color="#FB7185"
                    textColor="text-white"
                    badgeBg="bg-[#FB7185]"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <p className="pulse-eyebrow text-white/60">{isTr ? 'TREND · SON 7 GÜN' : 'TREND · LAST 7 DAYS'}</p>
                {trends.length === 0 ? (
                  <p className="mt-8 text-[13px] text-white/60">{isTr ? 'Trend verisi yok' : 'No trend data'}</p>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/5 p-4">
                    <svg viewBox="0 0 280 100" className="h-24 w-full" preserveAspectRatio="none">
                      <path d={trendPath.fill} fill="rgba(198, 242, 78, 0.18)" />
                      <path d={trendPath.stroke} stroke="#C6F24E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      {trendPath.points.map((pt, i) => (
                        <circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
                      ))}
                    </svg>
                    <div className="mt-2 flex min-w-0 items-center justify-between gap-3 text-[10px] text-white/50">
                      <span className="truncate">{trends[0]?.date}</span>
                      <span className="truncate text-right">{trends[trends.length - 1]?.date}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border border-[#EDEDED] bg-white p-4 sm:grid-cols-[auto_1fr] sm:p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]">
              <HelpCircle size={17} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[#0A0A0A]">
                {isTr ? 'NPS skoru nedir?' : 'What is NPS?'}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">
                {isTr
                  ? 'NPS, müşterilerin işletmeyi tavsiye etme eğilimini ölçer. Bu panelde 5 yıldız destekçi, 3-4 yıldız nötr, 1-2 yıldız eleştiren kabul edilir; skor destekçi yüzdesinden eleştiren yüzdesi çıkarılarak hesaplanır.'
                  : 'NPS measures how likely customers are to recommend the business. In this panel, 5 stars count as promoters, 3-4 stars as passive, and 1-2 stars as detractors; the score is promoter percentage minus detractor percentage.'}
              </p>
            </div>
          </section>

          {/* ─── RATING + PLATFORM ─── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-xl border border-[#EDEDED] bg-white p-5">
              <h2 className="pulse-eyebrow text-[#737373]">{isTr ? 'PUAN DAĞILIMI' : 'RATING DISTRIBUTION'}</h2>
              <div className="mt-4 space-y-2">
                {ratingRows.map((row) => (
                  <div key={row.r} className="grid grid-cols-[40px_minmax(0,1fr)_72px] items-center gap-2 sm:gap-3">
                    <span className="text-[13px] font-medium text-[#0A0A0A]">{row.r} ★</span>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-[#F5F5F5]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg"
                        style={{
                          width: `${row.pct}%`,
                          backgroundColor: row.r >= 4 ? '#C6F24E' : row.r === 3 ? '#F59E0B' : '#FB7185',
                        }}
                      />
                    </div>
                    <span className="text-right text-[12px] text-[#525252] tabular-nums">{row.count} · {row.pct}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded-xl border border-[#EDEDED] bg-white p-5">
              <h2 className="pulse-eyebrow text-[#737373]">{isTr ? 'PLATFORM DAĞILIMI' : 'PLATFORM SPLIT'}</h2>
              {platformRows.length === 0 ? (
                <p className="mt-6 text-[13px] text-[#737373]">{isTr ? 'Veri yok' : 'No data'}</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {platformRows.map((p) => {
                    const pct = total === 0 ? 0 : Math.round((p.count / total) * 100);
                    return (
                      <div key={p.key} className="grid grid-cols-[88px_minmax(0,1fr)_72px] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)_72px] sm:gap-3">
                        <span className="truncate text-[13px] font-medium text-[#0A0A0A]">{p.label}</span>
                        <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-[#F5F5F5]">
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg"
                            style={{ width: `${pct}%`, backgroundColor: p.color }}
                          />
                        </div>
                        <span className="text-right text-[12px] text-[#525252] tabular-nums">{p.count} · {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ─── TAG CLOUD ─── */}
          <section className="min-w-0 rounded-xl border border-[#EDEDED] bg-white p-5 sm:p-6">
            <h2 className="pulse-eyebrow text-[#737373]">
              {isTr ? 'YORUMLARDAN ÖNE ÇIKAN KELİMELER' : 'TOP KEYWORDS FROM REVIEWS'}
            </h2>
            {wordCloud.length === 0 ? (
              <p className="mt-6 text-[13px] text-[#737373]">
                {isTr ? 'Henüz anlamlı kelime toplanmadı.' : 'No significant keywords captured yet.'}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {wordCloud.slice(0, 24).map((w) => {
                  const size = 12 + Math.round((w.value / Math.max(maxWordValue, 1)) * 10);
                  return (
                    <span
                      key={w.text}
                      className="rounded-full bg-[#EAF9B8] px-3 py-1 font-medium text-[#0A0A0A]"
                      style={{ fontSize: `${size}px` }}
                    >
                      {w.text} <span className="ml-1 text-[#525252]">· {w.value}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Süperadmin: Google Business Profile bağlantı görünürlüğü.
          Endpoint manager rolüne 403 dönüyor → setGoogleData(null) → bu
          section hiç render edilmez. Sadece superadmin görür. */}
      {googleData && googleData.integrations.length > 0 && (
        <section className="mt-6 min-w-0 rounded-xl border border-[#EDEDED] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
                <Globe2 size={14} />
              </span>
              <div>
                <h2 className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'GOOGLE BUSINESS BAĞLANTILARI' : 'GOOGLE BUSINESS CONNECTIONS'}
                </h2>
                <p className="text-[12px] text-[#525252]">
                  {isTr
                    ? `${googleData.meta.total} bağlantı · ${googleData.meta.withRefreshToken} aktif refresh token · ${googleData.meta.expiredAccess} access token süresi dolmuş`
                    : `${googleData.meta.total} connections · ${googleData.meta.withRefreshToken} active refresh tokens · ${googleData.meta.expiredAccess} expired access tokens`}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#0A0A0A] px-2 py-1 text-[10px] font-semibold text-[#C6F24E]">
              {isTr ? 'SADECE SÜPERADMIN' : 'SUPERADMIN ONLY'}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#EDEDED] text-[10px] uppercase tracking-wider text-[#737373]">
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Bağlantı sahibi' : 'Connected by'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Token durumu' : 'Token status'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Restoran(lar)' : 'Restaurant(s)'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Seçili konum' : 'Selected location'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Son sync' : 'Last sync'}</th>
                </tr>
              </thead>
              <tbody>
                {googleData.integrations.map((row) => {
                  const tokenLabel = !row.hasRefreshToken
                    ? (isTr ? 'Reauth gerek' : 'Reauth required')
                    : row.accessTokenExpired
                      ? (isTr ? 'Yenileme bekliyor' : 'Pending refresh')
                      : (isTr ? 'Aktif' : 'Active');
                  const tokenTone = !row.hasRefreshToken
                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                    : row.accessTokenExpired
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-[#DCFCE7] text-[#166534]';
                  const tokenIcon = !row.hasRefreshToken
                    ? <AlertTriangle size={11} />
                    : row.accessTokenExpired
                      ? <Loader2 size={11} />
                      : <CheckCircle2 size={11} />;
                  return row.restaurants.length === 0 ? (
                    <tr key={row.integrationId} className="border-b border-[#F5F5F5]">
                      <td className="py-3 pr-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#0A0A0A]">{row.ownerEmail ?? row.integrationOwner}</span>
                          {row.ownerEmail && (
                            <span className="text-[10px] text-[#737373]">{row.integrationOwner}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tokenTone}`}>
                          {tokenIcon}
                          {tokenLabel}
                        </span>
                      </td>
                      <td className="py-3 pr-3 italic text-[#737373]" colSpan={3}>
                        {isTr ? '— Henüz hiçbir restorana konum seçilmemiş —' : '— No location selected for any restaurant yet —'}
                      </td>
                    </tr>
                  ) : (
                    row.restaurants.map((rest, idx) => (
                      <tr key={`${row.integrationId}-${rest.restaurantId}`} className="border-b border-[#F5F5F5]">
                        {idx === 0 ? (
                          <>
                            <td className="py-3 pr-3" rowSpan={row.restaurants.length}>
                              <div className="flex flex-col">
                                <span className="font-medium text-[#0A0A0A]">{row.ownerEmail ?? row.integrationOwner}</span>
                                {row.ownerEmail && (
                                  <span className="text-[10px] text-[#737373]">{row.integrationOwner}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-3" rowSpan={row.restaurants.length}>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tokenTone}`}>
                                {tokenIcon}
                                {tokenLabel}
                              </span>
                            </td>
                          </>
                        ) : null}
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#0A0A0A]">{rest.restaurantName}</span>
                            {rest.ownerEmail && rest.ownerEmail !== row.ownerEmail && (
                              <span className="text-[10px] text-[#737373]">{rest.ownerEmail}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-[#525252]">
                          {rest.selectedLocation?.title ?? <span className="italic text-[#737373]">—</span>}
                        </td>
                        <td className="py-3 pr-3 text-[#737373] tabular-nums">
                          {row.syncedAt ? new Date(row.syncedAt).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          }) : (isTr ? 'Hiç' : 'Never')}
                        </td>
                      </tr>
                    ))
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] text-[#737373]">
            {isTr
              ? 'Refresh token & access token detayları sadece bu görünümde özetlenir; ham token değerleri istemciye hiçbir zaman dönmez (KVKK + güvenlik). "Reauth gerek" satırları ilgili owner\'ın yeniden bağlanması gerektiğini gösterir.'
              : 'Refresh & access token details are summarised here only; raw token values are never returned to the client (KVKK + security). "Reauth required" rows mean the owner needs to reconnect Google.'}
          </p>
        </section>
      )}

      {googleLoading && !googleData && (
        <section className="mt-6 flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white p-5 text-[12px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? 'Google Business bağlantıları yükleniyor…' : 'Loading Google Business connections…'}
        </section>
      )}

      {googleError && (
        <section className="mt-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-[12px] text-[#991B1B]">
          {isTr ? `Google Business bağlantıları alınamadı (${googleError})` : `Could not load Google Business connections (${googleError})`}
        </section>
      )}

      {googleData && googleData.integrations.length === 0 && (
        <section className="mt-6 rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-5 text-center">
          <Globe2 size={20} className="mx-auto text-[#737373]" />
          <p className="mt-2 text-[13px] font-medium text-[#0A0A0A]">
            {isTr ? 'Henüz Google Business Profile bağlayan kimse yok.' : 'No one has connected Google Business Profile yet.'}
          </p>
          <p className="mt-1 text-[11px] text-[#737373]">
            {isTr
              ? 'İlk owner OAuth flow\'unu tamamladığında bu tablo doldurulacak.'
              : 'This table will populate once the first owner completes the OAuth flow.'}
          </p>
        </section>
      )}

      {/* Stage A5 §38.97 — cross-workspace BI section. sm:hidden olarak gizli
          değil, mobile owner-relevant olmadığı için section kendisi
          `hidden sm:block` ile gizleniyor. Tablet + desktop'ta görünür. */}
      <AdminBiSection />
    </div>
  );
}

function NpsBar({
  label,
  pct,
  color,
  textColor,
  badgeBg,
}: {
  label: string;
  pct: number;
  color: string;
  textColor: string;
  badgeBg: string;
}) {
  return (
    <div>
      <div className="flex min-w-0 items-center justify-between gap-3 text-[12px]">
        <span className="min-w-0 truncate text-white/75">{label}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeBg} ${textColor}`}>{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function buildTrendPath(trends: TrendPoint[]): {
  stroke: string;
  fill: string;
  points: { x: number; y: number }[];
} {
  if (trends.length === 0) return { stroke: '', fill: '', points: [] };
  const w = 280;
  const h = 100;
  const pad = 6;
  const maxCount = Math.max(...trends.map((t) => t.count), 1);
  const step = trends.length > 1 ? (w - 2 * pad) / (trends.length - 1) : 0;
  const points = trends.map((t, i) => ({
    x: pad + i * step,
    y: h - pad - (t.count / maxCount) * (h - 2 * pad),
  }));
  const stroke = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fill = `${stroke} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;
  return { stroke, fill, points };
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: 'lime' | 'neutral' | 'red';
}) {
  const tone =
    accent === 'lime'
      ? 'bg-[#EAF9B8] text-[#0A0A0A]'
      : accent === 'red'
      ? 'bg-red-50 text-red-700'
      : 'bg-[#F5F5F5] text-[#0A0A0A]';
  return (
    <div className="min-w-0 rounded-xl border border-[#EDEDED] bg-white p-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="pulse-eyebrow min-w-0 truncate text-[#737373]">{label}</p>
        {icon && <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</span>}
      </div>
      <p className="mt-3 truncate font-heading text-[28px] font-medium tracking-tight text-[#0A0A0A]">
        {value}
      </p>
    </div>
  );
}
