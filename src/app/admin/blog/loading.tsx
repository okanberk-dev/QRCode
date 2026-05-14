import { Skeleton, StatCardSkeleton, TableSkeleton } from '@/components/ui';

// §40.10 — admin blog loading. Wrapper birebir page.tsx:133
// (`mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5`).

export default function AdminBlogLoading() {
  return (
    <div
      className="mx-auto max-w-[1280px] space-y-3.5 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={56} height={10} />
          <Skeleton width="28%" height={28} />
          <Skeleton width="54%" height={12} />
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

      {/* Filter toolbar */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={64} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        <Skeleton width={200} height={32} rounded={999} />
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <TableSkeleton rows={10} cols={6} />
      </div>

      {/* Mobile card list */}
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-2">
            <Skeleton width="70%" height={13} />
            <Skeleton width="50%" height={11} />
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
