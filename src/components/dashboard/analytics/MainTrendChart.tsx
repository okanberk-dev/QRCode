'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MeasuredChart } from '@/components/charts/MeasuredChart';
import {
  aggregatePlatformTotals,
  type PlatformDailyPoint,
} from '@/lib/analytics-platform-trend';

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

interface TooltipRow {
  payload?: PlatformDailyPoint;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: TooltipRow[];
  isTr: boolean;
}

const SERIES_META: Array<{
  key: keyof Pick<PlatformDailyPoint, 'google' | 'tripadvisor' | 'buazeQr' | 'other'>;
  labelTr: string;
  labelEn: string;
  /** Stack rendering color (Pulse §11 palette). */
  fill: string;
  /** Legend chip color. */
  swatch: string;
  /** Stack opacity (0-1). */
  fillOpacity: number;
}> = [
  {
    key: 'google',
    labelTr: 'Google',
    labelEn: 'Google',
    fill: '#0A0A0A',
    swatch: '#0A0A0A',
    fillOpacity: 0.85,
  },
  {
    key: 'tripadvisor',
    labelTr: 'Tripadvisor',
    labelEn: 'Tripadvisor',
    fill: '#737373',
    swatch: '#737373',
    fillOpacity: 0.7,
  },
  {
    key: 'buazeQr',
    labelTr: 'Buaze QR',
    labelEn: 'Buaze QR',
    fill: '#C6F24E',
    swatch: '#C6F24E',
    fillOpacity: 0.9,
  },
  {
    key: 'other',
    labelTr: 'Diğer',
    labelEn: 'Other',
    fill: '#E5E5E5',
    swatch: '#A3A3A3',
    fillOpacity: 0.85,
  },
];

function MainTrendTooltip({ active, payload, isTr }: TooltipContentProps) {
  if (!active) return null;
  const row = payload?.find((item) => item.payload)?.payload;
  if (!row) return null;
  return (
    <div className="rounded-[12px] border border-[#EDEDED] bg-white px-3 py-2.5 shadow-[0_16px_40px_rgba(10,10,10,0.12)]">
      <div className="bz-mono text-[10.5px] font-semibold text-[#0A0A0A]">
        {row.date}
      </div>
      <div className="mt-2 grid min-w-[180px] gap-1.5 text-[11.5px] text-[#525252]">
        {SERIES_META.map((s) => {
          const value = row[s.key];
          if (value === 0) return null;
          return (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-sm"
                  style={{ background: s.swatch }}
                />
                {isTr ? s.labelTr : s.labelEn}
              </span>
              <span className="bz-mono tabular-nums text-[#0A0A0A]">{value}</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-4 border-t border-[#F5F5F5] pt-1.5 mt-0.5">
          <span className="font-semibold">{isTr ? 'Toplam' : 'Total'}</span>
          <span className="bz-mono tabular-nums font-semibold text-[#0A0A0A]">{row.total}</span>
        </div>
      </div>
    </div>
  );
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
          <ComposedChart
            width={width}
            height={height}
            data={points}
            margin={{ top: 18, right: 20, left: 0, bottom: 8 }}
          >
            <defs>
              <linearGradient id="mainTrendBuazeQr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6F24E" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#C6F24E" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EDEDED" strokeDasharray="0" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              tick={{ fill: '#A3A3A3', fontSize: 10, fontWeight: 600 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#A3A3A3', fontSize: 10, fontWeight: 600 }}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: '#0A0A0A', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={({ active, payload }) => (
                <MainTrendTooltip
                  active={active}
                  payload={payload as unknown as TooltipRow[] | undefined}
                  isTr={isTr}
                />
              )}
            />
            {/* Stacked area: Google (graphite, base) -> Tripadvisor (muted) ->
                Buaze QR (lime, accent) -> Other (n200 top). Lower stackId
                items render below upper ones in recharts. */}
            <Area
              type="monotone"
              dataKey="google"
              stackId="trend"
              stroke="#0A0A0A"
              strokeWidth={1}
              fill="#0A0A0A"
              fillOpacity={0.85}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="tripadvisor"
              stackId="trend"
              stroke="#737373"
              strokeWidth={1}
              fill="#737373"
              fillOpacity={0.7}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="buazeQr"
              stackId="trend"
              stroke="#A8D62E"
              strokeWidth={1.5}
              fill="url(#mainTrendBuazeQr)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="other"
              stackId="trend"
              stroke="#A3A3A3"
              strokeWidth={1}
              fill="#E5E5E5"
              fillOpacity={0.85}
              isAnimationActive={false}
            />
          </ComposedChart>
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
      aria-label={isTr ? '30 günlük yorum hacmi trendi' : '30-day review volume trend'}
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
