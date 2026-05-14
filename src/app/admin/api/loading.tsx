import { Skeleton, CardSkeleton, TableSkeleton } from '@/components/ui';

// §40.10 — admin API & Webhooks loading. Wrapper birebir page.tsx:185
// (`mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5`).

export default function AdminApiLoading() {
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
        <Skeleton width={56} height={10} />
        <Skeleton width="32%" height={28} />
        <Skeleton width="58%" height={12} />
      </div>

      {/* API keys section */}
      <CardSkeleton height={160} />
      <div className="hidden lg:block">
        <TableSkeleton rows={4} cols={4} />
      </div>

      {/* Webhooks section */}
      <CardSkeleton height={160} />
      <div className="hidden lg:block">
        <TableSkeleton rows={3} cols={4} />
      </div>
    </div>
  );
}
