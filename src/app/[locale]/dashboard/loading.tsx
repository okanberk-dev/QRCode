import { Skeleton, StatCardSkeleton } from "@/components/ui";

// §38.59 — Owner dashboard root skeleton. Wrapper (max-w/padding/spacing)
// tracks the real page (`/[locale]/dashboard/page.tsx:934`) so the loading
// → loaded transition is CLS=0. Content blocks below mirror the actual
// section order (PageHeader → mobile hero → AI banner → KPI 4-strip →
// Channel + Activity 2-col → bottom chart) at the correct heights.

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-8 lg:py-12 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader — eyebrow + title + subtitle + 3 action buttons (hidden sm+) */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={120} height={10} />
          <Skeleton width="58%" height={32} />
          <Skeleton width="44%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={104} height={32} rounded={999} />
          <Skeleton width={88} height={32} rounded={999} />
          <Skeleton width={104} height={32} rounded={999} />
        </div>
      </div>

      {/* Mobile-only hero card (graphite, rating + sparkline) — matches
          `sm:hidden rounded-[18px] bg-[#0A0A0A] p-[18px]` */}
      <div className="sm:hidden rounded-[18px] bg-[#0A0A0A] p-[18px] space-y-3">
        <div className="h-[10px] w-32 rounded-sm bg-white/15 bz-skeleton" />
        <div className="flex items-baseline gap-2">
          <div className="h-10 w-20 rounded-md bg-white/15 bz-skeleton" />
          <div className="h-3 w-16 rounded-sm bg-white/10 bz-skeleton" />
        </div>
        <div className="h-3 w-3/4 rounded-sm bg-white/10 bz-skeleton" />
        <div className="-mx-[18px] -mb-[18px] h-[50px] rounded-b-[18px] bg-white/[0.06] bz-skeleton" />
      </div>

      {/* AI Insight banner — full-width lime-tinted card */}
      <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-5 space-y-2">
        <Skeleton width={88} height={10} />
        <Skeleton width="62%" height={14} />
        <Skeleton width="88%" height={12} />
      </div>

      {/* KPI 4-stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* 2-col: Channel distribution + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_minmax(0,1fr)] gap-3">
        <div className="bz-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton width={140} height={13} />
            <Skeleton width={56} height={11} />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={28} height={28} rounded={8} />
              <div className="flex-1 space-y-1.5">
                <Skeleton width="50%" height={11} />
                <Skeleton height={6} rounded={999} />
              </div>
              <Skeleton width={32} height={11} />
            </div>
          ))}
        </div>
        <div className="bz-card p-5 space-y-3">
          <Skeleton width={96} height={13} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={28} height={28} rounded={999} />
              <div className="flex-1 space-y-1.5">
                <Skeleton width="68%" height={11} />
                <Skeleton width="42%" height={10} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom NABIZ chart placeholder */}
      <div className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={120} height={13} />
          <div className="flex gap-2">
            <Skeleton width={48} height={20} rounded={999} />
            <Skeleton width={48} height={20} rounded={999} />
            <Skeleton width={48} height={20} rounded={999} />
          </div>
        </div>
        <div className="h-[200px] sm:h-[240px] rounded-xl bg-[#F2F2F2] bz-skeleton" />
      </div>
    </div>
  );
}
