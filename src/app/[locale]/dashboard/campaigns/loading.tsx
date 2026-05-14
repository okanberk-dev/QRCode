// CLAUDE.md §38.99 — Owner campaigns content-shape skeleton. Wrapper tracks
// `CampaignsClient.tsx:263` exactly: `max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8
// space-y-5`. Header skeleton uses compact titleScale heights (~22-32px) to
// match the real `<PageHeader titleScale="compact">`. Content order: header →
// KPI 4-stat → filter chip strip → list rows.

import { StatCardSkeleton, Skeleton } from '@/components/ui';

export default function CampaignsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader (compact titleScale) — eyebrow + title + description + 2 actions */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={132} height={10} />
          {/* compact title ~22-32px */}
          <Skeleton width="32%" height={26} />
          <Skeleton width="72%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={88} height={36} rounded={999} />
          <Skeleton width={144} height={40} rounded={999} />
        </div>
      </div>

      {/* KPI 4-stat grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Status filter chip strip — 7 status pills + All */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[44, 64, 72, 80, 84, 88, 80, 72].map((w, i) => (
          <Skeleton key={i} width={w} height={30} rounded={999} />
        ))}
      </div>

      {/* List card */}
      <div className="bz-card p-0 overflow-hidden">
        <div className="divide-y divide-[#EDEDED]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 sm:p-5 flex items-center gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton width="52%" height={14} />
                <Skeleton width="36%" height={11} />
              </div>
              <Skeleton width={80} height={22} rounded={999} />
              <Skeleton width={68} height={11} className="hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
