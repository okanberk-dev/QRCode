'use client';

import { useId, useRef } from 'react';
import { Plus } from 'lucide-react';

interface ColorPickerProps {
  /** Current hex value (e.g. "#C6F24E"). Empty string treated as unset. */
  value: string;
  onChange: (hex: string) => void;
  /** Preset swatches; defaults match `.design-pulse-2026/...OwnerSettings` brand row. */
  swatches?: string[];
  /** Optional aria-label for the radiogroup. */
  ariaLabel?: string;
  /** Disable the entire picker (e.g. read-only billing mirror). */
  disabled?: boolean;
}

const DEFAULT_SWATCHES = [
  '#C6F24E', // Pulse lime
  '#0A0A0A', // Graphite
  '#FFFFFF', // Pure white
  '#F97316', // Orange
  '#3B82F6', // Blue
];

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Brand color picker — preset swatch row + native `<input type="color">`
 * fallback for arbitrary hex. Mirrors the design's "MARKA RENGİ" cluster
 * (lime active + 4 alternates + "+" custom). Returns 6-digit hex strings.
 */
export function ColorPicker({
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
  ariaLabel,
  disabled = false,
}: ColorPickerProps) {
  const groupId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = value && HEX.test(value) ? value.toUpperCase() : '';
  const isCustom = normalized !== '' && !swatches.map((s) => s.toUpperCase()).includes(normalized);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : groupId}
      className="flex items-center gap-2 flex-wrap"
    >
      {swatches.map((hex) => {
        const active = normalized === hex.toUpperCase();
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={hex}
            disabled={disabled}
            onClick={() => onChange(hex.toUpperCase())}
            className="relative h-9 w-9 rounded-[10px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: hex,
              border: active
                ? '2px solid #0A0A0A'
                : hex.toUpperCase() === '#FFFFFF'
                  ? '1px solid #E5E5E5'
                  : '1px solid transparent',
            }}
          />
        );
      })}

      <button
        type="button"
        role="radio"
        aria-checked={isCustom}
        aria-label="Custom color"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-dashed border-pn-line-strong text-[#737373] hover:border-pn-ink hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        style={
          isCustom
            ? {
                backgroundColor: normalized,
                border: '2px solid #0A0A0A',
              }
            : undefined
        }
      >
        {isCustom ? null : <Plus size={14} strokeWidth={2.25} aria-hidden />}
        <input
          ref={inputRef}
          type="color"
          value={normalized || '#0A0A0A'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          disabled={disabled}
        />
      </button>
    </div>
  );
}
