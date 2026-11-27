'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlatformDailyPoint } from '@/lib/analytics-platform-trend';
import { SERIES_META } from './trend-series';

// The recharts body of the platform trend chart. Loaded with next/dynamic
// (ssr: false) from MainTrendChart: the chart only ever renders on the client
// after MeasuredChart has a size, so recharts (~113 KB gzip) is fetched after
// first paint instead of being part of the dashboard's initial JavaScript.

interface TooltipRow {
  payload?: PlatformDailyPoint;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: TooltipRow[];
  isTr: boolean;
}

export interface TrendChartCanvasProps {
  width: number;
  height: number;
  points: PlatformDailyPoint[];
  isTr: boolean;
  tickInterval: number;
}

function MainTrendTooltip({ active, payload, isTr }: TooltipContentProps) {
  if (!active) return null;
  const row = payload?.find((item) => item.payload)?.payload;
  if (!row) return null;
  // Black tooltip (Fintora): date, a coloured dot per platform, total.
  return (
    <div className="pn-chart-tip">
      <div className="font-medium tabular-nums">{row.date}</div>
      <div className="mt-1.5 grid min-w-[180px] gap-1">
        {SERIES_META.map((s) => {
          const value = row[s.key];
          if (value === 0) return null;
          return (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="pn-legend-dot"
                  style={{ background: s.key === 'google' ? '#FFFFFF' : s.swatch }}
                />
                {isTr ? s.labelTr : s.labelEn}
              </span>
              <span className="tabular-nums">{value}</span>
            </div>
          );
        })}
        <div className="mt-0.5 flex items-center justify-between gap-4 border-t border-white/15 pt-1.5">
          <span className="pn-chart-tip-muted">{isTr ? 'Toplam' : 'Total'}</span>
          <span className="font-medium tabular-nums">{row.total}</span>
        </div>
      </div>
    </div>
  );
}

export default function TrendChartCanvas({
  width,
  height,
  points,
  isTr,
  tickInterval,
}: TrendChartCanvasProps) {
  return (
    <ComposedChart
      width={width}
      height={height}
      data={points}
      margin={{ top: 18, right: 20, left: 0, bottom: 8 }}
    >
      <defs>
        <linearGradient id="mainTrendBuazeQr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#78FC90" stopOpacity={0.32} />
          <stop offset="100%" stopColor="#78FC90" stopOpacity={0.04} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="#EBEBEB" strokeDasharray="3 5" />
      <XAxis
        dataKey="date"
        axisLine={false}
        tickLine={false}
        interval={tickInterval}
        tick={{ fill: '#9A9A9A', fontSize: 12 }}
        dy={8}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#9A9A9A', fontSize: 12 }}
        width={32}
      />
      <Tooltip
        cursor={{ stroke: '#111110', strokeWidth: 1, strokeDasharray: '3 4' }}
        content={({ active, payload }) => (
          <MainTrendTooltip
            active={active}
            payload={payload as unknown as TooltipRow[] | undefined}
            isTr={isTr}
          />
        )}
      />
      {/* Stacked soft areas with a line on top of each band (Fintora
          "Transaction Performance"): Google ink, Tripadvisor grey, Buaze QR
          black with a gradient, other light green. */}
      <Area
        type="monotone"
        dataKey="google"
        stackId="trend"
        stroke="#111110"
        strokeWidth={1.75}
        fill="#111110"
        fillOpacity={0.1}
        isAnimationActive={false}
      />
      <Area
        type="monotone"
        dataKey="tripadvisor"
        stackId="trend"
        stroke="#9A9A9A"
        strokeWidth={1.5}
        fill="#9A9A9A"
        fillOpacity={0.14}
        isAnimationActive={false}
      />
      <Area
        type="monotone"
        dataKey="buazeQr"
        stackId="trend"
        stroke="#78FC90"
        strokeWidth={2}
        fill="url(#mainTrendBuazeQr)"
        fillOpacity={1}
        activeDot={{ r: 5, fill: '#78FC90', stroke: '#FFFFFF', strokeWidth: 2 }}
        isAnimationActive={false}
      />
      <Area
        type="monotone"
        dataKey="other"
        stackId="trend"
        stroke="#111110"
        strokeWidth={1.5}
        fill="#111110"
        fillOpacity={0.16}
        isAnimationActive={false}
      />
    </ComposedChart>
  );
}
