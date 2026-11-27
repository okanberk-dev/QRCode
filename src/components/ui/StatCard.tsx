import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PanoNumber } from "@/components/panel/pano/PanoNumber";
import { Sparkline } from "./Sparkline";
import { InfoTip } from "./InfoTip";

export type DeltaKind = "up" | "down" | "neutral";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaKind?: DeltaKind;
  deltaSuffix?: ReactNode;
  /** Grey line under the value when there is no change pill (e.g. the
   *  period the number covers). Ignored when `delta` is set. */
  caption?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  className?: string;
  /**
   * Optional daily/window series — render alanında alt satırda mini chart
   * (CLAUDE.md §38.18, .design-owner-2026/page-analytics.jsx parity).
   * Min 2 nokta gerekir; geçilmezse veya tek nokta varsa render skip.
   */
  sparkline?: number[];
  /** Sparkline colour (default: Pano black with a light green area). */
  sparklineColor?: string;
  /** Metric definition, shown behind an ⓘ (CLAUDE.md §58). */
  info?: string;
  isTr?: boolean;
}

const CHANGE_CLASS: Record<DeltaKind, string> = {
  up: "pn-change--up",
  down: "pn-change--down",
  neutral: "pn-change--flat",
};

/**
 * Pano KPI card (docs/design/DASHBOARD_DESIGN.md §5.4–5.5, Fintora "New
 * Customers" header): white card, grey label with an ⓘ, a 40px grey icon
 * circle top right, a medium number with a grey fraction, then a soft
 * change pill and the grey period it compares against.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaKind = "up",
  deltaSuffix,
  caption,
  icon,
  accent,
  className = "",
  sparkline,
  sparklineColor = "var(--color-pn-accent)",
  info,
  isTr = true,
}: StatCardProps) {
  const showSparkline = sparkline !== undefined && sparkline.length >= 2;
  const isAccentLine = sparklineColor === "var(--color-pn-accent)" || sparklineColor.toUpperCase() === "#78FC90";

  return (
    <div className={`bz-card relative flex min-w-0 flex-col p-5 sm:p-6 ${className}`}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="inline-flex min-h-[40px] min-w-0 items-center gap-1 text-[14px] leading-[1.3] text-[#737373] [overflow-wrap:anywhere]">
          {label}
          {info && typeof label === "string" && <InfoTip text={info} label={label} isTr={isTr} />}
        </span>
        {icon && (
          <span
            aria-hidden="true"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-canvas text-pn-ink sm:inline-flex"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 max-w-full text-[32px] leading-none text-pn-ink [overflow-wrap:anywhere] sm:mt-4 sm:text-[36px]">
        <PanoNumber value={value} locale={isTr ? "tr" : "en"} />
      </div>
      {delta ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug">
          <span className={`pn-change ${CHANGE_CLASS[deltaKind]} h-auto min-h-[24px] max-w-full whitespace-normal py-[3px]`}>
            {deltaKind === "up" && <ArrowUpRight size={14} aria-hidden="true" />}
            {deltaKind === "down" && <ArrowDownRight size={14} aria-hidden="true" />}
            {delta}
          </span>
          {deltaSuffix && (
            <span className="min-w-0 text-[13px] leading-snug text-[#9A9A9A] [overflow-wrap:anywhere]">
              {deltaSuffix}
            </span>
          )}
        </div>
      ) : (
        caption && (
          <p className="mt-3 flex min-h-[24px] items-center text-[13px] leading-snug text-[#9A9A9A] [overflow-wrap:anywhere]">
            {caption}
          </p>
        )
      )}
      {showSparkline && (
        <div className="mt-4">
          <Sparkline
            values={sparkline}
            w={200}
            h={36}
            color={sparklineColor}
            fill={isAccentLine ? "var(--color-pn-accent-soft)" : undefined}
            strokeWidth={1.75}
            className="w-full"
          />
        </div>
      )}
      {accent && (
        <span
          aria-hidden="true"
          className={`absolute h-2 w-2 rounded-full ${icon ? "right-[22px] top-[22px] sm:right-[26px] sm:top-[26px]" : "right-4 top-4"}`}
          style={{ background: accent }}
        />
      )}
    </div>
  );
}

interface StatCardSkeletonProps {
  className?: string;
}

export function StatCardSkeleton({ className = "" }: StatCardSkeletonProps) {
  // Tracks StatCard: 40px label row, 32/36px number (mt-3 / sm:mt-4), 24px
  // change pill row (mt-3) — loading→loaded stays CLS=0.
  return (
    <div className={`bz-card p-5 sm:p-6 ${className}`}>
      <div className="flex h-10 items-center justify-between gap-2">
        <div className="bz-skeleton h-[14px] w-24" />
        <div className="bz-skeleton hidden h-10 w-10 rounded-full sm:block" />
      </div>
      <div className="bz-skeleton mt-3 h-[32px] w-28 sm:mt-4 sm:h-[36px]" />
      <div className="bz-skeleton mt-3 h-6 w-32 rounded-full" />
    </div>
  );
}

export default StatCard;
