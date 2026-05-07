'use client';

/**
 * Stage 37 §38.117 — HANDOFF §8 step 4 (Panel atomları) APSlider.
 *
 * Drag-based numeric slider. HANDOFF admin-panel.jsx:555-597 spec
 * birebir; eklenen değer:
 *  - Pulse §11 styling (Tailwind utility + inline hex pattern)
 *  - A11y: `role="slider"` + `aria-valuenow/min/max` + keyboard ←/→
 *    (1 step), Home/End (min/max), focus-visible lime ring
 *  - Touch support (pointer events: down/move/up)
 *  - HANDOFF §38.61 disipline: reduced-motion blanket otomatik
 *    (transition-[box-shadow] CSS reduced-motion universal reset
 *    ile kapatılır)
 *
 * Pulse §11 değişiklikleri:
 *  - HANDOFF `BZ.lime` → `#C6F24E` inline hex
 *  - HANDOFF `BZ.muteSoft` → `#737373`
 *  - JetBrains Mono label → `pulse-eyebrow` utility (CLAUDE.md §11)
 */

import { useRef, useState } from 'react';

export interface APSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** İnt. "BU AYIN AI YANIT KOTASI" gibi mono uppercase label */
  label?: string;
  /** Suffix shown next to value, e.g. "%" or " gün" */
  suffix?: string;
  /** Step size for keyboard navigation (default 1) */
  step?: number;
  /** Disabled state — drag + keyboard ignored, opacity 50 */
  disabled?: boolean;
  /** Custom aria-label (label prop yoksa görsel label görünmez) */
  ariaLabel?: string;
}

/**
 * Calculate value from pointer X coordinate over slider track.
 * Saf yardımcı — caller responsibility resolve track rect.
 */
function pointerXToValue(
  clientX: number,
  rect: DOMRect,
  min: number,
  max: number,
  step: number,
): number {
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const raw = min + ratio * (max - min);
  // Snap to step
  const stepped = Math.round((raw - min) / step) * step + min;
  return Math.max(min, Math.min(max, stepped));
}

export function APSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
  suffix = '',
  step = 1,
  disabled = false,
  ariaLabel,
}: APSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;
  const clampedPct = Math.max(0, Math.min(100, pct));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) onChange(pointerXToValue(e.clientX, rect, min, max, step));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) onChange(pointerXToValue(e.clientX, rect, min, max, step));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next = value;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(max, value + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(min, value - step);
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      case 'PageUp':
        next = Math.min(max, value + step * 10);
        break;
      case 'PageDown':
        next = Math.max(min, value - step * 10);
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
  };

  return (
    <div className={disabled ? 'opacity-50' : ''}>
      {label ? (
        <div className="mb-2 flex items-center justify-between">
          <span className="pulse-eyebrow text-[#737373]">{label}</span>
          <span
            className="text-[11px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {value}
            {suffix}
          </span>
        </div>
      ) : null}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel ?? label ?? 'Slider'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`relative h-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{ background: 'rgba(10, 10, 10, 0.08)' }}
      >
        {/* Lime fill */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 rounded-full bg-[#C6F24E]"
          style={{ width: `${clampedPct}%` }}
        />
        {/* Thumb */}
        <div
          aria-hidden="true"
          className="absolute h-[18px] w-[18px] rounded-full border-2 border-[#0A0A0A] bg-white transition-shadow duration-[160ms]"
          style={{
            left: `${clampedPct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: dragging
              ? '0 0 0 6px rgba(198, 242, 78, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)'
              : '0 2px 6px rgba(0, 0, 0, 0.2)',
          }}
        />
      </div>
    </div>
  );
}
