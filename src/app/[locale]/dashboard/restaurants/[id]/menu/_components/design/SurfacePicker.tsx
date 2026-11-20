'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { MENU_SURFACES, SURFACES, type MenuSurface } from '@/lib/menu-design';
import { DefaultDot, rovingDelta } from './OptionGroup';

/**
 * "Zemin" (menu-design-final §11.1): the 8 curated surfaces as a roving
 * radiogroup. Each tile is the surface's `bg` with "Aa" in the current
 * display face in its `ink` — exactly what the menu pairs.
 */
export function SurfacePicker({
  labelId, value, defaultValue, names, defaultLabel, displayFont, disabled, onChange,
}: {
  labelId: string;
  value: MenuSurface;
  defaultValue: MenuSurface;
  names: Record<MenuSurface, string>;
  defaultLabel: string;
  /** Display face stack of the current typeface. */
  displayFont: string;
  disabled?: boolean;
  onChange: (value: MenuSurface) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = rovingDelta(e);
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + MENU_SURFACES.length) % MENU_SURFACES.length;
    onChange(MENU_SURFACES[next]);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-4 gap-x-2 gap-y-3 @min-[560px]:grid-cols-8">
      {MENU_SURFACES.map((key, index) => {
        const s = SURFACES[key];
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
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={`relative flex h-11 w-16 max-w-full items-center justify-center rounded-[10px] transition-shadow duration-[160ms] ${
                on ? 'shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#0A0A0A]' : 'group-hover:shadow-[0_0_0_2px_#FFFFFF,0_0_0_3px_#A3A3A3]'
              }`}
              style={{ backgroundColor: s.bg, boxShadow: on ? undefined : `inset 0 0 0 1px ${s.ruleStrong}` }}
            >
              <span className="text-[17px] leading-none" style={{ fontFamily: displayFont, color: s.ink, fontSynthesis: 'none' }}>
                Aa
              </span>
              <span className="absolute bottom-1.5 left-2 right-2 h-px" style={{ backgroundColor: s.rule }} />
              {on && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0A0A0A] shadow-[0_0_0_2px_#FFFFFF]">
                  <Check size={10} strokeWidth={3} className="text-white" />
                </span>
              )}
            </span>
            <span className={`flex max-w-full items-center gap-1 text-[12px] leading-4 ${on ? 'font-semibold text-[#0A0A0A]' : 'text-[#525252]'}`}>
              <span className="truncate">{names[key]}</span>
              {isDefault && <DefaultDot on={false} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
