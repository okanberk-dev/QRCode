import { Skeleton, CardSkeleton, StatCardSkeleton } from '@/components/ui';

// §40.10 — platforms hub loading. Wrapper birebir page.tsx:117/207
// (`space-y-5` — outer mx-auto/max-w shell tarafında handle ediliyor).

export default function PlatformsLoading() {
  return (
    <div
      className="space-y-5 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={88} height={10} />
        <Skeleton width="36%" height={28} />
        <Skeleton width="62%" height={12} />
      </div>

      {/* Platform health KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Platform card grid (12 plat) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} height={160} />
        ))}
      </div>
    </div>
  );
}
