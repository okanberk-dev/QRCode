import { Skeleton } from "@/components/ui";

// §38.71 — Yorumlar segment loading skeleton. Wrapper tracks the real page
// (`dashboard/feedbacks/page.tsx:799`) exactly:
//   min-h-full bg-white lg:flex lg:min-h-0 lg:flex-1 lg:flex-col → no outer
//   max-w (full-width 3-col body), padded header section sets px-4 sm:px-7
//   py-6 lg:py-8 border-b only on the PageHeader wrapper.
//
// KPI 4-card strip was REMOVED in §38.56 (skeleton previously rendered a
// phantom strip → ~100px CLS spike when real page mounted). Body grid
// matches the real `lg:flex lg:flex-row xl:grid xl:grid-cols-[300px_400px_minmax(520px,1fr)]`.

export default function FeedbacksLoading() {
  return (
    <div
      className="min-h-full bg-white lg:flex lg:min-h-0 lg:flex-1 lg:flex-col animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* Padded header — compact titleScale (§38.66) so h1 stays modest in
          dense 3-col layout */}
      <div className="px-4 sm:px-7 py-6 lg:py-8 border-b border-[#EDEDED]">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton width={108} height={10} />
            {/* compact title scale ~22px mobile / ~32px desktop */}
            <Skeleton width="32%" height={26} />
            <Skeleton width="68%" height={12} />
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Skeleton width={88} height={32} rounded={999} />
            <Skeleton width={72} height={32} rounded={999} className="xl:hidden" />
            <Skeleton width={120} height={32} rounded={999} />
          </div>
        </div>
      </div>

      {/* 3-col body — full-width content area, matches
          `lg:flex-row xl:grid xl:grid-cols-[300px_400px_minmax(520px,1fr)]` */}
      <div className="flex min-h-0 flex-1 flex-col bg-white lg:flex-row lg:overflow-hidden xl:grid xl:grid-cols-[300px_400px_minmax(520px,1fr)]">
        {/* xl: filter rail — only renders ≥1280px */}
        <aside className="hidden xl:block xl:border-r xl:border-[#EDEDED] px-4 py-5 space-y-5">
          <Skeleton width={56} height={10} />
          {/* Search input */}
          <Skeleton height={36} rounded={10} />
          {/* Tab list — 4 status tabs */}
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={36} rounded={10} />
          ))}
          {/* Platform pill cluster */}
          <div className="border-t border-[#EDEDED] pt-4 space-y-2">
            <Skeleton width={72} height={10} />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} width={64} height={28} rounded={999} />
              ))}
            </div>
          </div>
          {/* Week stats card */}
          <div className="bz-card p-4 space-y-2">
            <Skeleton width={88} height={10} />
            <Skeleton width="64%" height={22} />
            <Skeleton width="80%" height={11} />
          </div>
        </aside>

        {/* Middle column — feedback list. lg:w-[380px] sets fixed width on
            lg, xl:w-auto allows grid template to take over. */}
        <aside className="min-h-0 w-full flex-shrink-0 border-b border-[#EDEDED] lg:border-b-0 lg:border-r lg:w-[380px] xl:w-auto xl:flex-none">
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
        </aside>

        {/* Right column — detail panel (lg+ visible) */}
        <aside className="hidden lg:flex lg:flex-col p-5 sm:p-6 space-y-4">
          {/* Detail header */}
          <div className="flex items-center gap-3">
            <Skeleton width={40} height={40} rounded={999} />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="48%" height={14} />
              <Skeleton width="32%" height={11} />
            </div>
            <Skeleton width={64} height={22} rounded={6} />
          </div>
          {/* Rating + meta */}
          <Skeleton height={80} rounded={12} />
          {/* Comment body */}
          <Skeleton height={140} rounded={12} />
          {/* Composer */}
          <div className="space-y-2">
            <Skeleton width={72} height={10} />
            <Skeleton height={88} rounded={12} />
            <div className="flex items-center justify-between">
              <Skeleton width={104} height={32} rounded={999} />
              <Skeleton width={88} height={32} rounded={999} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
