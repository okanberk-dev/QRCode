'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APSwitch (~75 satır).
 *
 * iOS-style switch (sm/md/lg) + locked state + opsiyonel label/sublabel.
 * **Buaze paneli için kanonik switch primitive** — eski `<Toggle>` (Stage
 * 97 §38.177'de silindi, 0 callsite). Notification settings sayfasındaki
 * görsel referans (HANDOFF tasarım): #C6F24E lime track + 240ms Apple
 * easing + white knob with drop-shadow.
 *
 * HANDOFF spec birebir:
 *  - dims: sm 36×22 / md 46×28 / lg 56×32; knob = h - 6 (3px pad)
 *  - bg: lime #C6F24E (on) / rgba(10,10,10,0.14) (off)
 *  - knob: white + box-shadow (drop)
 *  - transition: 240ms cubic-bezier(0.2,0.8,0.2,1) (Apple ease)
 *  - locked: lock icon overlay + cursor-not-allowed
 *  - label/sublabel: flex row + 12px gap (sublabel muted 11px)
 *
 * A11y: role="switch" + aria-checked + aria-label, focus-visible lime
 * ring, native button (keyboard space/enter activate).
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
  /** Stage 72 — async operation feedback. Knob içinde Loader2 spin + aria-busy. */
  loading?: boolean;
  ariaLabel?: string;
  /** Stage 72 — outer wrapper className passthrough (legacy Toggle paterni). */
  className?: string;
}

const SIZE_TOKENS: Record<APSwitchSize, { w: number; h: number; knob: number; pad: number }> = {
  sm: { w: 36, h: 22, knob: 16, pad: 3 },
  md: { w: 46, h: 28, knob: 22, pad: 3 },
  lg: { w: 56, h: 32, knob: 26, pad: 3 },
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
  const left = checked ? w - knob - pad : pad;

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
      className={`relative shrink-0 border-none p-0 transition-colors duration-[220ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
        isInactive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        background: checked ? '#C6F24E' : 'rgba(10,10,10,0.14)',
        boxShadow: checked
          ? 'inset 0 0 0 1px rgba(10,10,10,0.1)'
          : 'inset 0 0 0 1px rgba(10,10,10,0.05)',
        transitionTimingFunction: 'cubic-bezier(0.2,0.8,0.2,1)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute flex items-center justify-center"
        style={{
          top: pad,
          left,
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
          transition: 'left 240ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        {loading ? (
          <Loader2 size={knob * 0.55} color="#0A0A0A" strokeWidth={2.4} className="animate-spin" />
        ) : locked ? (
          <Lock size={knob * 0.5} color="#0A0A0A" strokeWidth={2.4} />
        ) : null}
      </span>
    </button>
  );

  if (!label) {
    return className ? <span className={className}>{button}</span> : button;
  }

  return (
    <label
      className={`inline-flex items-center gap-3 ${isInactive ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {button}
      <span className="block">
        <span className="block text-[13px] font-semibold text-[#0A0A0A] leading-[1.3]">
          {label}
        </span>
        {sublabel ? (
          <span className="mt-0.5 block text-[11px] text-[#737373]">{sublabel}</span>
        ) : null}
      </span>
    </label>
  );
}
