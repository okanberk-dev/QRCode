import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — owner guide loading. Wrapper birebir page.tsx:247
// (`mx-auto max-w-[1100px] space-y-6 px-4 sm:px-7 py-6 lg:py-8`).

export default function GuideLoading() {
  return (
    <div
      className="mx-auto max-w-[1100px] space-y-6 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={64} height={10} />
        <Skeleton width="44%" height={28} />
        <Skeleton width="58%" height={12} />
      </div>

      {/* Step cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} height={220} />
        ))}
      </div>

      {/* CTA banner */}
      <CardSkeleton height={140} />
    </div>
  );
}
