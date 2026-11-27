import { ReactNode } from "react";
import { PageBackButton } from "@/components/panel/pano/PageBackButton";

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
  /** Extra classes on the h1 (e.g. `hidden sm:block` when a page shows its
   *  title inside a mobile hero card instead). */
  titleClassName?: string;
  className?: string;
}

export function PageHeader({
  eyebrow: _eyebrow,
  eyebrowColor: _eyebrowColor,
  eyebrowPulse: _eyebrowPulse,
  title,
  description,
  subtitle,
  actions,
  titleScale = 'hero',
  titleClassName = "",
  className = "",
}: PageHeaderProps) {
  // Pano page header (docs/design/DASHBOARD_DESIGN.md §5.2): round back
  // button, a large light title, actions on the right. Eyebrows are not shown
  // (the design has no label above headings); the props stay for callers.
  const titleClass =
    titleScale === 'compact'
      ? 'text-[28px] leading-[1.15] sm:text-[32px] lg:text-[36px]'
      : 'text-[32px] leading-[1.1] sm:text-[38px] lg:text-[46px]';
  return (
    <div
      className={`mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center lg:mb-7 ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4 lg:gap-5">
        <PageBackButton />
        <div className="min-w-0 flex-1">
          <h1
            // min-w-0 + break-words: long single-word business names overflowed at 375px.
            className={`min-w-0 break-words font-normal tracking-[-0.01em] text-pn-ink ${titleClass} ${titleClassName}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[14px] leading-[1.5] text-[#9A9AA0]">{subtitle}</p>
          )}
          {description && (
            <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-[#6E6E73]">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export default PageHeader;
