import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { InfoTip } from "./InfoTip";

export type DeltaKind = "up" | "down" | "neutral";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaKind?: DeltaKind;
  deltaSuffix?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  className?: string;
  /**
   * Optional daily/window series — render alanında alt satırda mini chart
   * (CLAUDE.md §38.18, .design-owner-2026/page-analytics.jsx parity).
   * Min 2 nokta gerekir; geçilmezse veya tek nokta varsa render skip.
   */
  sparkline?: number[];
  /** Sparkline rengi (default lime-deep `#A8D62E`). */
  sparklineColor?: string;
  /** Metric definition, shown behind an ⓘ (CLAUDE.md §58). */
  info?: string;
  isTr?: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  deltaKind = "up",
  deltaSuffix,
  icon,
  accent,
  className = "",
  sparkline,
  sparklineColor = "#A8D62E",
  info,
  isTr = true,
}: StatCardProps) {
  const deltaColor =
    deltaKind === "up" ? "#15803D" : deltaKind === "down" ? "#B91C1C" : "#737373";
  const showSparkline = sparkline !== undefined && sparkline.length >= 2;

  return (
    <div
      className={`bz-card relative min-w-0 p-4 sm:p-6 transition-shadow hover:shadow-sm ${className}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 text-[12.5px] font-medium leading-[1.3] text-[#525252] [overflow-wrap:anywhere]">
          {label}
          {info && typeof label === "string" && <InfoTip text={info} label={label} isTr={isTr} />}
        </span>
        {icon && (
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAFAFA] text-[#525252] sm:h-8 sm:w-8"
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className="bz-h-tight mt-2.5 max-w-full text-[21px] leading-none tabular-nums [overflow-wrap:anywhere] sm:mt-3 sm:text-[27px]"
        style={{ lineHeight: 1.02, letterSpacing: 0 }}
      >
        {value}
      </div>
      {delta && (
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-snug sm:mt-2.5 sm:text-xs">
          <span
            className="inline-flex min-w-0 items-center gap-1 font-semibold tabular-nums"
            style={{ color: deltaColor }}
          >
            {deltaKind === "up" && <TrendingUp size={12} strokeWidth={2} />}
            {deltaKind === "down" && <TrendingDown size={12} strokeWidth={2} />}
            {delta}
          </span>
          {deltaSuffix && (
            <span className="min-w-0 text-[10.5px] leading-snug text-[#737373] [overflow-wrap:anywhere] sm:text-[11px]">
              {deltaSuffix}
            </span>
          )}
        </div>
      )}
      {showSparkline && (
        <div className="mt-3">
          <Sparkline values={sparkline} w={200} h={28} color={sparklineColor} className="w-full" />
        </div>
      )}
      {accent && (
        <span
          aria-hidden="true"
          className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full"
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
  // Padding + child sizes track StatCard exactly so loading→loaded transition
  // is CLS=0. Mobile p-3.5 (14px) → sm:p-[18px] (22.5px) matches StatCard:45.
  // Eyebrow ~11px, value h-[21px] mobile → h-[27px] sm (matches text-[21px]
  // mt-2.5 / sm:text-[27px] sm:mt-3 on the real card), delta h-[11px] mt-2 →
  // h-3 mt-2.5 sm.
  return (
    <div className={`bz-card p-4 sm:p-6 ${className}`}>
      <div className="bz-skeleton h-[11px] w-20" />
      <div className="bz-skeleton mt-2.5 sm:mt-3 h-[21px] sm:h-[27px] w-24" />
      <div className="bz-skeleton mt-2 sm:mt-2.5 h-[11px] w-32" />
    </div>
  );
}

export default StatCard;
