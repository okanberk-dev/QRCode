// src/components/roi-calculator/InputField.tsx
'use client';

interface InputFieldProps {
  id:          string;
  label:       string;
  hint?:       string;
  placeholder: string;
  value:       string;
  onChange:    (v: string) => void;
  type?:       string;
  min?:        string;
  max?:        string;
  step?:       string;
}

export function InputField({
  id, label, hint, placeholder, value, onChange,
  type = 'text', min, max, step,
}: InputFieldProps) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 mb-1.5">
        <label htmlFor={id} className="text-sm font-bold text-[#0A0A0A]">
          {label}
        </label>
        {hint && (
          <span
            id={`${id}-hint`}
            className="text-[11px] font-medium text-[#6B7280]"
          >
            {hint}
          </span>
        )}
      </div>
      <div className="relative group">
        <input
          id={id}
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full rounded-xl border-2 border-[#0A0A0A] bg-white px-4 py-3
                     text-sm text-[#0A0A0A] font-bold placeholder:text-[#C9D0DB]
                     focus:border-[#C6F24E] focus:outline-none focus:ring-4
                     focus:ring-[#C6F24E]/10 transition-all
                     shadow-sm focus:shadow-none focus:translate-y-[2px]
                     [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
