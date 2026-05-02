import { Star } from "lucide-react";

interface StarRowProps {
  value: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  className?: string;
}

export function StarRow({
  value,
  size = 12,
  color = "#C6F24E",
  emptyColor = "#E5E5E5",
  className = "",
}: StarRowProps) {
  return (
    <span
      className={`inline-flex gap-0.5 ${className}`}
      role="img"
      aria-label={`${value} of 5 stars`}
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
