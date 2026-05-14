import { Skeleton } from '@/components/ui';

// §40.10 — admin announcements loading. Wrapper birebir page.tsx:207
// (`mx-auto max-w-[980px] px-4 sm:px-7 py-6 lg:py-8`).

export default function AdminAnnouncementsLoading() {
  return (
    <div
      className="mx-auto max-w-[980px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={72} height={10} />
          <Skeleton width="36%" height={28} />
          <Skeleton width="58%" height={12} />
        </div>
        <Skeleton width={120} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={72} height={32} rounded={999} />
        ))}
      </div>

      {/* Card grid (2-col responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bz-card p-5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Skeleton width={56} height={20} rounded={999} />
              <Skeleton width={64} height={11} />
            </div>
            <Skeleton width="74%" height={14} />
            <Skeleton width="92%" height={11} />
            <Skeleton width="78%" height={11} />
            <div className="flex items-center gap-2 pt-2">
              <Skeleton width={88} height={28} rounded={999} />
              <Skeleton width={72} height={28} rounded={999} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
