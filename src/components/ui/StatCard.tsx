import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Eyebrow } from "./Eyebrow";
import { Sparkline } from "./Sparkline";

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
}: StatCardProps) {
  const deltaColor =
    deltaKind === "up" ? "#16A34A" : deltaKind === "down" ? "#DC2626" : "#737373";
  const showSparkline = sparkline !== undefined && sparkline.length >= 2;

  return (
    <div
      className={`bz-card relative p-4 sm:p-[18px] transition-shadow hover:shadow-sm ${className}`}
    >
      <div className="flex justify-between items-start gap-2">
        <Eyebrow>{label}</Eyebrow>
        {icon && (
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAFAFA] text-[#525252]"
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className="bz-h-tight mt-2.5 sm:mt-3 text-[22px] sm:text-[28px] tabular-nums"
        style={{ lineHeight: 1.05, letterSpacing: "-0.025em" }}
      >
        {value}
      </div>
      {delta && (
        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs">
          <span
            className="inline-flex items-center gap-1 font-semibold tabular-nums"
            style={{ color: deltaColor }}
          >
            {deltaKind === "up" && <TrendingUp size={12} strokeWidth={2} />}
            {deltaKind === "down" && <TrendingDown size={12} strokeWidth={2} />}
            {delta}
          </span>
          {deltaSuffix && (
            <span className="text-[10.5px] sm:text-[11px] text-[#737373]">{deltaSuffix}</span>
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
  return (
    <div className={`bz-card p-[18px] ${className}`}>
      <div className="bz-skeleton h-3 w-20" />
      <div className="bz-skeleton mt-3 h-7 w-24" />
      <div className="bz-skeleton mt-2.5 h-3 w-32" />
    </div>
  );
}

export default StatCard;
