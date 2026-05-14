import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/ui';

// §40.10 — admin plans loading. Wrapper birebir page.tsx:79
// (`mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8`). Plan distribution
// + recent paying + 3 plan tier cards.

export default function AdminPlansLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={88} height={10} />
        <Skeleton width="32%" height={28} />
        <Skeleton width="58%" height={12} />
      </div>

      {/* Plan distribution KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Recent paying customers */}
      <CardSkeleton height={280} />

      {/* 3 plan tier cards (Starter / Growth / Pro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <CardSkeleton height={360} />
        <CardSkeleton height={360} />
        <CardSkeleton height={360} />
      </div>
    </div>
  );
}
