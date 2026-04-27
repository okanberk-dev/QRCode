import { CSSProperties, ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Eyebrow({ children, color = "#737373", className = "", style }: EyebrowProps) {
  return (
    <span className={`pulse-eyebrow ${className}`} style={{ color, ...style }}>
      {children}
    </span>
  );
}

export default Eyebrow;
