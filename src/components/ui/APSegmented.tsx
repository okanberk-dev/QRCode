'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APSegmented (~80 satır).
 *
 * Segmented control (single-select) + opsiyonel count badge + icon + size.
 * Mevcut `<Tabs>` primitive'inin HANDOFF eşdeğeri; iOS-style pill
 * container with active state inversion. PR2'de 2 admin callsite migrate
 * edilir; PR6'da Tabs silinir (CLAUDE.md §34 + §38.49).
 *
 * HANDOFF spec:
 *  - container: rgba(10,10,10,0.05) bg + 3px padding + 999px radius
 *  - active: #0A0A0A graphite + white text + drop shadow
 *  - inactive: transparent + rgba(10,10,10,0.65) text
 *  - count badge: lime (active) / rgba(10,10,10,0.1) (inactive)
 *  - 160ms ease transition
 *
 * A11y: role="tablist" + role="tab" + aria-selected, keyboard nav (left/
 * right arrow + home/end). T elements via children string preferred.
 */

import { type ReactNode } from 'react';

export type APSegmentedSize = 'sm' | 'md';

export interface APSegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface APSegmentedProps<T extends string> {
  options: APSegmentedOption<T>[];
  value: T;
  onChange?: (next: T) => void;
  size?: APSegmentedSize;
  ariaLabel?: string;
  className?: string;
}

const HEIGHT: Record<APSegmentedSize, number> = { sm: 30, md: 36 };

export function APSegmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel,
  className = '',
}: APSegmentedProps<T>) {
  const h = HEIGHT[size];
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-full p-[3px] ${className}`}
      style={{
        background: 'rgba(10,10,10,0.05)',
        height: h,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange && onChange(opt.value)}
            className="inline-flex items-center gap-1.5 rounded-full border-none px-3.5 transition-all duration-[160ms] ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1"
            style={{
              background: active ? '#0A0A0A' : 'transparent',
              color: active ? '#fff' : 'rgba(10,10,10,0.65)',
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {opt.count != null ? (
              <span
                aria-hidden="true"
                className="inline-flex items-center rounded-md px-1 text-[9px] font-bold"
                style={{
                  background: active ? '#C6F24E' : 'rgba(10,10,10,0.1)',
                  color: active ? '#0A0A0A' : 'rgba(10,10,10,0.7)',
                  paddingTop: 1,
                  paddingBottom: 1,
                }}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
