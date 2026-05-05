import { Skeleton, StatCardSkeleton } from "@/components/ui";

// §38.71 — QR segment loading skeleton (Next.js segment-bazlı loading.tsx).
// Tasarım: PageHeader + KPI 4-card + form/preview grid + 3-col history.
// Apple-premium content-shape (CLAUDE.md §11.17).

export default function QrLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader skeleton */}
      <div className="space-y-2">
        <Skeleton width={56} height={10} />
        <Skeleton width="36%" height={32} />
        <Skeleton width="52%" height={12} />
      </div>

      {/* KPI 4-card strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Generator card (form + preview 2-col) */}
      <div className="bz-card p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <Skeleton height={40} rounded={10} />
          <Skeleton height={40} rounded={10} />
          <Skeleton height={40} rounded={10} />
          <Skeleton height={40} rounded={10} />
          <Skeleton width={140} height={36} rounded={999} />
        </div>
        <div className="bz-card p-5 flex flex-col items-center gap-3">
          <Skeleton width={200} height={200} rounded={16} />
          <Skeleton width={120} height={32} rounded={999} />
        </div>
      </div>

      {/* History — 3-col QR card grid */}
      <div>
        <Skeleton width={96} height={11} className="mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
    </div>
  );
}
