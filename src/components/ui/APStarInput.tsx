'use client';

/**
 * Stage 37 §38.117 — HANDOFF §8 step 4 (Panel atomları) APStarInput.
 *
 * 5-yıldız rating input, hover preview, lime-deep fill. HANDOFF
 * admin-panel.jsx:600-621 spec birebir; eklenen değer:
 *  - Pulse §11 styling (Tailwind utility + inline hex)
 *  - A11y: `role="radiogroup"` + native `<input type="radio">` (sr-only)
 *    + keyboard ←/→ + Enter/Space + ARIA labels
 *  - Mevcut `<StarRow>` (CLAUDE.md §23.3) display-only; APStarInput
 *    interactive input — farklı concern, redundant değil.
 *
 * Pulse §11 değişiklikleri:
 *  - HANDOFF `BZ.limeDeep` (#A8D62E) → `#A8D62E` inline hex
 *  - Hover state lime fill, default empty state graphite stroke
 */

import { useId, useState } from 'react';

export interface APStarInputProps {
  /** Mevcut puan (1-5). 0 → henüz seçilmedi. */
  value: number;
  /** Star tıklanırsa veya keyboard input'la değişirse */
  onChange: (value: number) => void;
  /** Yıldız boyutu (px). Default 22px (HANDOFF spec). */
  size?: number;
  /** Disabled state — interaction ignored */
  disabled?: boolean;
  /** Override input name (form submit için). Default unique useId. */
  name?: string;
  /** Required flag (form validation) */
  required?: boolean;
  /** ARIA label for the radiogroup */
  ariaLabel?: string;
}

const STAR_PATH =
  'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z';

export function APStarInput({
  value,
  onChange,
  size = 22,
  disabled = false,
  name,
  required = false,
  ariaLabel,
}: APStarInputProps) {
  const [hover, setHover] = useState(0);
  const generatedId = useId();
  const groupName = name ?? `star-input-${generatedId}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next = value;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(5, (value || 0) + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(1, (value || 1) - 1);
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = 5;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? 'Yıldız puanı'}
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`inline-flex gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hover || value) >= star;
        const checked = value === star;
        return (
          <label
            key={star}
            className={`relative inline-flex items-center justify-center p-0.5 ${
              disabled ? '' : 'cursor-pointer'
            }`}
            onMouseEnter={() => !disabled && setHover(star)}
            onMouseLeave={() => !disabled && setHover(0)}
            aria-label={`${star} yıldız`}
          >
            <input
              type="radio"
              name={groupName}
              value={star}
              checked={checked}
              disabled={disabled}
              required={required && star === 1}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="transition-colors duration-150"
            >
              <path
                d={STAR_PATH}
                fill={filled ? '#A8D62E' : 'rgba(10, 10, 10, 0.1)'}
                stroke={filled ? '#A8D62E' : 'rgba(10, 10, 10, 0.2)'}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </label>
        );
      })}
    </div>
  );
}
