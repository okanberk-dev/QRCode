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
      <span className="mb-2 block text-[14px] font-medium leading-[1.3] text-pn-ink">
        {label}
        {required && (
          <span className="ml-1 text-[#E5484D]" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {hint && (
        <span id={hintId} className="mb-2 block text-[13px] leading-[1.45] text-[#737373]">
          {hint}
        </span>
      )}
      {enhancedChildren}
      {error && (
        <span id={errorId} role="alert" className="mt-2 block text-[13px] leading-[1.45] text-[#D92D20]">
          {error}
        </span>
      )}
    </label>
  );
}

export default Field;
