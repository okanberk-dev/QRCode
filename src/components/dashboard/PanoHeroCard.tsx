import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { PanoNumber } from '@/components/panel/pano/PanoNumber';
import { InfoTip } from '@/components/ui/InfoTip';
import { monotonePath } from '@/components/ui/Sparkline';

/**
 * Headline card for the panel home (docs/design/DASHBOARD_DESIGN.md §5.4),
 * after the Fintora "Total Portfolio Value" card: a white card with a grey
 * label and ↗, the page's key number (grey fraction), a soft change pill,
 * four equal grey shortcut pills, a black trend line over a light green area
 * with a black value chip on the last point, a slim black meter with a
 * hatched remainder and grey breakdown rows.
 */

export interface HeroRow {
  id: string;
  href?: string;
  /** Short text or icon in the round black circle. */
  icon: ReactNode;
  title: string;
  sub?: string;
  value: string;
  valueSub?: ReactNode;
  change?: { text: string; up: boolean } | null;
}

export interface HeroAction {
  href: string;
  label: string;
  /** One-word caption under the pill (falls back to `label`). */
  short?: string;
  icon: ReactNode;
}

interface PanoHeroCardProps {
  label: string;
  info?: string;
  value: string;
  change?: { text: string; tone: 'good' | 'bad' | 'neutral' } | null;
  changeSuffix?: string;
  openHref: string;
  openLabel: string;
  actions: HeroAction[];
  /** Trend under the number (≥ 2 points); the last point carries `value`. */
  trend?: number[];
  /** Grey line under the trend (what the line shows). */
  trendCaption?: string;
  progress?: { label: string; percent: number | null; caption: string };
  /** Small heading over the breakdown rows. */
  rowsTitle?: string;
  rows?: HeroRow[];
  isTr: boolean;
  className?: string;
}

const CHART_W = 300;
const CHART_H = 96;
/** Room above the line for the value chip. */
const CHART_TOP = 38;
const CHART_BOTTOM = 8;

function trendPoints(values: number[]): Array<[number, number]> {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const span = CHART_H - CHART_TOP - CHART_BOTTOM;
  const step = CHART_W / Math.max(values.length - 1, 1);
  return values.map((v, i): [number, number] => {
    // A flat series sits in the middle instead of on the floor.
    const t = range < 1e-6 ? 0.5 : (v - min) / range;
    return [i * step, CHART_TOP + (1 - t) * span];
  });
}

function HeroTrend({ values, chip, caption }: { values: number[]; chip: string; caption?: string }) {
  const pts = trendPoints(values);
  const line = monotonePath(pts);
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const last = pts[pts.length - 1];
  const topPct = (last[1] / CHART_H) * 100;
  return (
    <div className="mt-6">
      <div className="relative h-[96px]">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="absolute inset-y-0 left-0 right-2 h-full w-[calc(100%-8px)]"
          aria-hidden="true"
        >
          <path d={area} fill="var(--color-pn-accent-soft)" />
          <path
            d={line}
            fill="none"
            stroke="var(--color-pn-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Last point: dashed guide, dot and the black value chip. */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-2 w-0 border-l border-dashed border-pn-ink/25"
          style={{ top: `${topPct}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute right-2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white bg-pn-accent shadow-[0_0_0_1px_rgba(17,17,16,0.25)]"
          style={{ top: `${topPct}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute right-0 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-[10px] bg-pn-ink px-2.5 py-1 text-[12px] font-medium tabular-nums text-white"
          style={{ top: `${topPct}%` }}
        >
          {chip}
        </span>
      </div>
      {caption && <p className="mt-2 text-[13px] text-[#9A9A9A]">{caption}</p>}
    </div>
  );
}

export function PanoHeroCard({
  label,
  info,
  value,
  change,
  changeSuffix,
  openHref,
  openLabel,
  actions,
  trend,
  trendCaption,
  progress,
  rowsTitle,
  rows = [],
  isTr,
  className = '',
}: PanoHeroCardProps) {
  const pct = progress?.percent === null || progress?.percent === undefined ? null : Math.max(0, Math.min(100, progress.percent));
  const locale = isTr ? 'tr' : 'en';
  const changeClass =
    change?.tone === 'good' ? 'pn-change--up' : change?.tone === 'bad' ? 'pn-change--down' : 'pn-change--flat';
  const showTrend = Array.isArray(trend) && trend.length >= 2 && value !== '—';
  return (
    <section className={`bz-card flex min-w-0 flex-col p-5 sm:p-6 ${className}`} aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex min-h-[44px] items-center gap-1 text-[14px] text-[#737373]">
          {label}
          {info && <InfoTip text={info} label={label} isTr={isTr} />}
        </span>
        <Link href={openHref} className="pn-arrow-btn" aria-label={openLabel}>
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-1 text-[44px] font-medium leading-none text-pn-ink sm:text-[48px]">
        <PanoNumber value={value} locale={locale} />
      </div>
      {(change || changeSuffix) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          {change && (
            <span className={`pn-change ${changeClass}`}>
              {change.tone === 'good' && <ArrowUpRight size={14} aria-hidden="true" />}
              {change.tone === 'bad' && <ArrowDownRight size={14} aria-hidden="true" />}
              {change.text}
            </span>
          )}
          {changeSuffix && <span className="text-[13px] text-[#9A9A9A]">{changeSuffix}</span>}
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
          {actions.map((action) => (
            // Icon pill with a one-word caption: an icon alone left the
            // owner guessing where each shortcut goes.
            <Link
              key={action.href}
              href={action.href}
              className="pn-action group flex min-w-0 flex-col items-stretch gap-1.5 rounded-[14px] outline-none"
              aria-label={action.label}
            >
              <span className="pn-action-pill" aria-hidden="true">
                {action.icon}
              </span>
              <span className="truncate text-center text-[12px] text-[#737373] transition-colors duration-200 group-hover:text-pn-ink">
                {action.short ?? action.label}
              </span>
            </Link>
          ))}
        </div>
      )}

      {showTrend && <HeroTrend values={trend!} chip={value} caption={trendCaption} />}

      {(progress || rows.length > 0) && (
        <div className="mt-auto flex flex-col gap-6 pt-6">
          {progress && (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] text-[#737373]">{progress.label}</span>
                <span className="text-[15px] font-medium tabular-nums text-pn-ink">
                  {pct === null ? '—' : isTr ? `%${pct}` : `${pct}%`}
                </span>
              </div>
              <div
                className="pn-hatch mt-3 h-2.5 overflow-hidden rounded-full"
                role="progressbar"
                aria-label={progress.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct ?? undefined}
              >
                {pct !== null && pct > 0 && (
                  <span
                    className="block h-full rounded-full bg-pn-accent transition-[width] duration-700"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                )}
              </div>
              <p className="mt-2 text-[13px] text-[#9A9A9A]">{progress.caption}</p>
            </div>
          )}

          {rows.length > 0 && (
            <div>
              {rowsTitle && <p className="mb-3 text-[14px] text-[#737373]">{rowsTitle}</p>}
              <ul className="flex flex-col gap-2">
                {rows.map((row) => {
                  const inner = (
                    <>
                      <span className="pn-row-icon" aria-hidden="true">{row.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-pn-ink">{row.title}</span>
                        {row.sub && <span className="block truncate text-[13px] text-[#9A9A9A]">{row.sub}</span>}
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="text-[15px] font-medium text-pn-ink">
                          <PanoNumber value={row.value} locale={locale} />
                        </span>
                        {row.change ? (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[13px] tabular-nums ${row.change.up ? 'text-[#23863A]' : 'text-[#D92D20]'}`}
                          >
                            {row.change.up ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                            {row.change.text}
                          </span>
                        ) : (
                          row.valueSub && <span className="text-[13px] text-[#9A9A9A]">{row.valueSub}</span>
                        )}
                      </span>
                    </>
                  );
                  return (
                    <li key={row.id}>
                      {row.href ? (
                        <Link href={row.href} className="pn-row min-h-[64px]">{inner}</Link>
                      ) : (
                        <div className="pn-row min-h-[64px]">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default PanoHeroCard;
