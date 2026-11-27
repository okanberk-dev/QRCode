'use client';

/**
 * Panel switch (Pano, docs/design/DASHBOARD_DESIGN.md §5.3): a pill track —
 * black with a lime knob when on, light grey with a white knob when off. The
 * knob slides 260ms. Canonical switch of the panels (owner + admin).
 *
 * A11y: native button with role="switch" + aria-checked; Space / Enter
 * toggle; visible focus ring.
 */

import { Loader2, Lock } from 'lucide-react';
import { type ReactNode } from 'react';

export type APSwitchSize = 'sm' | 'md' | 'lg';

export interface APSwitchProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  size?: APSwitchSize;
  label?: ReactNode;
  sublabel?: ReactNode;
  disabled?: boolean;
  locked?: boolean;
  /** Async operation in flight: spinner in the knob + aria-busy. */
  loading?: boolean;
  ariaLabel?: string;
  className?: string;
}

const SIZE_TOKENS: Record<APSwitchSize, { w: number; h: number; knob: number; pad: number }> = {
  sm: { w: 40, h: 24, knob: 18, pad: 3 },
  md: { w: 50, h: 30, knob: 24, pad: 3 },
  lg: { w: 60, h: 34, knob: 28, pad: 3 },
};

export function APSwitch({
  checked,
  onChange,
  size = 'md',
  label,
  sublabel,
  disabled = false,
  locked = false,
  loading = false,
  ariaLabel,
  className = '',
}: APSwitchProps) {
  const { w, h, knob, pad } = SIZE_TOKENS[size];
  const isInactive = disabled || locked || loading;
  const travel = w - knob - pad * 2;

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={loading || undefined}
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      aria-disabled={isInactive || undefined}
      onClick={() => !isInactive && onChange && onChange(!checked)}
      disabled={isInactive}
      className={`pn-switch ${checked ? 'is-on' : ''} ${isInactive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      style={{ width: w, height: h }}
    >
      <span
        aria-hidden="true"
        className="pn-switch-knob"
        style={{
          top: pad,
          left: pad,
          width: knob,
          height: knob,
          transform: `translateX(${checked ? travel : 0}px)`,
        }}
      >
        {loading ? (
          <Loader2 size={knob * 0.55} className="animate-spin" />
        ) : locked ? (
          <Lock size={knob * 0.5} />
        ) : null}
      </span>
    </button>
  );

  if (!label) {
    return className ? <span className={className}>{button}</span> : button;
  }

  return (
    <label className={`inline-flex items-center gap-3 ${isInactive ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      {button}
      <span className="block">
        <span className="block text-[14px] font-medium leading-[1.3] text-pn-ink">{label}</span>
        {sublabel ? <span className="mt-0.5 block text-[13px] text-[#9A9A9A]">{sublabel}</span> : null}
      </span>
    </label>
  );
}

export default APSwitch;
