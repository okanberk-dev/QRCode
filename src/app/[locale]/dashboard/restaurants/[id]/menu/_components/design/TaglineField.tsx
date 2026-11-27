'use client';

import { useEffect, useId, useState } from 'react';
import { MENU_TAGLINE_MAX, sanitizeTagline } from '@/lib/menu-design';
import { useMenuCopy } from '../kit/useMenuCopy';

/**
 * "Slogan" (menu-design-final §11.1): one line, at most 80 characters, with a
 * live counter. The raw text stays local (so a trailing space can be typed);
 * the draft gets `sanitizeTagline(raw)` on every change, and empty removes it.
 * When the draft changes from outside (Vazgeç, Geri al) the field resyncs.
 * Rendered on the menu as a plain text node only.
 */
export function TaglineField({
  value, disabled, onChange,
}: {
  /** Draft tagline (sanitised), `null` = none. */
  value: string | null;
  disabled?: boolean;
  onChange: (raw: string) => void;
}) {
  const copy = useMenuCopy();
  const id = useId();
  const [raw, setRaw] = useState(value ?? '');

  useEffect(() => {
    setRaw((current) => ((sanitizeTagline(current) ?? null) === (value ?? null) ? current : value ?? ''));
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={raw}
          maxLength={MENU_TAGLINE_MAX}
          disabled={disabled}
          placeholder={copy.design.taglinePlaceholder}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            setRaw(e.target.value);
            onChange(e.target.value);
          }}
          className="bz-input pr-14 text-[16px] sm:text-[14px]"
          autoComplete="off"
          enterKeyHint="done"
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[12px] tabular-nums ${
            raw.length >= MENU_TAGLINE_MAX ? 'text-[#B42318]' : 'text-[#A3A3A3]'
          }`}
        >
          {copy.design.taglineCounter(raw.length)}
        </span>
      </div>
      <p id={`${id}-hint`} className="text-[13px] leading-relaxed text-[#737373]">
        {copy.design.taglineHint}
      </p>
    </div>
  );
}
