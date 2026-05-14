import { Skeleton, StatCardSkeleton, TableSkeleton } from '@/components/ui';

// §40.10 — admin newsletters loading. Wrapper birebir page.tsx:200
// (`mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8`).

export default function AdminNewslettersLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={72} height={10} />
          <Skeleton width="36%" height={28} />
          <Skeleton width="58%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={96} height={32} rounded={999} />
          <Skeleton width={120} height={32} rounded={999} />
        </div>
      </div>

      {/* 4-stat KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Filter toolbar */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={72} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        <Skeleton width={200} height={32} rounded={999} />
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <TableSkeleton rows={8} cols={5} />
      </div>

      {/* Mobile card list */}
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-2">
            <Skeleton width="68%" height={13} />
            <Skeleton width="44%" height={11} />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton width={56} height={22} rounded={6} />
              <Skeleton width={48} height={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
