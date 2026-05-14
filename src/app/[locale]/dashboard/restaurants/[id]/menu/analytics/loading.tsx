import { Skeleton, StatCardSkeleton } from '@/components/ui';

// §40.10 — menu analytics loading. Wrapper birebir page.tsx:195
// (`mx-auto max-w-[1200px] space-y-6 px-4 sm:px-7 py-6 lg:py-8`).

export default function MenuAnalyticsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-6 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* Back link */}
      <Skeleton width={120} height={11} />

      {/* PageHeader */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={88} height={10} />
          <Skeleton width="40%" height={28} />
          <Skeleton width="58%" height={12} />
        </div>
        <Skeleton width={120} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* Filter bar (range + category + source) */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`r-${i}`} width={56} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        <Skeleton width={140} height={32} rounded={999} />
      </div>

      {/* 4-stat KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Trend chart */}
      <div className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={140} height={14} />
          <Skeleton width={88} height={11} />
        </div>
        <div className="h-[260px] sm:h-[320px] rounded-xl bg-[#F2F2F2] bz-skeleton" />
      </div>

      {/* Category breakdown (horizontal bars) */}
      <div className="bz-card p-5 space-y-3">
        <Skeleton width={160} height={14} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton width="35%" height={12} />
              <Skeleton width={40} height={11} />
            </div>
            <Skeleton height={6} rounded={999} />
          </div>
        ))}
      </div>
    </div>
  );
}
