import { Skeleton, StatCardSkeleton, TableSkeleton } from '@/components/ui';

// §38.75 — Admin customers list loading skeleton. Cross-restaurant müşteri
// listesi. Owner customers/loading.tsx paterni (CLAUDE.md §38.40) admin
// için adapt: 4-stat KPI + filter toolbar + 7-col tablo (segment+sentiment).

export default function AdminCustomersLoading() {
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
          <Skeleton width={48} height={10} />
          <Skeleton width="36%" height={28} />
          <Skeleton width="58%" height={12} />
        </div>
        <Skeleton width={120} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* 4-stat KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Filter toolbar — segment pills + range chips + restaurant select + search */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`s-${i}`} width={72} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        <Skeleton width={200} height={32} rounded={999} />
      </div>

      {/* Tablo desktop (7-col) */}
      <div className="hidden lg:block">
        <TableSkeleton rows={8} cols={7} />
      </div>

      {/* Mobile card list */}
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-2.5">
            <div className="flex items-start gap-3">
              <Skeleton width={36} height={36} rounded={999} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton width="60%" height={13} />
                <Skeleton width="40%" height={11} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton width={70} height={20} rounded={999} />
              <Skeleton width={60} height={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
