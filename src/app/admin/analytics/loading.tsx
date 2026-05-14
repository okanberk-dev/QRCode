import { Skeleton, StatCardSkeleton } from '@/components/ui';

// §40.10 — admin analytics loading. Wrapper birebir page.tsx:98
// (`mx-auto max-w-[1200px] px-4 py-6 sm:px-7 lg:py-8 space-y-3.5`).

export default function AdminAnalyticsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-3.5 px-4 py-6 sm:px-7 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={88} height={10} />
          <Skeleton width="40%" height={28} />
          <Skeleton width="58%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={96} height={32} rounded={999} />
          <Skeleton width={120} height={32} rounded={999} />
        </div>
      </div>

      {/* Range bar */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={56} height={32} rounded={999} />
        ))}
      </div>

      {/* KPI 4-stat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Trend chart */}
      <div className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={140} height={14} />
          <Skeleton width={64} height={11} />
        </div>
        <div className="h-[260px] sm:h-[320px] rounded-xl bg-[#F2F2F2] bz-skeleton" />
      </div>

      {/* 2-col breakdown */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="bz-card p-5 space-y-3">
          <Skeleton width={140} height={14} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton width="40%" height={11} />
                <Skeleton width={32} height={11} />
              </div>
              <Skeleton height={6} rounded={999} />
            </div>
          ))}
        </div>
        <div className="bz-card p-5 space-y-3">
          <Skeleton width={140} height={14} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton width="40%" height={11} />
                <Skeleton width={32} height={11} />
              </div>
              <Skeleton height={6} rounded={999} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
