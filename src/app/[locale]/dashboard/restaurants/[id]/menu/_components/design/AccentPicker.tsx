'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Check, Plus } from 'lucide-react';
import { contrastRatio, normaliseHex } from '@/lib/qr-colors';
import { useMenuCopy } from '../kit/useMenuCopy';
import { ACCENT_SWATCHES, findSwatch } from '../menu-theme';

type Choice = { key: string; hex: string | null; name: string };

/**
 * "Vurgu rengi" (spec §7.11): twelve named swatches, the owner's custom colour
 * when there is one, and "Varsayılan" (null → the business colour) as one
 * radio group with arrow-key roving; "Özel renk" opens the native picker. Only
 * the preview changes until "Uygula".
 */
export function AccentPicker({
  value, fallback, isTr, disabled, onChange,
}: {
  /** Draft accent (`null` = default). */
  value: string | null;
  /** What the menu shows for `null` (business colour). */
  fallback: string;
  isTr: boolean;
  disabled?: boolean;
  onChange: (hex: string | null) => void;
}) {
  const copy = useMenuCopy();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = value ? normaliseHex(value) ?? value : null;
  const custom = current !== null && findSwatch(current) === null ? current : null;

  const choices: Choice[] = [
    ...ACCENT_SWATCHES.map((s) => ({ key: s.hex, hex: s.hex, name: isTr ? s.tr : s.en })),
    ...(custom ? [{ key: 'custom', hex: custom, name: `${copy.design.customChip} ${custom}` }] : []),
    { key: 'default', hex: null, name: copy.design.defaultAccent },
  ];
  const selected = Math.max(0, choices.findIndex((c) => c.hex === current));

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + choices.length) % choices.length;
    onChange(choices[next].hex);
    refs.current[next]?.focus();
  };

  const effective = current ?? fallback;

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-labelledby="menu-design-accent" className="flex flex-wrap items-center gap-2">
        {choices.map((choice, index) => {
          const on = index === selected;
          const common = {
            ref: (el: HTMLButtonElement | null) => {
              refs.current[index] = el;
            },
            type: 'button' as const,
            role: 'radio',
            'aria-checked': on,
            'aria-label': choice.name,
            title: choice.name,
            tabIndex: on ? 0 : -1,
            disabled,
            onClick: () => onChange(choice.hex),
            onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onKeyDown(e, index),
          };
          if (choice.hex === null) {
            return (
              <button
                key={choice.key}
                {...common}
                className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:opacity-60 pointer-fine:h-9 ${
                  on ? 'border-pn-ink bg-pn-ink text-white' : 'border-pn-line-strong bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-pn-ink'
                }`}
              >
                <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: fallback }} aria-hidden="true" />
                {choice.name}
              </button>
            );
          }
          // A tick must stay visible on pale colours (lime) and on dark ones.
          const tick = contrastRatio('#FFFFFF', choice.hex) < 3 ? '#0A0A0A' : '#FFFFFF';
          return (
            <button
              key={choice.key}
              {...common}
              style={{ backgroundColor: choice.hex }}
              className={`relative h-11 w-11 rounded-full transition-transform duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink focus-visible:ring-offset-2 disabled:opacity-60 pointer-fine:h-9 pointer-fine:w-9 ${
                on ? 'ring-2 ring-pn-ink ring-offset-2' : 'ring-1 ring-black/10 motion-safe:hover:scale-105'
              }`}
            >
              {on && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <Check size={14} strokeWidth={3} style={{ color: tick }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-dashed border-[#A3A3A3] px-3.5 text-[13px] font-medium text-[#525252] transition-colors focus-within:border-pn-ink focus-within:ring-2 focus-within:ring-pn-accent hover:border-pn-ink hover:text-pn-ink pointer-fine:min-h-9 ${
            disabled ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <input
            type="color"
            value={effective.toLowerCase()}
            aria-label={copy.design.custom}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <Plus size={13} strokeWidth={2.25} aria-hidden="true" />
          {copy.design.custom}
        </label>
        <span className="font-mono text-[12px] text-[#737373]">{effective.toUpperCase()}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-[#737373]">{copy.design.accentHint}</p>
    </div>
  );
}
