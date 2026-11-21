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
  /** §38.66 — Title scale prop (Apple HIG hero vs kompakt 3-col layout):
   *   - `hero` (default, §38.65): clamp(28px, 5vw, 40px) — Dashboard, Hesabım,
   *     Settings gibi hero scale sayfalar
   *   - `compact`: clamp(22px, 4vw, 32px) — Yorumlar / Müşteriler / Analitik
   *     gibi yoğun 3-col layout sayfalar (h1 ezici hissedilebilir, daha
   *     mütevazı). PR-1 visual regression riski'ni absorb eder. */
  titleScale?: 'hero' | 'compact';
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
  titleScale = 'hero',
  className = "",
}: PageHeaderProps) {
  // §38.66 — titleScale variant: hero (Apple HIG default) vs compact
  // (yoğun 3-col layout için mütevazı). Her ikisinde de `bz-h-tight-2`
  // Space Grotesk weight 500 + tight tracking sabit; sadece size scale.
  // §49 — shadcn dashboard scale (text-2xl/3xl semibold) in the Geist panels.
  // §53 (docs/design/panel-design-system.md §2): page title 24/30 (phones 22/28), DM Sans 600.
  const titleStyle = titleScale === 'compact'
    ? { fontSize: 'clamp(20px, 2.2vw, 22px)', lineHeight: 1.25 }
    : { fontSize: 'clamp(22px, 2.4vw, 24px)', lineHeight: 1.25 };
  return (
    <div
      className={`flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-6 ${className}`}
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
          /* §38.65 — Apple HIG type-first hierarchy upgrade. §38.66'da
             titleScale prop ile per-callsite override (hero vs compact)
             eklendi; default hero (Dashboard/Hesabım/Settings için 28-40px),
             compact yoğun 3-col layout (Yorumlar/Müşteriler/Analitik için
             22-32px) ezici hissedilmesini önler. `bz-h-tight-2` Space Grotesk
             weight 500 + tight tracking sabit. */
          // min-w-0 + break-words: tek kelimelik uzun işletme adları 375px'te
          // taşıp kırpılıyordu.
          className="bz-h-tight-2 mt-1 min-w-0 break-words"
          style={titleStyle}
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
            style={{ fontSize: 13.5, color: "#737373", lineHeight: 1.5 }}
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
