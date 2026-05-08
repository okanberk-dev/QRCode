'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APButtonGroup (~60 satır).
 *
 * Joined items (single-select) with optional icons. HANDOFF "Liste / Grid /
 * Grafik" view-mode picker paterni. Mevcut Buaze counterpart yok — yeni
 * primitive (APSegmented'in ev kart benzeri kuzeni; APSegmented pill bg
 * iken APButtonGroup edge-to-edge bordered group).
 *
 * Pulse §11 hex map:
 *  - container: 11px radius + 1px rgba(10,10,10,0.12) border
 *  - active: #0A0A0A bg + white text
 *  - inactive: white bg + #0A0A0A text
 *  - separator: 1px rgba(10,10,10,0.08) border-left (i > 0)
 *  - 38px height, 14px horizontal padding, 11px font, 700wt mono uppercase
 *
 * Kullanım: workspace switcher, view density toggle, list/grid view-mode.
 *
 * A11y: role="group" container + role="button" item + aria-pressed.
 */

import { type ReactNode } from 'react';

export interface APButtonGroupItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface APButtonGroupProps<T extends string> {
  items: APButtonGroupItem<T>[];
  value: T;
  onChange?: (next: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function APButtonGroup<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
}: APButtonGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex overflow-hidden ${className}`}
      style={{
        borderRadius: 11,
        border: '1px solid rgba(10,10,10,0.12)',
      }}
    >
      {items.map((it, i) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange && onChange(it.value)}
            className="inline-flex items-center gap-1.5 border-none cursor-pointer transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-inset"
            style={{
              height: 38,
              padding: '0 14px',
              background: active ? '#0A0A0A' : '#fff',
              color: active ? '#fff' : '#0A0A0A',
              borderLeft: i === 0 ? 'none' : '1px solid rgba(10,10,10,0.08)',
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
