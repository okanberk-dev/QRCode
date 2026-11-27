'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

/** Arrow keys of a roving radiogroup: +1 / -1, or 0 for any other key. */
export function rovingDelta(e: KeyboardEvent): number {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') return 1;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') return -1;
  return 0;
}

/** Small dot that marks the style's own default value (with an accessible suffix on the control). */
export function DefaultDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-1 w-1 shrink-0 rounded-full ${on ? 'bg-current opacity-70' : 'bg-[#A3A3A3]'}`}
    />
  );
}

/**
 * One generic roving radiogroup for the layout knobs (menu-design-final
 * §11.1): a segmented row; arrows move and select; the selected option is
 * graphite. The style's default carries a small dot and the accessible
 * suffix "(stil varsayılanı)"; choosing it deletes the override.
 */
export function OptionGroup<V extends string>({
  label, options, value, defaultValue, defaultLabel, disabled, onChange, children,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  defaultValue: V;
  /** "stil varsayılanı" */
  defaultLabel: string;
  disabled?: boolean;
  onChange: (value: V) => void;
  /** Notes under the group (e.g. the cover hint). */
  children?: ReactNode;
}) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = rovingDelta(e);
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="min-w-0">
      <p id={labelId} className="mb-2 text-[13px] font-medium text-pn-ink">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex w-full gap-1 rounded-[20px] bg-[#F4F4F4] p-1">
        {options.map((o, index) => {
          const on = index === selected;
          const isDefault = o.value === defaultValue;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={isDefault ? `${o.label} (${defaultLabel})` : o.label}
              tabIndex={on ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[13px] font-medium transition-colors duration-[160ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:cursor-not-allowed disabled:opacity-60 pointer-fine:h-9 ${
                on
                  ? 'bg-pn-accent text-white shadow-[0_1px_2px_rgba(59,31,143,0.25)]'
                  : 'text-[#525252] hover:bg-white hover:text-pn-ink'
              }`}
            >
              <span className="truncate">{o.label}</span>
              {isDefault && <DefaultDot on={on} />}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
