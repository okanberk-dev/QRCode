import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/ui';

// §40.10 — restaurants list loading. Wrapper birebir RestaurantsClient.tsx:390
// (`mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8`).

export default function RestaurantsLoading() {
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
          <Skeleton width="32%" height={28} />
          <Skeleton width="56%" height={12} />
        </div>
        <Skeleton width={140} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* Restaurant grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} height={180} />
        ))}
      </div>

      {/* Footer KPI summary (varsa) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  );
}
