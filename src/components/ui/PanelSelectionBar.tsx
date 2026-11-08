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
  /**
   * §49 — render an in-flow spacer so the last rows of the page can scroll
   * above the bar instead of staying hidden under it. Turn off where the
   * page manages its own scroll panes (admin reviews inbox).
   */
  reserveSpace?: boolean;
}

const ACTION_CLASS: Record<NonNullable<PanelSelectionAction['variant']>, string> = {
  primary: 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]',
  lime: 'border-[#A8D62E] bg-[#EAF9B8] text-[#0A0A0A] hover:bg-[#C6F24E]',
  neutral: 'border-white/15 bg-white/10 text-white hover:bg-white/15',
  danger: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2]',
};

// CLAUDE.md §38.171 Stage 91 — owner + admin paneller mobile bottom nav'a
// sahip (UserDashboardShell + AdminMobileNav). globals.css `--dash-bottom-nav-h`
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
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A] p-3 text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.55)] sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 sm:contents">
          <div className="min-w-0 flex-1 sm:order-1 sm:flex-none sm:pl-1">
            <div className="pulse-eyebrow text-[#C6F24E]" aria-live="polite">
              {count.toLocaleString(countLocale)} {label}
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] sm:order-3 sm:ml-auto"
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
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:rounded-full sm:py-1.5 ${ACTION_CLASS[variant]}`}
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
