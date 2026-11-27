import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowUpRight as OpenIcon, MoreVertical } from 'lucide-react';
import { PanoNumber } from '@/components/panel/pano/PanoNumber';
import { InfoTip } from '@/components/ui/InfoTip';

/**
 * Dark hero card for the panel home (docs/design/DASHBOARD_DESIGN.md §5.4):
 * the page's most important number on black with the lime glow, four round
 * shortcuts and a progress bar whose unfilled part is hatched.
 */

export interface HeroRow {
  id: string;
  href?: string;
  /** Short text or icon in the round tile. */
  icon: ReactNode;
  value: string;
  label: string;
  change?: { text: string; up: boolean } | null;
}

export interface HeroAction {
  href: string;
  label: string;
  icon: ReactNode;
}

interface PanoHeroCardProps {
  /** Phones only: the page greeting moves into the card (reference mobile). */
  greeting?: ReactNode;
  label: string;
  info?: string;
  value: string;
  change?: { text: string; tone: 'good' | 'bad' | 'neutral' } | null;
  changeSuffix?: string;
  openHref: string;
  openLabel: string;
  actions: HeroAction[];
  progress?: { label: string; percent: number | null; caption: string };
  /** Dark rows under the progress bar (reference: currency rows). */
  rows?: HeroRow[];
  isTr: boolean;
  className?: string;
}

export function PanoHeroCard({
  greeting,
  label,
  info,
  value,
  change,
  changeSuffix,
  openHref,
  openLabel,
  actions,
  progress,
  rows = [],
  isTr,
  className = '',
}: PanoHeroCardProps) {
  const pct = progress?.percent === null || progress?.percent === undefined ? null : Math.max(0, Math.min(100, progress.percent));
  return (
    <section className={`pn-card-dark flex min-w-0 flex-col p-6 sm:p-7 ${className}`} aria-label={label}>
      {greeting && <p className="mb-5 pr-12 text-[28px] leading-[1.15] tracking-[-0.01em] text-white sm:hidden">{greeting}</p>}
      <div className="flex items-start justify-between gap-3">
        <span className="pn-muted inline-flex items-center gap-1 text-[14px]">
          {label}
          {info && <InfoTip text={info} label={label} isTr={isTr} />}
        </span>
        <Link href={openHref} className="pn-arrow-btn pn-arrow-btn--dark" aria-label={openLabel}>
          <OpenIcon size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="text-[44px] leading-none text-white sm:text-[48px]">
          <PanoNumber value={value} locale={isTr ? 'tr' : 'en'} />
        </span>
        {change && (
          <span
            className="mb-1 inline-flex items-center gap-0.5 text-[13px] font-medium"
            style={{ color: change.tone === 'bad' ? '#FF8A80' : change.tone === 'good' ? '#78FC90' : 'rgba(255,255,255,.62)' }}
          >
            {change.tone === 'good' && <ArrowUpRight size={15} aria-hidden="true" />}
            {change.tone === 'bad' && <ArrowDownRight size={15} aria-hidden="true" />}
            {change.text}
          </span>
        )}
      </div>
      {changeSuffix && <p className="pn-muted mt-1.5 text-[13px]">{changeSuffix}</p>}

      <div className="mt-6 flex flex-wrap gap-2.5">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="pn-dark-icon-btn"
            aria-label={action.label}
            title={action.label}
          >
            {action.icon}
          </Link>
        ))}
      </div>

      {progress && (
        <div className="mt-auto pt-7">
          <p className="pn-muted text-[14px]">{progress.label}</p>
          <div
            className="pn-hatch-dark relative mt-4 h-[30px] rounded-full"
            role="progressbar"
            aria-label={progress.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct ?? undefined}
          >
            {pct !== null && (
              <>
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-pn-accent transition-[width] duration-700"
                  style={{ width: `${Math.max(pct, 8)}%` }}
                />
                <span className="pn-knob" style={{ left: `${Math.max(pct, 8)}%` }} aria-hidden="true">
                  <MoreVertical size={16} />
                </span>
              </>
            )}
          </div>
          <p className="pn-muted mt-4 text-[13px]">{progress.caption}</p>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((row) => {
            const inner = (
              <>
                <span className="pn-dark-row-icon" aria-hidden="true">{row.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] leading-tight">
                    <PanoNumber value={row.value} locale={isTr ? 'tr' : 'en'} />
                  </span>
                  <span className="pn-muted block truncate text-[13px]">{row.label}</span>
                </span>
                {row.change && (
                  <span className={`inline-flex shrink-0 items-center gap-0.5 self-start pt-1 text-[13px] ${row.change.up ? 'pn-up' : 'pn-down'}`}>
                    {row.change.up ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                    {row.change.text}
                  </span>
                )}
              </>
            );
            return (
              <li key={row.id}>
                {row.href ? (
                  <Link href={row.href} className="pn-dark-row">{inner}</Link>
                ) : (
                  <div className="pn-dark-row">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default PanoHeroCard;
