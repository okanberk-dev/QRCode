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
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        {hint && (
          <span
            id={`${id}-hint`}
            className="text-[11px] text-gray-400"
          >
            {hint}
          </span>
        )}
      </div>
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
        className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5
                   text-sm text-gray-900 placeholder:text-gray-300
                   focus:border-[#FDBF1D] focus:outline-none focus:ring-2
                   focus:ring-[#FDBF1D]/30 transition-colors"
      />
    </div>
  );
}
