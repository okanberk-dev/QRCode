import { ReactNode } from "react";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, htmlFor, error, required, children, className = "" }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className={`block ${className}`}>
      <span
        className="block mb-1.5"
        style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A" }}
      >
        {label}
        {required && <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>}
      </span>
      {hint && (
        <span
          className="block mb-2"
          style={{ fontSize: 11.5, color: "#737373", lineHeight: 1.45 }}
        >
          {hint}
        </span>
      )}
      {children}
      {error && (
        <span
          className="block mt-1.5"
          style={{ fontSize: 11.5, color: "#DC2626", lineHeight: 1.45 }}
        >
          {error}
        </span>
      )}
    </label>
  );
}

export default Field;
