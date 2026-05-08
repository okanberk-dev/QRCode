'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APButton (~120 satır).
 *
 * 8 variant + 4 size + loading + badge + kbd + full + icon/iconRight.
 * Mevcut `bz-btn-{primary,lime,ghost,icon,sm,danger,warn,on-dark}` utility
 * class'larının (CLAUDE.md §23.2) component-level eşdeğeri. PR1-5'te
 * 124 dosya / 281 callsite kademeli migrate edilir; PR6'da utility
 * class'lar silinir (CLAUDE.md §38.49 dead utility class disipline).
 *
 * Pulse §11 hex map (HANDOFF BZ palette → Pulse):
 *  - primary: lime CTA (#C6F24E + #0A0A0A; hover #B7E83A)
 *  - secondary: white + graphite border; hover dark inverted
 *  - dark: graphite + white (admin destructive / confirm)
 *  - darkLime: graphite + lime accent (Pulse signature, AI/CTA dual-tone)
 *  - ghost: transparent + graphite; hover light tint
 *  - danger: red CTA (#DC2626 + white)
 *  - success: green CTA (#16A34A + white)
 *  - limeOutline: lime border + lime-deep fg; hover lime-soft tint
 *
 * A11y: focus-visible lime ring + offset, disabled cursor + opacity,
 * loading spinner replaces icon while disabling click. Mobile 44×44
 * touch target lg size + sm/md compact.
 */

import { Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';

export type APButtonVariant =
  | 'primary'
  | 'secondary'
  | 'dark'
  | 'darkLime'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'limeOutline';

export type APButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface APButtonProps {
  variant?: APButtonVariant;
  size?: APButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  badge?: number | string | null;
  /** Klavye kısayolu hint (örn. "⌘K") — sadece md/lg size'da görünür */
  kbd?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

const SIZE_TOKENS: Record<APButtonSize, {
  px: number;
  fs: number;
  h: number;
  iconSize: number;
  gap: number;
  r: number;
}> = {
  xs: { px: 10, fs: 10, h: 26, iconSize: 11, gap: 5, r: 7 },
  sm: { px: 12, fs: 11, h: 32, iconSize: 12, gap: 6, r: 9 },
  md: { px: 16, fs: 12, h: 40, iconSize: 14, gap: 8, r: 11 },
  lg: { px: 22, fs: 13, h: 50, iconSize: 16, gap: 10, r: 14 },
};

const VARIANT_CLASS: Record<APButtonVariant, string> = {
  primary:
    'bg-[#C6F24E] text-[#0A0A0A] border border-transparent hover:bg-[#B7E83A] hover:shadow-[0_10px_24px_-8px_rgba(198,242,78,0.5)]',
  secondary:
    'bg-white text-[#0A0A0A] border border-[#0A0A0A]/[0.18] hover:bg-[#0A0A0A] hover:text-white hover:border-[#0A0A0A]',
  dark: 'bg-[#0A0A0A] text-white border border-transparent hover:bg-[#1F1F1F] hover:shadow-[0_10px_24px_-10px_rgba(10,10,10,0.5)]',
  darkLime:
    'bg-[#0A0A0A] text-[#C6F24E] border border-transparent hover:bg-[#1F1F1F] hover:shadow-[0_10px_24px_-10px_rgba(10,10,10,0.5)]',
  ghost:
    'bg-transparent text-[#0A0A0A] border border-transparent hover:bg-[#0A0A0A]/[0.06]',
  danger:
    'bg-[#DC2626] text-white border border-transparent hover:bg-[#B91C1C] hover:shadow-[0_8px_20px_-8px_rgba(220,38,38,0.6)]',
  success:
    'bg-[#16A34A] text-white border border-transparent hover:bg-[#15803D]',
  limeOutline:
    'bg-transparent text-[#3F5408] border border-[#A8D62E] hover:bg-[#EAF9B8]',
};

export function APButton({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  full = false,
  loading = false,
  disabled = false,
  badge,
  kbd,
  type = 'button',
  onClick,
  ariaLabel,
  className = '',
}: APButtonProps) {
  const tokens = SIZE_TOKENS[size];
  const isInactive = disabled || loading;
  const showBadge = badge != null && badge !== '' && badge !== 0;
  const showKbd = kbd && (size === 'md' || size === 'lg');

  const inactiveClass = isInactive
    ? 'cursor-not-allowed opacity-60 hover:bg-[#0A0A0A]/[0.06] hover:text-[#0A0A0A]/[0.35] hover:shadow-none'
    : 'cursor-pointer active:translate-y-px';

  const badgeClass =
    variant === 'primary'
      ? 'bg-[#0A0A0A] text-[#C6F24E]'
      : 'bg-[#C6F24E] text-[#0A0A0A]';

  const kbdClass =
    variant === 'dark' || variant === 'darkLime' || variant === 'danger' || variant === 'success'
      ? 'bg-white/[0.12] text-white/80'
      : 'bg-[#0A0A0A]/[0.12] text-[#0A0A0A]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isInactive}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={`relative inline-flex items-center justify-center whitespace-nowrap font-bold uppercase tracking-[0.1em] transition-[background-color,color,box-shadow,transform] duration-[140ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${VARIANT_CLASS[variant]} ${inactiveClass} ${full ? 'w-full' : ''} ${className}`}
      style={{
        height: tokens.h,
        padding: `0 ${tokens.px}px`,
        gap: tokens.gap,
        borderRadius: tokens.r,
        fontSize: tokens.fs,
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      }}
    >
      {loading ? (
        <Loader2
          size={tokens.iconSize}
          className="animate-spin"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children ? <span>{children}</span> : null}
      {iconRight}
      {showBadge ? (
        <span
          aria-hidden="true"
          className={`inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${badgeClass}`}
          style={{ marginLeft: 2 }}
        >
          {badge}
        </span>
      ) : null}
      {showKbd ? (
        <span
          aria-hidden="true"
          className={`inline-flex items-center rounded px-1.5 py-px text-[9px] font-medium tracking-[0.04em] ${kbdClass}`}
          style={{ marginLeft: 4, fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
        >
          {kbd}
        </span>
      ) : null}
    </button>
  );
}
