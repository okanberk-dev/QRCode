import { Skeleton } from '@/components/ui';

// §40.10 — admin mail-templates loading. Wrapper birebir page.tsx:95
// (`mx-auto max-w-[1100px] space-y-4 px-4 sm:px-7 py-6 lg:py-8`).

export default function AdminMailTemplatesLoading() {
  return (
    <div
      className="mx-auto max-w-[1100px] space-y-4 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={72} height={10} />
        <Skeleton width="40%" height={28} />
        <Skeleton width="62%" height={12} />
      </div>

      {/* Locale toggle */}
      <div className="flex items-center gap-2">
        <Skeleton width={64} height={32} rounded={999} />
        <Skeleton width={64} height={32} rounded={999} />
      </div>

      {/* 3x6 = 18 template card grid (3 × 2 locale) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bz-card p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton width="50%" height={13} />
              <Skeleton width={48} height={20} rounded={999} />
            </div>
            <Skeleton width="80%" height={11} />
            <Skeleton width="68%" height={11} />
            <div className="flex items-center gap-2 pt-2">
              <Skeleton width={72} height={28} rounded={999} />
              <Skeleton width={72} height={28} rounded={999} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
