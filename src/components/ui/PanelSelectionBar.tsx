'use client';

import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';

export interface PanelSelectionAction {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'lime' | 'neutral' | 'danger';
}

interface PanelSelectionBarProps {
  count: number;
  label: string;
  ariaLabel: string;
  actions: PanelSelectionAction[];
  onClear: () => void;
  clearLabel: string;
  countLocale?: string;
  /** Count line style; defaults to the mono eyebrow. */
  countClassName?: string;
  /**
   * §49 — render an in-flow spacer so the last rows of the page can scroll
   * above the bar instead of staying hidden under it. Turn off where the
   * page manages its own scroll panes (admin reviews inbox).
   */
  reserveSpace?: boolean;
}

const ACTION_CLASS: Record<NonNullable<PanelSelectionAction['variant']>, string> = {
  primary: 'border-pn-accent bg-pn-accent text-pn-ink hover:bg-pn-accent-hover',
  lime: 'border-pn-accent bg-pn-accent text-pn-ink hover:bg-pn-accent-hover',
  neutral: 'border-white/15 bg-white/10 text-white hover:bg-white/15',
  danger: 'border-transparent bg-[#3A1D1D] text-[#FF8A80] hover:bg-[#4A2222]',
};

// Pano has no bottom tab bar; `--dash-bottom-nav-h` only holds the safe area
// (pano.css). globals.css `--dash-bottom-nav-h`
// mobile için 76px+safe-area, lg:+ otomatik 0 — tek pattern her panel surface'te
// doğru clearance verir (eski `bottomOffset='owner'|'panel'` flag'i sadeleştirildi).
export function PanelSelectionBar({
  count,
  label,
  ariaLabel,
  actions,
  onClear,
  clearLabel,
  countLocale = 'tr-TR',
  countClassName = 'text-[15px] font-medium text-pn-accent',
  reserveSpace = true,
}: PanelSelectionBarProps) {
  if (count === 0) return null;

  return (
    <>
    {reserveSpace && <div aria-hidden="true" className="h-36 sm:h-20" />}
    <div
      role="region"
      aria-label={ariaLabel}
      className="fixed inset-x-3 bottom-[calc(var(--dash-bottom-nav-h)+12px)] z-50 lg:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(720px,calc(100vw-32px))] sm:-translate-x-1/2"
    >
      <div className="flex flex-col gap-3 rounded-[28px] bg-pn-ink p-3 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
        <div className="flex items-center gap-2 sm:contents">
          <div className="min-w-0 flex-1 sm:order-1 sm:flex-none sm:pl-1">
            <div className={countClassName} aria-live="polite">
              {count.toLocaleString(countLocale)} {label}
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent sm:order-3 sm:ml-auto"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:order-2 sm:flex sm:flex-wrap sm:items-center">
          {actions.map((action) => {
            const variant = action.variant ?? 'neutral';
            return (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_CLASS[variant]}`}
              >
                {action.loading ? (
                  <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
                ) : (
                  action.icon
                )}
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}

export default PanelSelectionBar;
