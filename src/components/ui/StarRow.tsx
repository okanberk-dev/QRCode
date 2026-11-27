import { Star } from "lucide-react";

interface StarRowProps {
  value: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  className?: string;
  /** Localised accessible name. Defaults to the English "{value} of 5 stars". */
  ariaLabel?: string;
}

export function StarRow({
  value,
  size = 12,
  color = "var(--color-pn-accent)",
  emptyColor = "#E5E5E5",
  className = "",
  ariaLabel,
}: StarRowProps) {
  return (
    <span
      className={`inline-flex gap-0.5 ${className}`}
      role="img"
      aria-label={ariaLabel ?? `${value} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((s) => {
        const active = s <= value;
        return (
          <Star
            key={s}
            size={size}
            color={active ? color : emptyColor}
            fill={active ? color : "transparent"}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
}

export default StarRow;
