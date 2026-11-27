import { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  rounded?: number | string;
}

export function Skeleton({ className = "", width, height, style, rounded }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bz-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded,
        ...style,
      }}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({ rows = 6, cols = 5, className = "" }: TableSkeletonProps) {
  // Header padding matches `.bz-table th` (10px 14px) + row padding matches
  // `.bz-table td` (14px). Width/height/border-radius track the final table
  // so loading→loaded transition is CLS=0.
  return (
    <div className={`bz-card overflow-hidden ${className}`}>
      <div
        className="flex gap-3"
        style={{ padding: "10px 14px", background: "var(--color-pn-canvas)", borderBottom: "1px solid var(--color-pn-line)" }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={11} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-3"
          style={{ padding: "14px", borderBottom: "1px solid var(--color-pn-line)" }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  height?: number;
  className?: string;
}

export function CardSkeleton({ height = 120, className = "" }: CardSkeletonProps) {
  return (
    <div className={`bz-card p-5 ${className}`}>
      <Skeleton height={11} width={80} />
      <Skeleton height={28} width="60%" className="mt-3" />
      <Skeleton height={height - 80} className="mt-4" />
    </div>
  );
}

export default Skeleton;
