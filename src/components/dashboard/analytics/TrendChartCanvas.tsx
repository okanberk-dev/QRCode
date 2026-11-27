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
  return (
    <div className="rounded-[12px] border border-pn-line bg-white px-3 py-2.5 shadow-[0_16px_40px_rgba(10,10,10,0.12)]">
      <div className="tabular-nums text-[12px] font-medium text-pn-ink">
        {row.date}
      </div>
      <div className="mt-2 grid min-w-[180px] gap-1.5 text-[12px] text-[#525252]">
        {SERIES_META.map((s) => {
          const value = row[s.key];
          if (value === 0) return null;
          return (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-[8px]"
                  style={{ background: s.swatch }}
                />
                {isTr ? s.labelTr : s.labelEn}
              </span>
              <span className="tabular-nums tabular-nums text-pn-ink">{value}</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-4 border-t border-pn-line pt-1.5 mt-0.5">
          <span className="font-medium">{isTr ? 'Toplam' : 'Total'}</span>
          <span className="tabular-nums tabular-nums font-medium text-pn-ink">{row.total}</span>
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
          <stop offset="0%" stopColor="#5D3EBC" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#5D3EBC" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="#EBEBEB" strokeDasharray="0" />
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
        cursor={{ stroke: '#000000', strokeWidth: 1, strokeDasharray: '3 3' }}
        content={({ active, payload }) => (
          <MainTrendTooltip
            active={active}
            payload={payload as unknown as TooltipRow[] | undefined}
            isTr={isTr}
          />
        )}
      />
      {/* Stacked area: Google (graphite, base) -> Tripadvisor (muted) ->
          Buaze QR (purple, accent) -> Other (n200 top). Lower stackId
          items render below upper ones in recharts. */}
      <Area
        type="monotone"
        dataKey="google"
        stackId="trend"
        stroke="#000000"
        strokeWidth={1}
        fill="#000000"
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
        stroke="#5D3EBC"
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
  );
}
