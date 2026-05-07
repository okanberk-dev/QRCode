'use client';

/**
 * Stage 37 §38.117 — HANDOFF §8 step 4 (Panel atomları) APIconButton.
 *
 * Icon-only button with variant + size + tone + badge. HANDOFF
 * admin-panel.jsx:210-257 spec birebir; eklenen değer:
 *  - Pulse §11 styling (Tailwind utility + inline hex pattern)
 *  - A11y: `aria-label` zorunlu (icon-only button için), focus-visible
 *    lime ring, badge `aria-label` ile sayım okutulur
 *  - Lucide icon any React component children olarak geçilir (HANDOFF
 *    `name` string yerine — Buaze paterni daha esnek, lucide-react
 *    Bell/Plus/Search vs)
 *  - Mevcut `bz-btn-icon` (CLAUDE.md §23.2) 32×32 fixed size + ghost
 *    variant only; APIconButton sm/md/lg + 4 tone (default/lime/dark/
 *    ghost) + badge — daha zengin, redundant değil.
 *
 * HANDOFF tone palette:
 *  - default: #FAFAFA bg + #0A0A0A fg + 1px border (rest); white bg hover
 *  - lime:    #C6F24E bg + #0A0A0A fg; #B7E83A hover
 *  - dark:    #0A0A0A bg + white fg; #1F1F1F hover
 *  - ghost:   transparent bg + #0A0A0A fg; rgba(10,10,10,0.06) hover
 */

import { type ReactNode } from 'react';

export type APIconButtonSize = 'sm' | 'md' | 'lg';
export type APIconButtonTone = 'default' | 'lime' | 'dark' | 'ghost';

export interface APIconButtonProps {
  /** Icon component (lucide-react). Boyut child'a APIconButton tarafından override edilmez — caller `size` prop'u verirse intact, vermezse APIconButton tone'a göre default boyut uygular. */
  children: ReactNode;
  /** Erişilebilirlik için ZORUNLU (icon-only button) */
  ariaLabel: string;
  size?: APIconButtonSize;
  tone?: APIconButtonTone;
  onClick?: () => void;
  /** Notification dot/sayım. Number → badge sayım (0 göstermez). */
  badge?: number | null;
  /** Disabled state */
  disabled?: boolean;
  /** Form submit type (default 'button') */
  type?: 'button' | 'submit' | 'reset';
  /** Custom additional className */
  className?: string;
}

const SIZE_PX: Record<APIconButtonSize, { wh: number; rounded: number; iconSize: number }> = {
  sm: { wh: 30, rounded: 10, iconSize: 14 },
  md: { wh: 36, rounded: 12, iconSize: 16 },
  lg: { wh: 44, rounded: 14, iconSize: 20 },
};

const TONE_CLASS: Record<APIconButtonTone, string> = {
  default:
    'bg-[#FAFAFA] text-[#0A0A0A] border border-[#0A0A0A]/[0.08] hover:bg-white hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(10,10,10,0.2)]',
  lime: 'bg-[#C6F24E] text-[#0A0A0A] border border-[#0A0A0A]/[0.04] hover:bg-[#B7E83A] hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(198,242,78,0.45)]',
  dark: 'bg-[#0A0A0A] text-white border-none hover:bg-[#1F1F1F] hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(10,10,10,0.4)]',
  ghost:
    'bg-transparent text-[#0A0A0A] border border-transparent hover:bg-[#0A0A0A]/[0.06]',
};

export function APIconButton({
  children,
  ariaLabel,
  size = 'md',
  tone = 'default',
  onClick,
  badge,
  disabled = false,
  type = 'button',
  className = '',
}: APIconButtonProps) {
  const { wh, rounded } = SIZE_PX[size];
  const showBadge = badge != null && badge > 0;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`relative inline-flex items-center justify-center transition-all duration-[140ms] ease-out p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
        TONE_CLASS[tone]
      } ${disabled ? 'cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none' : 'cursor-pointer'} ${className}`}
      style={{ width: wh, height: wh, borderRadius: rounded }}
    >
      {children}
      {showBadge ? (
        <span
          aria-label={`${badge} bildirim`}
          className="absolute -top-[3px] -right-[3px] flex min-w-[16px] h-[16px] items-center justify-center rounded-full border-2 border-[#FAFAFA] bg-[#DC2626] px-1 text-[9px] font-bold text-white"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {badge && badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}
