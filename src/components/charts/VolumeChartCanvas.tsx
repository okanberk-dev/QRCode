'use client';

/**
 * Recharts body of VolumeChart, loaded on demand (next/dynamic) so the
 * chart library is not in the page's first JS (CLAUDE.md §56, §58).
 */
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { VolumePoint } from '@/lib/volume-series';

export const VOLUME_COLORS = { feedback: '#000000', redirects: '#5D3EBC' } as const;

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload?: VolumePoint }>;
  isTr: boolean;
}

function VolumeTooltip({ active, payload, isTr }: TipProps) {
  const p = active ? payload?.find((x) => x.payload)?.payload : undefined;
  if (!p) return null;
  return (
    <div className="rounded-[10px] border border-pn-line bg-white px-3 py-2.5 text-[12px] text-[#404040] shadow-[0_12px_32px_rgba(10,10,10,0.12)]">
      <div className="font-medium text-pn-ink">{p.longLabel}</div>
      <div className="mt-1.5 grid min-w-[170px] gap-1">
        <div className="flex justify-between gap-4">
          <span>{isTr ? 'Puan' : 'Ratings'}</span>
          <span className="tabular-nums font-medium text-pn-ink">{p.total}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-[8px]" style={{ background: VOLUME_COLORS.redirects }} />
            {isTr ? 'Platforma yönlendirme' : 'Sent to a platform'}
          </span>
          <span className="tabular-nums">{p.redirects}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-[8px]" style={{ background: VOLUME_COLORS.feedback }} />
            {isTr ? 'Geri bildirim' : 'Feedback'}
          </span>
          <span className="tabular-nums">{p.feedback}</span>
        </div>
        {p.avgRating !== null && (
          <div className="flex justify-between gap-4 border-t border-pn-line pt-1">
            <span>{isTr ? 'Ortalama puan' : 'Average rating'}</span>
            <span className="tabular-nums">{p.avgRating.toLocaleString(isTr ? 'tr-TR' : 'en-US')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VolumeChartCanvas({
  width,
  height,
  points,
  isTr,
}: {
  width: number;
  height: number;
  points: VolumePoint[];
  isTr: boolean;
}) {
  const tickInterval = points.length <= 10 ? 0 : Math.ceil(points.length / 7) - 1;
  const barSize = Math.max(3, Math.min(18, Math.floor((width - 40) / Math.max(points.length, 1)) - 3));
  return (
    <BarChart width={width} height={height} data={points} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap={1}>
      <CartesianGrid vertical={false} stroke="#F0F0F0" />
      <XAxis
        dataKey="label"
        axisLine={false}
        tickLine={false}
        interval={tickInterval}
        tick={{ fill: '#737373', fontSize: 11 }}
        dy={6}
      />
      <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={32} tick={{ fill: '#737373', fontSize: 11 }} />
      <Tooltip cursor={{ fill: 'rgba(10,10,10,0.04)' }} content={({ active, payload }) => (
        <VolumeTooltip active={active} payload={payload as unknown as TipProps['payload']} isTr={isTr} />
      )} />
      <Bar dataKey="feedback" stackId="v" fill={VOLUME_COLORS.feedback} barSize={barSize} radius={[999, 999, 999, 999]} isAnimationActive={false} />
      <Bar dataKey="redirects" stackId="v" fill={VOLUME_COLORS.redirects} barSize={barSize} radius={[999, 999, 999, 999]} isAnimationActive={false} />
    </BarChart>
  );
}
