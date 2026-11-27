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
  icon?: ReactNode;
  accent?: string;
  className?: string;
  /**
   * Optional daily/window series — render alanında alt satırda mini chart
   * (CLAUDE.md §38.18, .design-owner-2026/page-analytics.jsx parity).
   * Min 2 nokta gerekir; geçilmezse veya tek nokta varsa render skip.
   */
  sparkline?: number[];
  /** Sparkline colour (default: ink — a thin black line, Pano §5.13). */
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
  sparklineColor = "var(--color-pn-ink)",
  info,
  isTr = true,
}: StatCardProps) {
  const deltaColor =
    deltaKind === "up" ? "#3A8228" : deltaKind === "down" ? "#D92D20" : "#737373";
  const showSparkline = sparkline !== undefined && sparkline.length >= 2;

  // Pano KPI card (docs/design/DASHBOARD_DESIGN.md §5.4–5.5): borderless white
  // card, label + round icon on top, a light number with a grey fraction.
  return (
    <div className={`bz-card relative min-w-0 p-5 sm:p-6 ${className}`}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 text-[14px] leading-[1.3] text-[#737373] [overflow-wrap:anywhere]">
          {label}
          {info && typeof label === "string" && <InfoTip text={info} label={label} isTr={isTr} />}
        </span>
        {icon && (
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pn-line text-pn-ink"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-4 max-w-full text-[30px] leading-none text-pn-ink [overflow-wrap:anywhere] sm:mt-5 sm:text-[36px]">
        <PanoNumber value={value} locale={isTr ? "tr" : "en"} />
      </div>
      {delta && (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug">
          <span className="inline-flex min-w-0 items-center gap-0.5 font-medium tabular-nums" style={{ color: deltaColor }}>
            {deltaKind === "up" && <ArrowUpRight size={15} />}
            {deltaKind === "down" && <ArrowDownRight size={15} />}
            {delta}
          </span>
          {deltaSuffix && (
            <span className="min-w-0 text-[13px] leading-snug text-[#9A9A9A] [overflow-wrap:anywhere]">
              {deltaSuffix}
            </span>
          )}
        </div>
      )}
      {showSparkline && (
        <div className="mt-4">
          <Sparkline values={sparkline} w={200} h={32} color={sparklineColor} className="w-full" />
        </div>
      )}
      {accent && (
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 h-2 w-2 rounded-full"
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
    <div className={`bz-card p-5 sm:p-6 ${className}`}>
      <div className="bz-skeleton h-[14px] w-24" />
      <div className="bz-skeleton mt-4 h-[30px] w-28 sm:mt-5 sm:h-[36px]" />
      <div className="bz-skeleton mt-3 h-[13px] w-32" />
    </div>
  );
}

export default StatCard;
