import { ReactNode } from "react";

interface LegendDotProps {
  color: string;
  label: ReactNode;
  className?: string;
}

export function LegendDot({ color, label, className = "" }: LegendDotProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{ color: "#525252", fontSize: 11 }}
    >
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: 2, background: color }}
      />
      {label}
    </span>
  );
}

export default LegendDot;
