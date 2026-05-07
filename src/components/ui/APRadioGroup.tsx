'use client';

/**
 * Stage 37 §38.117 — HANDOFF §8 step 4 (Panel atomları) APRadioGroup.
 *
 * Radio group with row/col layout. HANDOFF admin-panel.jsx:496-518
 * spec birebir; eklenen değer:
 *  - Pulse §11 styling (Tailwind utility)
 *  - A11y: native `<input type="radio">` + `<label>` wrapping +
 *    `role="radiogroup"` + keyboard navigation (browser native)
 *  - Mevcut `<RadioCard>` (CLAUDE.md §23.3) "büyük tıklanabilir card"
 *    için tasarlandı; APRadioGroup compact inline option list için —
 *    farklı UX, redundant değil.
 */

import { useId } from 'react';

export interface APRadioOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional sublabel beneath main label */
  sublabel?: string;
  /** Disable individual option */
  disabled?: boolean;
}

export interface APRadioGroupProps<T extends string = string> {
  options: APRadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Layout direction. Row default (HANDOFF spec). */
  layout?: 'row' | 'col';
  /** Override input name (form submit için). Default unique useId. */
  name?: string;
  /** Disable entire group */
  disabled?: boolean;
  /** ARIA label for the radiogroup */
  ariaLabel?: string;
}

export function APRadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  layout = 'row',
  name,
  disabled = false,
  ariaLabel,
}: APRadioGroupProps<T>) {
  const generatedId = useId();
  const groupName = name ?? `radio-group-${generatedId}`;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={`flex ${layout === 'row' ? 'flex-row gap-4' : 'flex-col gap-2'}`}
    >
      {options.map((option) => {
        const checked = option.value === value;
        const optionDisabled = disabled || option.disabled;
        return (
          <label
            key={option.value}
            className={`inline-flex items-center gap-2 ${
              optionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={checked}
              disabled={optionDisabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 ${
                checked
                  ? 'border-[#0A0A0A]'
                  : 'border-[#0A0A0A]/25'
              }`}
            >
              {checked ? (
                <span className="h-2 w-2 rounded-full bg-[#0A0A0A]" />
              ) : null}
            </span>
            <span className="flex flex-col">
              <span className="text-[13px] text-[#0A0A0A]">{option.label}</span>
              {option.sublabel ? (
                <span className="text-[11px] text-[#737373]">{option.sublabel}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
