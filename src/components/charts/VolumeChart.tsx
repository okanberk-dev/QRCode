'use client';

/**
 * Rating volume chart shared by Panel and Analytics (CLAUDE.md §58): thin
 * stacked bars per day (weekly for long windows), redirects vs private
 * feedback, hover tooltip with counts and the day's average. The recharts
 * body loads on demand; the card, legend and totals render immediately.
 */
import { useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { MeasuredChart } from './MeasuredChart';
import { peakPoint, type VolumePoint } from '@/lib/volume-series';

const VolumeChartCanvas = dynamic(() => import('./VolumeChartCanvas'), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-[14px] bg-pn-canvas" aria-hidden="true" />,
});

// Kept in sync with VolumeChartCanvas (that module loads lazily).
const COLORS = { feedback: '#000000', redirects: '#78FC90' } as const;

export interface VolumeRange {
  key: string;
  label: string;
  points: VolumePoint[];
}

export interface VolumeChartProps {
  title: string;
  subtitle?: string;
  ranges: VolumeRange[];
  defaultRange?: string;
  footer?: ReactNode;
  isTr?: boolean;
  heightClassName?: string;
}

export function VolumeChart({
  title,
  subtitle,
  ranges,
  defaultRange,
  footer,
  isTr = true,
  heightClassName = 'h-[220px] sm:h-[260px]',
}: VolumeChartProps) {
  const [active, setActive] = useState(defaultRange ?? ranges[0]?.key);
  const range = ranges.find((r) => r.key === active) ?? ranges[0];
  const points = useMemo(() => range?.points ?? [], [range]);
  const totals = useMemo(
    () =>
      points.reduce(
        (a, p) => ({ feedback: a.feedback + p.feedback, redirects: a.redirects + p.redirects }),
        { feedback: 0, redirects: 0 },
      ),
    [points],
  );
  const peak = peakPoint(points);
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const empty = totals.feedback + totals.redirects === 0;

  return (
    <section className="bz-card p-5 sm:p-6" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium text-pn-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-[#525252]">{subtitle}</p>}
        </div>
        {ranges.length > 1 && (
          <div role="group" aria-label={isTr ? 'Grafik aralığı' : 'Chart range'} className="inline-flex rounded-[14px] bg-pn-canvas p-0.5">
            {ranges.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={r.key === range?.key}
                onClick={() => setActive(r.key)}
                className={`min-h-[36px] rounded-[10px] px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover ${
                  r.key === range?.key ? 'bg-white text-pn-ink ' : 'text-[#525252] hover:text-pn-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-[#525252]">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[8px]" style={{ background: COLORS.redirects }} />
          {isTr ? 'Platforma yönlendirme' : 'Sent to a platform'}
          <span className="tabular-nums font-medium text-pn-ink">{fmt(totals.redirects)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[8px]" style={{ background: COLORS.feedback }} />
          {isTr ? 'Geri bildirim' : 'Feedback'}
          <span className="tabular-nums font-medium text-pn-ink">{fmt(totals.feedback)}</span>
        </span>
      </div>

      {empty ? (
        <p className="mt-4 rounded-[14px] border border-dashed border-pn-line-strong bg-pn-canvas px-4 py-10 text-center text-[13px] text-[#525252]">
          {isTr ? 'Bu dönemde puan yok. Müşteriler QR ile puan verdikçe burada görünür.' : 'No ratings in this period. They appear here as customers rate through the QR.'}
        </p>
      ) : (
        <MeasuredChart className={`mt-4 w-full ${heightClassName}`}>
          {({ width, height }) => <VolumeChartCanvas width={width} height={height} points={points} isTr={isTr} />}
        </MeasuredChart>
      )}

      {(peak || footer) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] text-[#737373]">
          {peak ? (
            <span>
              {isTr ? 'En yoğun' : 'Busiest'}: {peak.longLabel} · {fmt(peak.total)} {isTr ? 'puan' : peak.total === 1 ? 'rating' : 'ratings'}
            </span>
          ) : (
            <span />
          )}
          {footer}
        </div>
      )}
    </section>
  );
}

export default VolumeChart;
