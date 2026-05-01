'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, HelpCircle, Loader2, Star, TrendingUp } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import ExportReportButton from '@/components/dashboard/ExportReportButton';
import { PageHeader, PlatformChip, PLATFORMS, type PlatformId } from '@/components/ui';

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

  const trends = stats?.trends ?? [];
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
