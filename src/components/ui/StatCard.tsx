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
  /**
   * §53 tile tone (docs/design/panel-design-system.md §4.3): `default` white
   * card, `lime` / `sand` pastel tiles, `graphite` the filled highlight tile.
   */
  tone?: "default" | "lime" | "sand" | "graphite";
}

const TONE_CLASS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "",
  lime: "!bg-[#EAF9B8] !shadow-none",
  sand: "!bg-[#F4EFE6] !shadow-none",
  graphite: "!bg-[#0A0A0A] !shadow-none text-white",
};

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
  tone = "default",
}: StatCardProps) {
  const dark = tone === "graphite";
  // On the graphite tile the delta uses lighter shades so it stays readable (AA).
  const deltaColor = dark
    ? deltaKind === "up" ? "#C6F24E" : deltaKind === "down" ? "#FCA5A5" : "rgba(255,255,255,0.7)"
    : deltaKind === "up" ? "#16A34A" : deltaKind === "down" ? "#DC2626" : "#737373";
  const showSparkline = sparkline !== undefined && sparkline.length >= 2;

  return (
    <div
      className={`bz-card relative min-w-0 p-3.5 sm:p-[18px] transition-shadow hover:shadow-sm ${TONE_CLASS[tone]} ${className}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <Eyebrow
          color={dark ? "rgba(255,255,255,0.68)" : tone === "default" ? "#737373" : "#525252"}
          className="min-w-0 max-w-[calc(100%-2.25rem)] leading-[1.25] [overflow-wrap:anywhere]"
        >
          {label}
        </Eyebrow>
        {icon && (
          <span
            aria-hidden="true"
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8 ${
              dark ? "bg-white/10 text-[#C6F24E]" : tone === "default" ? "bg-[#F4F4F5] text-[#525252]" : "bg-white/70 text-[#0A0A0A]"
            }`}
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
            <span className={`min-w-0 text-[10.5px] leading-snug [overflow-wrap:anywhere] sm:text-[11px] ${dark ? "text-white/60" : "text-[#737373]"}`}>
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
    <div className={`bz-card p-3.5 sm:p-[18px] ${className}`}>
      <div className="bz-skeleton h-[11px] w-20" />
      <div className="bz-skeleton mt-2.5 sm:mt-3 h-[21px] sm:h-[27px] w-24" />
      <div className="bz-skeleton mt-2 sm:mt-2.5 h-[11px] w-32" />
    </div>
  );
}

export default StatCard;
