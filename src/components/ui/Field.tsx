import { Children, cloneElement, isValidElement, ReactElement, ReactNode, useId } from "react";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

interface InjectableProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
}

export function Field({ label, hint, htmlFor, error, required, children, className = "" }: FieldProps) {
  // Stable, unique IDs for hint + error so we can wire them via aria-describedby
  // on the wrapped input. If the caller passes an htmlFor, we honor it; otherwise
  // we generate one and forward it to the first child element.
  const reactId = useId();
  const inputId = htmlFor || `field-${reactId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  // Forward id + aria-describedby + aria-invalid to the first child element.
  // This keeps usage ergonomic: <Field label="X" hint="Y"><input className="bz-input" /></Field>
  const enhancedChildren = Children.map(children, (child, index) => {
    if (index !== 0 || !isValidElement(child)) return child;
    const existing = child.props as InjectableProps;
    return cloneElement(child as ReactElement<InjectableProps>, {
      id: existing.id || inputId,
      "aria-describedby": [existing["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
      "aria-invalid": error ? true : existing["aria-invalid"],
      "aria-required": required ? true : existing["aria-required"],
    });
  });

  return (
    <label htmlFor={inputId} className={`block ${className}`}>
      <span
        className="block mb-1.5"
        style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A" }}
      >
        {label}
        {required && (
          <span style={{ color: "#DC2626", marginLeft: 4 }} aria-hidden="true">
            *
          </span>
        )}
      </span>
      {hint && (
        <span
          id={hintId}
          className="block mb-2"
          style={{ fontSize: 11.5, color: "#737373", lineHeight: 1.45 }}
        >
          {hint}
        </span>
      )}
      {enhancedChildren}
      {error && (
        <span
          id={errorId}
          role="alert"
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
