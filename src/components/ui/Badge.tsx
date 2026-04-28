import { CSSProperties, ReactNode } from "react";

export type BadgeKind = "ok" | "off" | "warn" | "danger" | "info" | "lime" | "ghost";

interface BadgeProps {
  kind?: BadgeKind;
  dot?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Badge({ kind = "off", dot = true, children, className = "", style }: BadgeProps) {
  return (
    <span className={`bz-badge bz-badge--${kind} ${className}`} style={style}>
      {dot && <span className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;
