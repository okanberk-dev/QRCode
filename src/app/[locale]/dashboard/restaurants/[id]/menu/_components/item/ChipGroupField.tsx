'use client';

import { Check } from 'lucide-react';

/**
 * Labels (tinted like the public menu) or allergens (graphite when on) as
 * grouped toggle chips. Names are visible text, never `title` only.
 */
export function ChipGroupField<K extends string>({
  legend, groups, labelOf, tintOf, selected, onChange, disabled, hint, clearLabel, countLabel,
}: {
  legend: string;
  groups: { label: string; items: K[] }[];
  labelOf: (key: K) => string;
  /** Badge tints; allergens pass nothing (graphite). */
  tintOf?: (key: K) => { bg: string; fg: string; border?: string };
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  hint?: string;
  clearLabel?: string;
  countLabel?: string;
}) {
  const toggle = (key: string) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1.5 text-[12px] font-semibold text-[#0A0A0A]">
        {legend}
        {countLabel && <span className="ml-1.5 font-normal text-[#737373]">· {countLabel}</span>}
      </legend>
      {hint && <p className="mb-2 text-[12px] leading-relaxed text-[#737373]">{hint}</p>}
      <div className="space-y-2.5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-[12px] text-[#737373]">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((key) => {
                const on = selected.includes(key);
                const tint = tintOf?.(key);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(key)}
                    style={on && tint ? { background: tint.bg, color: tint.fg, borderColor: tint.border ?? tint.bg } : undefined}
                    className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:opacity-50 pointer-fine:h-8 ${
                      on
                        ? tint
                          ? 'shadow-sm'
                          : 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                        : 'border-[#E5E5E5] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {on && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}
                    {labelOf(key)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {clearLabel && selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 min-h-11 text-[12.5px] font-medium text-[#525252] underline-offset-2 hover:underline pointer-fine:min-h-8"
        >
          {clearLabel}
        </button>
      )}
    </fieldset>
  );
}
