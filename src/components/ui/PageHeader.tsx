import { ReactNode } from "react";
import { PanelBreadcrumb } from "@/components/panel/pano/PanelBreadcrumb";

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
  /** Last breadcrumb step. Defaults to `title` when it is plain text; pass
   *  a string when the title is not (or reads differently), `false` to hide
   *  the breadcrumb. */
  crumb?: string | false;
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
  crumb,
  className = "",
}: PageHeaderProps) {
  // Pano page header (docs/design/DASHBOARD_DESIGN.md §5.2): folder
  // breadcrumb, a medium title, actions on the right on the same baseline.
  // Eyebrows are not shown (the design has no label above headings); the
  // props stay for callers.
  const titleClass =
    titleScale === 'compact'
      ? 'text-[24px] leading-[1.2] sm:text-[28px] lg:text-[30px]'
      : 'text-[28px] leading-[1.15] sm:text-[32px] lg:text-[34px]';
  const crumbText = crumb === false ? undefined : crumb ?? (typeof title === 'string' ? title : undefined);
  return (
    <div
      className={`mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end lg:mb-6 ${className}`}
    >
      <div className="min-w-0 flex-1">
        {crumb !== false && (
          <div className="hidden sm:block">
            <PanelBreadcrumb current={crumbText} />
          </div>
        )}
        <div className="min-w-0">
          <h1
            // min-w-0 + break-words: long single-word business names overflowed at 375px.
            className={`min-w-0 break-words font-medium tracking-[-0.02em] text-pn-ink ${titleClass} ${titleClassName}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[14px] leading-[1.5] text-[#9A9A9A]">{subtitle}</p>
          )}
          {description && (
            <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-[#737373]">{description}</p>
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
