import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — owner account/settings hub loading. Wrapper birebir page.tsx:224
// (`mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8`). Hub has section
// tabs + tabbed content area (profile / brand / notifications / billing /
// danger zone). Skeleton mirrors the tab + content shape.

export default function AccountLoading() {
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
        <Skeleton width={64} height={10} />
        <Skeleton width="32%" height={28} />
        <Skeleton width="58%" height={12} />
      </div>

      {/* Section tabs (Profil / Marka / Bildirim / Faturalama / Tehlikeli) */}
      <div className="flex flex-wrap gap-2 border-b border-[#EDEDED] pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={96} height={32} rounded={999} />
        ))}
      </div>

      {/* Tabbed content */}
      <div className="space-y-4">
        <CardSkeleton height={220} />
        <CardSkeleton height={200} />
      </div>
    </div>
  );
}
