'use client';

import type { KeyboardEvent, Ref } from 'react';
import { Check } from 'lucide-react';
import type { ResolvedMenuDesign } from '@/lib/menu-design';
import { ThemeThumb } from '../ThemeThumb';

/**
 * One style in the "Stil" radio group (menu-design-final §11.1): a live mini
 * menu drawn from the resolver with the owner's name and draft accent, the
 * style's name and who it suits. Choosing it changes only the preview.
 * Selection uses Buaze owner styling (graphite ring + check), never menu tokens.
 */
export function ThemeCard({
  resolved, restaurantName, label, vibe, ariaLabel, customizedLabel, customized, checked, disabled, onSelect, onKeyDown, buttonRef,
}: {
  resolved: ResolvedMenuDesign;
  restaurantName: string;
  label: string;
  vibe: string;
  ariaLabel: string;
  customizedLabel: string;
  /** Selected and has knob overrides. */
  customized: boolean;
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
      className={`group relative flex min-w-0 flex-col items-stretch gap-2 rounded-[20px] bg-white p-1.5 text-left transition-[box-shadow,transform] duration-[160ms] ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked
          ? 'shadow-[0_0_0_2px_#5D3EBC]'
          : 'shadow-[0_0_0_1px_#E5E5E5] hover:shadow-[0_0_0_1px_#A3A3A3,0_6px_16px_-10px_rgba(10,10,10,0.35)]'
      }`}
    >
      <span className="relative block">
        <ThemeThumb d={resolved} name={restaurantName} />
        {checked && (
          <span
            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-pn-accent shadow-[0_0_0_2px_#FFFFFF]"
            aria-hidden="true"
          >
            <Check size={12} strokeWidth={3} className="text-white" />
          </span>
        )}
      </span>
      <span className="block px-1 pb-1">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="min-w-0 max-w-full truncate text-[14px] font-medium leading-tight text-pn-ink">{label}</span>
          {customized && (
            <span className="shrink-0 rounded-full bg-pn-accent-soft px-1.5 py-px text-[12px] font-medium leading-4 text-pn-accent">
              {customizedLabel}
            </span>
          )}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-[#737373]">{vibe}</span>
      </span>
    </button>
  );
}
