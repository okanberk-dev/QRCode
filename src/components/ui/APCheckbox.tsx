'use client';

/**
 * Stage 47 §38.128 — Pulse §11 + HANDOFF Toggles_Switches_Checkbox
 * görsel referansı + admin-panel.jsx Inputs section. Checkbox primitive
 * indeterminate state desteğiyle.
 *
 * Stage 37 §38.117'de "APCheckbox: native + Tailwind peer-* paterni
 * mevcut, ihtiyaç çıkarsa extract" backlog notu. Şimdi 4+ callsite
 * ihtiyacı var (bulk action toolbar'larda):
 *  - owner CustomersBulkBar (§38.48)
 *  - admin/restaurants bulk activate/deactivate (§11.19)
 *  - admin/members bulk mail (§38.97)
 *  - admin/reviews bulk flag/assign (§11.12)
 *
 * Hepsinde manuel `ref.indeterminate = ...` pattern + native input.
 * APCheckbox primitive bu pattern'ı tek source-of-truth'a taşır:
 *  - `checked: boolean` + `indeterminate: boolean` opsiyonel
 *  - 3-state visual: unchecked / checked / indeterminate (− mark)
 *  - black fill + white tick when checked, grey border default
 *  - A11y: `aria-checked={indeterminate ? 'mixed' : checked}`,
 *    native input sr-only, focus-visible lime ring
 *  - HANDOFF design: lime check icon + indeterminate line + label
 *
 * Pulse §11 + §23.3 disipline:
 *  - pn-* tokens (black fill + white tick when checked, grey border)
 *  - lucide Check + Minus icons
 *  - `bz-motion-spring` transition (Stage 11.34 §38.67 paterni)
 */

import { forwardRef, useEffect, useId, useRef } from 'react';
import { Check, Minus } from 'lucide-react';

export interface APCheckboxProps {
  /** Mevcut checked state */
  checked: boolean;
  /** Indeterminate state (önceliklidir; checked görsel olarak override eder) */
  indeterminate?: boolean;
  /** State değişimi callback */
  onChange: (next: boolean) => void;
  /** Label — string veya ReactNode (callsite tarafında custom typography
   *  gerekirse JSX olarak geçirilebilir, örn. mono uppercase tracking) */
  label?: React.ReactNode;
  /** Sublabel (label altı, küçük muted text) */
  sublabel?: React.ReactNode;
  /** Label custom className (text wrapper span'ine apply edilir) */
  labelClassName?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size — default 'md' (18px), 'sm' (16px) */
  size?: 'sm' | 'md';
  /** ARIA label override (label yoksa zorunlu) */
  ariaLabel?: string;
  /** Required (form submit) */
  required?: boolean;
  /** Custom className for wrapper */
  className?: string;
  /** Native input name */
  name?: string;
  /** Native input value */
  value?: string;
  /** Native input için ek attr'lar — `data-*` forward (örn. CustomersBulkBar
   *  `data-customer-key`, `data-select-all` ile DOM query yapar). */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'checked' | 'disabled' | 'onChange' | 'name' | 'value' | 'required' | 'aria-label' | 'aria-checked'
  >;
}

const SIZE = {
  sm: { box: 'h-4 w-4', icon: 11 },
  md: { box: 'h-[18px] w-[18px]', icon: 13 },
} as const;

export const APCheckbox = forwardRef<HTMLInputElement, APCheckboxProps>(function APCheckbox(
  {
    checked,
    indeterminate = false,
    onChange,
    label,
    sublabel,
    labelClassName = '',
    disabled = false,
    size = 'md',
    ariaLabel,
    required = false,
    className = '',
    name,
    value,
    inputProps,
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const generatedId = useId();
  const inputId = `ap-checkbox-${generatedId}`;
  const s = SIZE[size];

  // Sync indeterminate state with native input element
  useEffect(() => {
    const el = localRef.current;
    if (el) {
      el.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  // Resolve external ref (forwarded) + local ref
  const setRef = (node: HTMLInputElement | null) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  // Indeterminate önceliklidir — visual olarak checked override
  const visualState: 'on' | 'off' | 'mixed' = indeterminate ? 'mixed' : checked ? 'on' : 'off';

  return (
    <label
      htmlFor={inputId}
      className={`group inline-flex items-start gap-2.5 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${className}`}
    >
      {/* Native input (sr-only) — form submit + a11y semantic.
          `inputProps` `data-*` attr forward için (CustomersBulkBar
          DOM-query pattern). */}
      <input
        {...inputProps}
        ref={setRef}
        id={inputId}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        aria-checked={indeterminate ? 'mixed' : checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />

      {/* Visual checkbox — black fill + white tick when checked */}
      <span
        aria-hidden
        data-state={visualState}
        className={[
          'ap-check-box relative inline-flex shrink-0 items-center justify-center rounded-[5px] border-[1.5px]',
          'bz-motion-spring',
          'group-focus-within:ring-2 group-focus-within:ring-pn-accent group-focus-within:ring-offset-1',
          visualState === 'off'
            ? 'border-pn-line-strong bg-white text-pn-ink group-hover:border-pn-ink'
            : 'border-pn-accent bg-pn-accent text-white',
          s.box,
          'mt-0.5',
        ].join(' ')}
      >
        {visualState === 'on' && (
          <Check size={s.icon} strokeWidth={3} color="currentColor" aria-hidden />
        )}
        {visualState === 'mixed' && (
          <Minus size={s.icon} strokeWidth={3} color="currentColor" aria-hidden />
        )}
      </span>

      {/* Label + sublabel — callsite custom typography gerekirse
          `labelClassName` prop'la override edilir (örn. mono uppercase
          tracking-wider admin/restaurants bulk bar paterni). */}
      {(label || sublabel) && (
        <span className="flex flex-col gap-0.5">
          {label && (
            <span
              className={[
                'text-[13px] leading-[1.35]',
                disabled ? 'text-[#A3A3A3]' : 'text-pn-ink',
                labelClassName,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {label}
              {required && <span className="ml-0.5 text-[#DC2626]" aria-hidden>*</span>}
            </span>
          )}
          {sublabel && (
            <span className="text-[11.5px] leading-[1.4] text-[#737373]">{sublabel}</span>
          )}
        </span>
      )}
    </label>
  );
});

export default APCheckbox;
