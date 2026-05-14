import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — admin site-settings loading. Wrapper birebir page.tsx:153
// (`mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-5 pb-32`).

export default function AdminSiteSettingsLoading() {
  return (
    <div
      className="mx-auto max-w-[1100px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 pb-32 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={88} height={10} />
          <Skeleton width="36%" height={28} />
          <Skeleton width="58%" height={12} />
        </div>
        <Skeleton width={120} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* Section cards */}
      <CardSkeleton height={240} />
      <CardSkeleton height={220} />
      <CardSkeleton height={300} />
      <CardSkeleton height={200} />
    </div>
  );
}
