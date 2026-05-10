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
  /** Owner pages have a mobile bottom nav; admin pages do not. */
  bottomOffset?: 'owner' | 'panel';
}

const ACTION_CLASS: Record<NonNullable<PanelSelectionAction['variant']>, string> = {
  primary: 'border-[#C6F24E] bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]',
  lime: 'border-[#A8D62E] bg-[#EAF9B8] text-[#0A0A0A] hover:bg-[#C6F24E]',
  neutral: 'border-white/15 bg-white/10 text-white hover:bg-white/15',
  danger: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2]',
};

export function PanelSelectionBar({
  count,
  label,
  ariaLabel,
  actions,
  onClear,
  clearLabel,
  countLocale = 'tr-TR',
  bottomOffset = 'panel',
}: PanelSelectionBarProps) {
  if (count === 0) return null;

  const bottomClass =
    bottomOffset === 'owner'
      ? 'bottom-[calc(var(--dash-bottom-nav-h)+12px)] lg:bottom-4'
      : 'bottom-[calc(12px+env(safe-area-inset-bottom,0px))]';

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`fixed inset-x-3 ${bottomClass} z-50 sm:left-1/2 sm:right-auto sm:w-[min(720px,calc(100vw-32px))] sm:-translate-x-1/2`}
    >
      <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-3 text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="pulse-eyebrow text-[#C6F24E]" aria-live="polite">
              {count.toLocaleString(countLocale)} {label}
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
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
  );
}

export default PanelSelectionBar;
