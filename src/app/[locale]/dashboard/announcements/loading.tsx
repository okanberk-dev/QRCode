import { Skeleton } from '@/components/ui';

// §40.10 — owner announcements loading. Wrapper birebir page.tsx:89
// (`mx-auto max-w-[980px] px-4 sm:px-7 py-6 lg:py-8`).

export default function OwnerAnnouncementsLoading() {
  return (
    <div
      className="mx-auto max-w-[980px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={88} height={10} />
        <Skeleton width="40%" height={28} />
        <Skeleton width="62%" height={12} />
      </div>

      {/* Announcement list cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Skeleton width={56} height={20} rounded={999} />
              <Skeleton width={64} height={11} />
            </div>
            <Skeleton width="68%" height={14} />
            <Skeleton width="92%" height={11} />
            <Skeleton width="78%" height={11} />
          </div>
        ))}
      </div>
    </div>
  );
}
