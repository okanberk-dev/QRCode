import { Skeleton, StatCardSkeleton } from '@/components/ui';

// §38.75 — Admin reviews list loading skeleton. Cross-restaurant feedback
// inbox (multi-tab + filter + paginated table).

export default function AdminReviewsLoading() {
  return (
    <div
      className="mx-auto max-w-[1400px] px-4 sm:px-7 py-6 lg:py-8 space-y-5 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={88} height={10} />
          <Skeleton width="36%" height={28} />
          <Skeleton width="60%" height={12} />
        </div>
        <Skeleton width={120} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* 4-stat quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Tab strip + search */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={`t-${i}`} width={72} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        <Skeleton width={200} height={32} rounded={999} />
      </div>

      {/* Review list */}
      <div className="bz-card p-0 overflow-hidden">
        <div className="divide-y divide-[#EDEDED]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton width={36} height={36} rounded={999} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton width="38%" height={13} />
                  <Skeleton width="22%" height={11} />
                </div>
                <Skeleton width={56} height={20} rounded={999} />
                <Skeleton width={64} height={11} className="hidden sm:block" />
              </div>
              <Skeleton width="92%" height={11} />
              <Skeleton width="68%" height={11} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
