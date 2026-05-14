import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — admin/dev mail-preview loading. Wrapper birebir page.tsx:52
// (`mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8`).

export default function AdminMailPreviewLoading() {
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
          <Skeleton width="58%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={64} height={32} rounded={999} />
          <Skeleton width={64} height={32} rounded={999} />
        </div>
      </div>

      {/* 20 template card grid (5×4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <CardSkeleton key={i} height={160} />
        ))}
      </div>
    </div>
  );
}
