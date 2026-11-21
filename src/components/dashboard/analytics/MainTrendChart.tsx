'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MeasuredChart } from '@/components/charts/MeasuredChart';
import {
  aggregatePlatformTotals,
  type PlatformDailyPoint,
} from '@/lib/analytics-platform-trend';
import { SERIES_META } from './trend-series';

// recharts lives in TrendChartCanvas and loads after first paint. Until it
// arrives the chart frame shows the same placeholder MeasuredChart renders
// before it has a size (the server HTML never contained the chart).
const TrendChartCanvas = dynamic(() => import('./TrendChartCanvas'), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-xl bg-[#FAFAFA]" aria-hidden="true" />,
});

// Stage 66 §38.147 — HANDOFF AnalyticsDesktop main chart 30-day stacked
// area (.design-owner-2026/page-analytics.jsx line 358-460 birebir).
// 4-series stacked area: Google (graphite) + Tripadvisor (muted) +
// Buaze QR (lime, Pulse signature accent) + Other (n200 subtle bucket).
//
// Crosshair tooltip: hover'da dikey dashed line + per-series breakdown
// (PulseTrendChart paterni reuse — recharts Tooltip cursor strokeDasharray).
//
// Metric toggle (HANDOFF Volume/Rating/Reply%) bilinçli SKIP edildi:
// - Rating per-day daily noise (yetersiz örneklem); per-week PulseTrendChart'ta var.
// - Reply % (Yanıt Oranı) KPI grid'de var (TOPLAM YORUM card subtitle).
// - Volume tek mantıklı 30-day metric — sade + okunabilir.
//
// 'use client' — recharts hydrate. Server-side initial pre-render minimal HTML.

export interface MainTrendChartProps {
  /** Daily platform breakdown — buildPlatformDailyTrend output. */
  points: PlatformDailyPoint[];
  isTr?: boolean;
}

export interface PlatformTrendChartBodyProps {
  points: PlatformDailyPoint[];
  isTr?: boolean;
  heightClassName?: string;
  emptyClassName?: string;
}

export function PlatformTrendChartBody({
  points,
  isTr = true,
  heightClassName = 'h-[280px] w-full min-w-[520px] sm:h-[320px]',
  emptyClassName = 'mt-5 rounded-[14px] border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-5 py-10 text-center',
}: PlatformTrendChartBodyProps) {
  const totals = useMemo(() => aggregatePlatformTotals(points), [points]);
  const hasData = totals.total > 0;

  // X-axis tick interval — günlük 30-day chart için sparse label (her 5 günde
  // bir) overflow önler. CLAUDE.md §13.8 mobile chart pattern reuse.
  const tickInterval = points.length <= 7 ? 0 : points.length <= 30 ? 4 : Math.floor(points.length / 6);

  if (!hasData) {
    return (
      <div className={emptyClassName}>
        <div className="pulse-eyebrow text-[10.5px] text-[#737373]">
          {isTr ? 'VERİ BEKLENİYOR' : 'WAITING FOR DATA'}
        </div>
        <p className="mx-auto mt-2 max-w-[440px] text-[13px] leading-6 text-[#525252]">
          {isTr
            ? 'Bu pencerede yorum yok. Yeni yorumlar geldikçe günlük platform dağılımı burada oluşur.'
            : 'No reviews in this window. Daily platform breakdown appears as new reviews arrive.'}
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-2 mt-5 overflow-x-auto no-scrollbar px-2 sm:mx-0 sm:px-0">
      <MeasuredChart className={heightClassName}>
        {({ width, height }) => (
          <TrendChartCanvas
            width={width}
            height={height}
            points={points}
            isTr={isTr}
            tickInterval={tickInterval}
          />
        )}
      </MeasuredChart>
    </div>
  );
}

export function MainTrendChart({ points, isTr = true }: MainTrendChartProps) {
  const totals = useMemo(() => aggregatePlatformTotals(points), [points]);

  return (
    <section
      className="bz-card p-5 sm:p-6"
      aria-label={
        isTr
          ? `${points.length} günlük yorum hacmi trendi`
          : `${points.length}-day review volume trend`
      }
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="pulse-eyebrow text-[10.5px] text-[#737373]">
            {isTr ? 'YORUM HACMİ TRENDİ' : 'REVIEW VOLUME TREND'}
          </h3>
          <div className="bz-h-tight mt-1 text-[18px]">
            {isTr ? `${points.length} günlük platform dağılımı` : `${points.length}-day platform breakdown`}
          </div>
          <div className="bz-mono mt-1 text-[11px] text-[#737373] tabular-nums">
            {isTr
              ? `Toplam ${totals.total.toLocaleString('tr-TR')} yorum`
              : `${totals.total.toLocaleString('en-US')} reviews total`}
          </div>
        </div>
        {/* Legend — sağda chip-style with platform totals */}
        <div className="inline-flex flex-wrap items-center gap-3">
          {SERIES_META.map((s) => {
            const total = totals[s.key];
            if (total === 0) return null;
            return (
              <div key={s.key} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-sm"
                  style={{ background: s.swatch, boxShadow: s.key === 'buazeQr' ? '0 0 6px rgba(198,242,78,0.6)' : 'none' }}
                />
                <span className="text-[11.5px] text-[#525252] font-medium">
                  {isTr ? s.labelTr : s.labelEn}
                </span>
                <span className="bz-mono tabular-nums text-[11px] text-[#0A0A0A] font-semibold">
                  {total}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      <PlatformTrendChartBody points={points} isTr={isTr} />
    </section>
  );
}

export default MainTrendChart;
