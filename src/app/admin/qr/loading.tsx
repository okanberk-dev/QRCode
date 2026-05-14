import { Skeleton, StatCardSkeleton } from '@/components/ui';

// §40.10 — admin QR loading. Wrapper birebir page.tsx:363
// (`mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-4`).

export default function AdminQrLoading() {
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
          <Skeleton width={56} height={10} />
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

      {/* Filter strip */}
      <div className="flex flex-wrap gap-2">
        <Skeleton width={160} height={32} rounded={10} />
        <Skeleton width={180} height={32} rounded={10} />
      </div>

      {/* QR grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Skeleton width="60%" height={13} />
              <Skeleton width={48} height={20} rounded={999} />
            </div>
            <Skeleton width="80%" height={11} />
            <div className="flex gap-2 pt-2">
              <Skeleton width={64} height={28} rounded={999} />
              <Skeleton width={64} height={28} rounded={999} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
