import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/ui';

// §40.10 — admin/dev lifecycle-emails loading. Wrapper birebir page.tsx:124
// (`mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-6`).

export default function AdminLifecycleEmailsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-6 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
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
        <Skeleton width={150} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* 4-stat KPI (sent 7d/30d/total/byType) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        <Skeleton width={160} height={32} rounded={10} />
        <Skeleton width={120} height={32} rounded={10} />
      </div>

      {/* Last 50 log table */}
      <CardSkeleton height={420} />
    </div>
  );
}
