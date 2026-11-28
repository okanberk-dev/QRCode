'use client';

/**
 * Recharts body of VolumeChart, loaded on demand (next/dynamic) so the
 * chart library is not in the page's first JS (CLAUDE.md §56, §58).
 *
 * Fintora "Transaction Volume" look (docs/design/DASHBOARD_DESIGN.md §5.9):
 * thin round bars; the active day (hovered, else the latest day with
 * ratings) in full colour — redirects purple with a diagonal hatch,
 * feedback black — the other days in light tints of the same two colours;
 * dashed hairline grid; 12px grey axis labels with the active one in ink;
 * a black tooltip with a coloured dot per series.
 */
import { useId, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import type { VolumePoint } from '@/lib/volume-series';

export const VOLUME_COLORS = { feedback: '#111110', redirects: '#C6F24E' } as const;
/** Light tints for the bars that are not active (same hue, so the series stay readable). */
const VOLUME_MUTED = { feedback: '#C4C4C8', redirects: '#E3F4A6' } as const;

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload?: VolumePoint }>;
  isTr: boolean;
}

function VolumeTooltip({ active, payload, isTr }: TipProps) {
  const p = active ? payload?.find((x) => x.payload)?.payload : undefined;
  if (!p) return null;
  return (
    <div className="pn-chart-tip">
      <div className="font-medium">{p.longLabel}</div>
      <div className="mt-1.5 grid min-w-[176px] gap-1">
        <div className="flex justify-between gap-4">
          <span className="pn-chart-tip-muted">{isTr ? 'Puan' : 'Ratings'}</span>
          <span className="font-medium tabular-nums">{p.total}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="pn-legend-dot" style={{ background: '#111110' }} />
            {isTr ? 'Platforma yönlendirme' : 'Sent to a platform'}
          </span>
          <span className="tabular-nums">{p.redirects}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="pn-legend-dot bg-white" />
            {isTr ? 'Geri bildirim' : 'Feedback'}
          </span>
          <span className="tabular-nums">{p.feedback}</span>
        </div>
        {p.avgRating !== null && (
          <div className="mt-0.5 flex justify-between gap-4 border-t border-white/15 pt-1.5">
            <span className="pn-chart-tip-muted">{isTr ? 'Ortalama puan' : 'Average rating'}</span>
            <span className="tabular-nums">{p.avgRating.toLocaleString(isTr ? 'tr-TR' : 'en-US')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface TickProps {
  x?: number | string;
  y?: number | string;
  index?: number;
  payload?: { value?: unknown; index?: number };
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
  const hatchId = `vc-hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const latestIndex = useMemo(() => {
    for (let i = points.length - 1; i >= 0; i--) if (points[i].total > 0) return i;
    return points.length - 1;
  }, [points]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeIndex = hoverIndex ?? latestIndex;

  const tickInterval = points.length <= 10 ? 0 : Math.ceil(points.length / 7) - 1;
  const barSize = Math.max(3, Math.min(14, Math.floor((width - 40) / Math.max(points.length, 1)) - 4));

  const renderTick = (props: TickProps) => {
    const idx = props.payload?.index ?? props.index;
    const isActive = idx === activeIndex;
    return (
      <text
        x={props.x}
        y={props.y}
        dy="1em"
        textAnchor="middle"
        fontSize={12}
        fill={isActive ? '#111110' : '#9A9A9A'}
        fontWeight={isActive ? 500 : 400}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {String(props.payload?.value ?? '')}
      </text>
    );
  };

  return (
    <BarChart
      width={width}
      height={height}
      data={points}
      margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
      barCategoryGap={1}
      onMouseMove={(state: { activeTooltipIndex?: unknown } | null) => {
        const i = Number(state?.activeTooltipIndex);
        setHoverIndex(Number.isFinite(i) && state?.activeTooltipIndex !== null && state?.activeTooltipIndex !== undefined ? i : null);
      }}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <defs>
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={VOLUME_COLORS.redirects} />
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.32)" strokeWidth="2.4" />
        </pattern>
      </defs>
      <CartesianGrid vertical={false} stroke="#EBEBEB" strokeDasharray="3 5" />
      <XAxis
        dataKey="label"
        axisLine={false}
        tickLine={false}
        interval={tickInterval}
        tick={renderTick}
        height={28}
      />
      <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={32} tick={{ fill: '#9A9A9A', fontSize: 12 }} />
      <Tooltip
        cursor={false}
        content={({ active, payload }) => (
          <VolumeTooltip active={active} payload={payload as unknown as TipProps['payload']} isTr={isTr} />
        )}
      />
      <Bar dataKey="feedback" stackId="v" barSize={barSize} radius={[999, 999, 999, 999]} isAnimationActive={false}>
        {points.map((p, i) => (
          <Cell key={`f-${p.isoDate}`} fill={i === activeIndex ? VOLUME_COLORS.feedback : VOLUME_MUTED.feedback} />
        ))}
      </Bar>
      <Bar dataKey="redirects" stackId="v" barSize={barSize} radius={[999, 999, 999, 999]} isAnimationActive={false}>
        {points.map((p, i) => (
          <Cell key={`r-${p.isoDate}`} fill={i === activeIndex ? `url(#${hatchId})` : VOLUME_MUTED.redirects} />
        ))}
      </Bar>
    </BarChart>
  );
}
