import { CSSProperties, ReactNode } from "react";
import { toSentenceCase } from "@/components/panel/pano/sentence-case";

interface EyebrowProps {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Eyebrow({ children, color = "#9A9A9A", className = "", style }: EyebrowProps) {
  // Pano: sentence-case labels, never ALL CAPS (DASHBOARD_DESIGN.md §3).
  const content = typeof children === "string" ? toSentenceCase(children) : children;
  return (
    <span className={`pulse-eyebrow ${className}`} style={{ color, ...style }}>
      {content}
    </span>
  );
}

export default Eyebrow;
