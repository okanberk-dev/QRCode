'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APFab (~50 satır).
 *
 * Floating action button (lime/dark tone) — opsiyonel label. HANDOFF
 * spec birebir: 54px height, 27px radius (pill), lime drop shadow,
 * hover -2px lift + intensified shadow.
 *
 * Kullanım: yeni create flow CTA (yeni QR ekle, yeni kampanya), bottom
 * mobile FAB (CLAUDE.md §38.43 marketing MobileBottomNav patern reuse
 * adayı). Mevcut Buaze counterpart yok — yeni primitive.
 *
 * A11y: ariaLabel zorunlu (icon-only fallback için), focus-visible lime
 * ring, button native semantik.
 */

import { type ReactNode } from 'react';

export type APFabTone = 'lime' | 'dark';

export interface APFabProps {
  icon: ReactNode;
  label?: string;
  tone?: APFabTone;
  ariaLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function APFab({
  icon,
  label,
  tone = 'lime',
  ariaLabel,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}: APFabProps) {
  const isDark = tone === 'dark';
  const baseBg = isDark ? '#0A0A0A' : '#C6F24E';
  const hoverBg = isDark ? '#1F1F1F' : '#B7E83A';
  const fg = isDark ? '#C6F24E' : '#0A0A0A';
  const shadowRest = isDark
    ? '0 12px 30px -12px rgba(10,10,10,0.45)'
    : '0 12px 30px -12px rgba(198,242,78,0.55)';
  const shadowHover = isDark
    ? '0 18px 44px -12px rgba(10,10,10,0.6)'
    : '0 18px 44px -12px rgba(198,242,78,0.7)';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className={`group inline-flex items-center justify-center gap-2.5 border-none transition-all duration-[200ms] ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${className}`}
      style={{
        height: 54,
        padding: label ? '0 22px 0 18px' : 0,
        width: label ? 'auto' : 54,
        borderRadius: 27,
        background: baseBg,
        color: fg,
        boxShadow: shadowRest,
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.boxShadow = shadowHover;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = baseBg;
        e.currentTarget.style.boxShadow = shadowRest;
      }}
    >
      {icon}
      {label}
    </button>
  );
}
