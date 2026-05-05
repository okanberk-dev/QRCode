import { Skeleton, TableSkeleton, StatCardSkeleton } from '@/components/ui';

// §38.75 — Admin restaurants list loading skeleton. Owner Customers
// /loading.tsx paterni reuse (CLAUDE.md §38.40). Status filter pills +
// search + 4-stat summary + tablo.

export default function AdminRestaurantsLoading() {
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
          <Skeleton width={72} height={10} />
          <Skeleton width="32%" height={28} />
          <Skeleton width="56%" height={12} />
        </div>
        <Skeleton width={140} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* 4-stat KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Toolbar — status filter pills + search + sort */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`p-${i}`} width={64} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        <Skeleton width={160} height={32} rounded={999} />
      </div>

      {/* Tablo desktop */}
      <div className="hidden lg:block">
        <TableSkeleton rows={8} cols={6} />
      </div>

      {/* Mobile card list */}
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Skeleton width={40} height={40} rounded={12} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton height={13} width="60%" />
                <Skeleton height={11} width="40%" />
              </div>
              <Skeleton width={56} height={20} rounded={999} />
            </div>
            <Skeleton width="80%" height={11} />
          </div>
        ))}
      </div>
    </div>
  );
}
