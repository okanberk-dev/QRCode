import { Skeleton, CardSkeleton, StatCardSkeleton } from '@/components/ui';

// §40.10 — restaurant detail loading. Wrapper birebir page.tsx:122
// (`mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8`).

export default function RestaurantDetailLoading() {
  return (
    <div
      className="mx-auto max-w-[1100px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
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
          <Skeleton width={64} height={10} />
          <Skeleton width="44%" height={28} />
          <Skeleton width="62%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={96} height={32} rounded={999} />
          <Skeleton width={88} height={32} rounded={999} />
        </div>
      </div>

      {/* 4-stat KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Section cards */}
      <div className="grid gap-3 lg:grid-cols-2">
        <CardSkeleton height={220} />
        <CardSkeleton height={220} />
      </div>
      <CardSkeleton height={160} />
    </div>
  );
}
