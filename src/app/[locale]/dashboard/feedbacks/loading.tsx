import { Skeleton, StatCardSkeleton } from "@/components/ui";

// §38.71 — Yorumlar segment loading skeleton (Next.js segment-bazlı loading.tsx).
// Tasarım §38.62: full-width 3-col grid (300 rail + 1fr list + 360 detail),
// padded header section + border-b. Apple-premium content-shape (CLAUDE.md
// §11.17). Mobil'de tek-sütun stack fallback.

export default function FeedbacksLoading() {
  return (
    <div
      className="bg-white animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* Padded header section */}
      <div className="px-4 sm:px-7 py-6 lg:py-8 border-b border-[#EDEDED]">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton width={64} height={10} />
            <Skeleton width="42%" height={28} />
            <Skeleton width="56%" height={12} />
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Skeleton width={96} height={32} rounded={999} />
            <Skeleton width={72} height={32} rounded={999} />
          </div>
        </div>

        {/* KPI 4-card strip — §38.53 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      {/* 3-col body */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,360px)] xl:h-[calc(100vh-160px)]">
        {/* Filter rail */}
        <aside className="hidden xl:block xl:border-r xl:border-[#EDEDED] px-4 py-5 space-y-5">
          <Skeleton height={10} width={56} />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={36} rounded={10} />
          ))}
          <div className="border-t border-[#EDEDED] pt-4 space-y-3">
            <Skeleton height={10} width={64} />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={28} rounded={999} />
            ))}
          </div>
        </aside>

        {/* List */}
        <section className="xl:border-r xl:border-[#EDEDED] xl:overflow-hidden">
          <div className="divide-y divide-[#EDEDED]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton width={28} height={28} rounded={999} />
                  <Skeleton width="34%" height={13} />
                  <Skeleton width={52} height={11} className="ml-auto" />
                </div>
                <Skeleton width="92%" height={11} />
                <Skeleton width="68%" height={11} />
              </div>
            ))}
          </div>
        </section>

        {/* Detail panel */}
        <aside className="hidden xl:flex xl:flex-col p-6 space-y-4">
          <Skeleton height={48} rounded={12} />
          <Skeleton height={120} rounded={16} />
          <Skeleton height={80} rounded={16} />
          <div className="space-y-2">
            <Skeleton height={10} width={72} />
            <Skeleton height={36} rounded={10} />
            <Skeleton height={36} rounded={10} />
          </div>
        </aside>
      </div>
    </div>
  );
}
