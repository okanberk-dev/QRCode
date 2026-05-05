import { Skeleton } from '@/components/ui';

// §38.73 — Menu builder editor loading skeleton. Stage 1 §38.71 content-shape
// paterni reuse; generic Loader2 yerine 2-col panel (340px categories + 1fr
// items) + sağ rail preview shimmer (lg:+ desktop).

export default function MenuBuilderLoading() {
  return (
    <div
      className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-5 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* Custom hero skeleton (back link + eyebrow + icon+title + description + status row) */}
      <div className="rounded-3xl border border-[#EDEDED] bg-white p-6 sm:p-8 space-y-3">
        <Skeleton width={88} height={11} />
        <Skeleton width={48} height={10} />
        <div className="flex items-center gap-3">
          <Skeleton width={44} height={44} rounded={16} />
          <Skeleton width="40%" height={28} />
        </div>
        <Skeleton width="62%" height={12} />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={88} height={32} rounded={999} />
          ))}
        </div>
      </div>

      {/* 2-col grid: categories panel + items panel */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Categories panel skeleton */}
        <section className="rounded-3xl border border-[#EDEDED] bg-white overflow-hidden">
          <div className="border-b border-[#EDEDED] px-5 py-4 flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton width={88} height={10} />
              <Skeleton width={56} height={10} />
            </div>
            <Skeleton width={120} height={28} rounded={999} />
          </div>
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#EDEDED] p-3 space-y-1.5">
                <Skeleton width="60%" height={12} />
                <Skeleton width="35%" height={10} />
              </div>
            ))}
          </div>
        </section>

        {/* Items panel skeleton */}
        <section className="rounded-3xl border border-[#EDEDED] bg-white overflow-hidden">
          <div className="border-b border-[#EDEDED] px-5 py-4 flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton width={64} height={10} />
              <Skeleton width="40%" height={14} />
            </div>
            <Skeleton width={120} height={32} rounded={999} />
          </div>
          <div className="divide-y divide-[#EDEDED]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <Skeleton width={56} height={56} rounded={12} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="50%" height={13} />
                  <Skeleton width="80%" height={11} />
                </div>
                <Skeleton width={64} height={11} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
