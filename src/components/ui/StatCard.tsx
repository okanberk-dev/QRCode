import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Eyebrow } from "./Eyebrow";

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
}: StatCardProps) {
  const deltaColor =
    deltaKind === "up" ? "#16A34A" : deltaKind === "down" ? "#DC2626" : "#737373";

  return (
    <div className={`bz-card relative p-[18px] ${className}`}>
      <div className="flex justify-between items-start gap-2">
        <Eyebrow>{label}</Eyebrow>
        {icon && <span style={{ color: "#A3A3A3" }}>{icon}</span>}
      </div>
      <div
        className="bz-h-tight mt-3"
        style={{ fontSize: 28, lineHeight: 1, letterSpacing: "-0.025em" }}
      >
        {value}
      </div>
      {delta && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: deltaColor }}
          >
            {deltaKind === "up" && <TrendingUp size={12} strokeWidth={2} />}
            {deltaKind === "down" && <TrendingDown size={12} strokeWidth={2} />}
            {delta}
          </span>
          {deltaSuffix && <span style={{ color: "#737373" }}>{deltaSuffix}</span>}
        </div>
      )}
      {accent && (
        <span
          aria-hidden="true"
          className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full"
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
