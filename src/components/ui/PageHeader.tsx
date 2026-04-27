import { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

interface PageHeaderProps {
  eyebrow?: ReactNode;
  eyebrowColor?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  eyebrowColor,
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-5 ${className}`}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>}
        <h1
          className="bz-h-tight-2 mt-1"
          style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="mt-2 max-w-2xl"
            style={{ fontSize: 13, color: "#525252", lineHeight: 1.55 }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

export default PageHeader;
