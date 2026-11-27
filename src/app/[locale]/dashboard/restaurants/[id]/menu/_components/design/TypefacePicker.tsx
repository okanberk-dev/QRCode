'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { MENU_TYPEFACES, TYPEFACES, type MenuTypeface } from '@/lib/menu-design';
import { DefaultDot, rovingDelta } from './OptionGroup';

/**
 * "Yazı karakteri" (menu-design-final §11.1): six OFL pairings as a roving
 * radiogroup. Each card shows "Aa" in the display face and a sample item name
 * + price in the item and price faces the menu would use.
 */
export function TypefacePicker({
  labelId, value, defaultValue, names, sample, defaultLabel, disabled, onChange,
}: {
  labelId: string;
  value: MenuTypeface;
  defaultValue: MenuTypeface;
  names: Record<MenuTypeface, string>;
  /** "Mercimek çorbası" / "Lentil soup" */
  sample: string;
  defaultLabel: string;
  disabled?: boolean;
  onChange: (value: MenuTypeface) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = rovingDelta(e);
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + MENU_TYPEFACES.length) % MENU_TYPEFACES.length;
    onChange(MENU_TYPEFACES[next]);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-1 gap-2.5 @min-[420px]:grid-cols-2">
      {MENU_TYPEFACES.map((key, index) => {
        const tf = TYPEFACES[key];
        const on = key === value;
        const isDefault = key === defaultValue;
        return (
          <button
            key={key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={isDefault ? `${names[key]} (${defaultLabel})` : names[key]}
            tabIndex={on ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`relative flex min-w-0 items-center gap-3.5 rounded-[20px] bg-white p-3 text-left transition-shadow duration-[160ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              on ? 'shadow-[0_0_0_2px_#0A0A0A]' : 'shadow-[0_0_0_1px_#E5E5E5] hover:shadow-[0_0_0_1px_#A3A3A3]'
            }`}
            style={{ fontSynthesis: 'none' }}
          >
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#F7F6F3] text-[28px] leading-none text-pn-ink"
              style={{ fontFamily: tf.display, fontWeight: tf.displaySize.weight }}
            >
              Aa
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[14px] font-medium text-pn-ink">{names[key]}</span>
                {isDefault && <DefaultDot on={false} />}
                <span className="truncate text-[12px] text-[#737373]">{tf.family}</span>
              </span>
              <span aria-hidden="true" className="mt-1 flex min-w-0 items-baseline gap-1.5 text-[#262626]">
                <span className="truncate text-[15px] leading-5" style={{ fontFamily: tf.display, fontWeight: tf.item.weight }}>
                  {sample}
                </span>
                <span className="text-[#A3A3A3]">·</span>
                <span
                  className="shrink-0 text-[13px] tabular-nums"
                  style={{ fontFamily: tf.body, fontWeight: tf.price.weight, fontVariantNumeric: 'tabular-nums lining-nums' }}
                >
                  ₺120
                </span>
              </span>
            </span>
            {on && (
              <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-pn-ink" aria-hidden="true">
                <Check size={10} strokeWidth={3} className="text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
