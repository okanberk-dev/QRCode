'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APCard (~60 satır).
 *
 * Generic card container — children + dark variant + padding + hover lift +
 * left accent stripe. HANDOFF "Card sistem" temel building block. Mevcut
 * Buaze `bz-card` utility (CLAUDE.md §23.2 — `bg-white rounded-2xl
 * border-#EDEDED p-X`) eşdeğeri ama component-level (props API ile
 * variant + accent + hover-lift toggle).
 *
 * Pulse §11 hex map:
 *  - light: #FFFFFF bg + #0A0A0A fg + 1px rgba(10,10,10,0.06) border
 *  - dark: #0A0A0A bg + #F6F4EF fg + 1px rgba(255,255,255,0.06) border
 *  - hover lift: bz-elev-2 shadow + translateY(-2px) (CLAUDE.md §38.65)
 *  - accent: 4px solid color stripe (left edge)
 *  - 18px radius default
 *
 * Kullanım: container building block (KPI grid wrap, info box, settings
 * panel section). Mevcut bz-card utility ile redundant değil — component
 * version daha esnek (accent + hover toggle), inline padding control.
 */

import { type CSSProperties, type ReactNode } from 'react';

export interface APCardProps {
  children: ReactNode;
  dark?: boolean;
  padding?: number | string;
  hover?: boolean;
  /** Sol kenarda 4px stripe (lime / red / amber / herhangi hex) */
  accent?: string;
  className?: string;
  style?: CSSProperties;
}

export function APCard({
  children,
  dark = false,
  padding = 20,
  hover = false,
  accent,
  className = '',
  style,
}: APCardProps) {
  return (
    <div
      className={`relative overflow-hidden transition-all duration-[220ms] ease-out ${
        hover
          ? 'hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-20px_rgba(10,10,10,0.18),0_1px_0_rgba(10,10,10,0.02)]'
          : ''
      } ${className}`}
      style={{
        background: dark ? '#0A0A0A' : '#fff',
        color: dark ? '#F6F4EF' : '#0A0A0A',
        border: dark
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(10,10,10,0.06)',
        borderRadius: 18,
        padding,
        boxShadow: '0 1px 2px rgba(10,10,10,0.04), 0 0 0 1px rgba(10,10,10,0.01)',
        ...style,
      }}
    >
      {accent ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-1"
          style={{ background: accent }}
        />
      ) : null}
      {children}
    </div>
  );
}
