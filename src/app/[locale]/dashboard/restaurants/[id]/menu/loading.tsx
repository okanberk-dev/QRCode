import { Skeleton } from '@/components/ui';

// §38.73 — Menu builder loading skeleton. Wrapper tracks the real page
// (`dashboard/restaurants/[id]/menu/page.tsx:779`) exactly:
//   `mx-auto max-w-7xl space-y-6 p-4 pb-24 sm:p-6 sm:pb-24 md:p-10 lg:pb-10`.
// max-w-7xl ≡ 1280px in Tailwind; the previous `max-w-[1280px]` was the same
// width but the padding system was wrong (`px-4 sm:px-7 py-6 lg:py-8` instead
// of the menu's responsive `p-4 sm:p-6 md:p-10`). Hero card uses rounded-3xl
// + p-6 sm:p-8; categories/items panels use rounded-3xl.

export default function MenuBuilderLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-4 pb-24 sm:p-6 sm:pb-24 md:p-10 lg:pb-10 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* Hero card — back link + eyebrow + icon + title + description + meta row */}
      <div className="relative overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        <div className="relative flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3 flex-1">
              {/* back link eyebrow */}
              <Skeleton width={120} height={12} />
              {/* page eyebrow */}
              <Skeleton width={56} height={10} />
              {/* icon + title row */}
              <div className="flex items-center gap-3">
                <Skeleton width={44} height={44} rounded={16} />
                <Skeleton width="42%" height={32} />
              </div>
              {/* description */}
              <Skeleton width="62%" height={13} />
              {/* status pill row */}
              <div className="flex items-center gap-3">
                <Skeleton width={88} height={11} />
                <Skeleton width={4} height={4} rounded={999} />
                <Skeleton width={144} height={11} />
              </div>
            </div>
            {/* Actions cluster — Preview / Menu QR / Analytics / View / Publish */}
            <div className="flex flex-wrap gap-2">
              {[88, 96, 112, 104, 104].map((w, i) => (
                <Skeleton key={i} width={w} height={36} rounded={10} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2-col body: categories panel (lg:340px) + items panel (1fr) */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Categories panel */}
        <section className="rounded-3xl border border-[#EDEDED] bg-white overflow-hidden">
          <div className="border-b border-[#EDEDED] px-5 py-4 flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton width={88} height={10} />
              <Skeleton width={56} height={10} />
            </div>
            <Skeleton width={120} height={32} rounded={999} />
          </div>
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#EDEDED] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton width="60%" height={13} />
                  <Skeleton width={24} height={20} rounded={6} />
                </div>
                <Skeleton width="35%" height={10} />
              </div>
            ))}
          </div>
        </section>

        {/* Items panel */}
        <section className="rounded-3xl border border-[#EDEDED] bg-white overflow-hidden">
          <div className="border-b border-[#EDEDED] px-5 py-4 flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton width={64} height={10} />
              <Skeleton width="40%" height={14} />
            </div>
            <Skeleton width={120} height={32} rounded={999} />
          </div>
          <div className="divide-y divide-[#EDEDED]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <Skeleton width={56} height={56} rounded={12} />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Skeleton width="50%" height={13} />
                  <Skeleton width="80%" height={11} />
                </div>
                <Skeleton width={64} height={11} className="hidden sm:block" />
                <Skeleton width={28} height={28} rounded={999} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
