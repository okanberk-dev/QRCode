import { Skeleton, CardSkeleton } from '@/components/ui';

// §38.73 — Menü Merkezi (hub) loading skeleton. Stage 1 §38.71 content-shape
// paterni reuse; generic Loader2 fallback yerine page-specific anatomi.
// 2+ restoran owner için card-based picker grid'i shimmer ile görünür.

export default function MenuHubLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={48} height={10} />
          <Skeleton width="32%" height={28} />
          <Skeleton width="56%" height={12} />
        </div>
        <Skeleton width={140} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* Restoran picker grid (2+ owner için card-based selection) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} height={140} />
        ))}
      </div>
    </div>
  );
}
