'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APSplitButton (~60 satır).
 *
 * 2-button gradient (primary action + chevron menu trigger). HANDOFF
 * "AI YANIT VER ▼" kullanımına uygun: ana CTA yan yana dropdown chevron
 * butonu. Mevcut Buaze counterpart yok — yeni primitive.
 *
 * Pulse §11 hex map:
 *  - Sol button: graphite + lime accent (HANDOFF darkLime ton)
 *  - Sağ chevron: graphite + lime + 1px white border-left
 *  - Border-radius: 11px asymmetric (sol-yukarı + sol-aşağı; sağ flat)
 *
 * Kullanım: AI bulk action menü (admin Inbox, owner reply composer),
 * "Save & Continue ▼" workflow.
 *
 * A11y: 2 button, ana action `ariaLabel`, menu button `aria-haspopup="menu"`
 * + `aria-expanded`. focus-visible lime ring.
 */

import { ChevronDown } from 'lucide-react';
import { type ReactNode } from 'react';

export interface APSplitButtonProps {
  /** Sol ana action button içeriği (ikon + metin) */
  children: ReactNode;
  onPrimaryClick?: () => void;
  onMenuClick?: () => void;
  primaryAriaLabel?: string;
  menuAriaLabel?: string;
  /** Menu açık mı (caller state) — chevron rotate için */
  menuOpen?: boolean;
  disabled?: boolean;
  className?: string;
}

export function APSplitButton({
  children,
  onPrimaryClick,
  onMenuClick,
  primaryAriaLabel,
  menuAriaLabel = 'Daha fazla seçenek',
  menuOpen = false,
  disabled = false,
  className = '',
}: APSplitButtonProps) {
  return (
    <div
      className={`inline-flex shadow-[0_8px_20px_-10px_rgba(10,10,10,0.3)] ${className}`}
    >
      <button
        type="button"
        onClick={onPrimaryClick}
        disabled={disabled}
        aria-label={primaryAriaLabel}
        className={`inline-flex items-center gap-2 border-none transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#1F1F1F]'
        }`}
        style={{
          height: 40,
          padding: '0 16px',
          background: '#0A0A0A',
          color: '#C6F24E',
          borderRadius: '11px 0 0 11px',
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </button>
      <button
        type="button"
        onClick={onMenuClick}
        disabled={disabled}
        aria-label={menuAriaLabel}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={`flex items-center justify-center border-none transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#1F1F1F]'
        }`}
        style={{
          height: 40,
          width: 40,
          background: '#0A0A0A',
          color: '#C6F24E',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0 11px 11px 0',
        }}
      >
        <ChevronDown
          size={12}
          color="#C6F24E"
          aria-hidden="true"
          style={{
            transition: 'transform 180ms ease-out',
            transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </div>
  );
}
