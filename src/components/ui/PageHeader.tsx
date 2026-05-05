import { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

interface PageHeaderProps {
  eyebrow?: ReactNode;
  eyebrowColor?: string;
  /** Phase 8c+ §38.27 — eyebrow yanında lime pulse-dot ("canlı" indicator).
   *  Tasarım `.design-owner-2026/page-dashboard.jsx` "PANEL / GENEL BAKIŞ ●"
   *  paterni. */
  eyebrowPulse?: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Phase 8c+ §38.27 — title altında kompakt subtitle ("Restoran · Tarih ·
   *  Son güncelleme" gibi). description'dan farklı: subtitle inline meta,
   *  description daha uzun açıklama. İkisi birlikte verilebilir. */
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  eyebrowColor,
  eyebrowPulse,
  title,
  description,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-5 ${className}`}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <span className="inline-flex items-center gap-1.5">
            <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>
            {eyebrowPulse && (
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bz-pulse-dot"
                style={{ background: "#C6F24E" }}
              />
            )}
          </span>
        )}
        <h1
          /* §38.65 — Apple HIG type-first hierarchy upgrade: h1 clamp range
             20-28px → 28-40px (sm: 28px, lg: 40px). Owner panel hero scale
             "CEO confidence" hissi. `bz-h-tight-2` Space Grotesk weight 500 +
             tight tracking (-0.03em) sabit; sadece size scale up. */
          className="bz-h-tight-2 mt-1"
          style={{
            fontSize: "clamp(28px, 5vw, 40px)",
            lineHeight: 1.05,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="bz-mono mt-2"
            style={{ fontSize: 12, color: "#737373", lineHeight: 1.5 }}
          >
            {subtitle}
          </p>
        )}
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
