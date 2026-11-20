'use client';

import type { KeyboardEvent, Ref } from 'react';
import { Check } from 'lucide-react';
import type { MenuTheme } from '@/lib/validations';
import { ThemeThumb } from '../ThemeThumb';

/**
 * One theme in the "Tema" radio group (spec §7.11): the kept `ThemeThumb`
 * drawn with the draft accent, the theme name and who it suits. Choosing it
 * changes only the preview.
 */
export function ThemeCard({
  theme, label, vibe, ariaLabel, accent, checked, disabled, onSelect, onKeyDown, buttonRef,
}: {
  theme: MenuTheme;
  label: string;
  vibe: string;
  ariaLabel: string;
  accent: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={checked ? 0 : -1}
      disabled={disabled}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`group relative flex min-w-0 flex-col items-stretch gap-2.5 rounded-xl border bg-white p-2.5 text-left transition-[border-color,box-shadow] duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] disabled:opacity-60 ${
        checked ? 'border-[#0A0A0A] shadow-[0_0_0_1px_#0A0A0A]' : 'border-[#E5E5E5] hover:border-[#A3A3A3]'
      }`}
    >
      <ThemeThumb theme={theme} accent={accent} />
      <span className="flex items-start justify-between gap-2 px-0.5">
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold leading-tight text-[#0A0A0A]">{label}</span>
          <span className="mt-0.5 block truncate text-[12px] text-[#737373]">{vibe}</span>
        </span>
        {checked && (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C6F24E]" aria-hidden="true">
            <Check size={12} strokeWidth={3} className="text-[#0A0A0A]" />
          </span>
        )}
      </span>
    </button>
  );
}
