import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — restaurant settings loading. Wrapper birebir page.tsx:298
// (`mx-auto max-w-[1200px] px-5 sm:px-7 py-12`). SettingsCard içerikleri
// content-shape placeholder.

export default function RestaurantSettingsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-6 px-5 sm:px-7 py-12 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* Back link */}
      <Skeleton width={120} height={11} />

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={88} height={10} />
        <Skeleton width="36%" height={32} />
        <Skeleton width="58%" height={12} />
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#EDEDED] pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={88} height={32} rounded={999} />
        ))}
      </div>

      {/* SettingsCard placeholder grid */}
      <div className="space-y-4">
        <CardSkeleton height={200} />
        <CardSkeleton height={260} />
        <CardSkeleton height={180} />
      </div>
    </div>
  );
}
