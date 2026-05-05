import { Skeleton, StatCardSkeleton } from "@/components/ui";

// §38.71 — Analitik segment loading skeleton.
// Tasarım §38.34/§38.50: 5-col KPI single row + filter bar + tek-chart big +
// 2-up grid (KANAL + KONU SENTİMENT) + heatmap + AI insights light card.
// Apple-premium content-shape.

export default function AnalyticsLoading() {
  return (
    <div
      className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader (compact §38.66) */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={64} height={10} />
          <Skeleton width="36%" height={26} />
          <Skeleton width="56%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={96} height={32} rounded={999} />
          <Skeleton width={88} height={32} rounded={999} />
        </div>
      </div>

      {/* Filter bar — range + platform + branch + restaurant chips */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`r-${i}`} width={56} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`f-${i}`} width={120} height={32} rounded={999} />
        ))}
      </div>

      {/* KPI 5-col single row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* PulseTrendChart — big simultaneous chart */}
      <div className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={140} height={14} />
          <div className="flex gap-2">
            <Skeleton width={56} height={20} rounded={999} />
            <Skeleton width={56} height={20} rounded={999} />
            <Skeleton width={56} height={20} rounded={999} />
          </div>
        </div>
        <div className="h-[260px] sm:h-[300px] rounded-xl bg-[#F2F2F2] bz-skeleton" />
      </div>

      {/* 2-up grid: KANAL DAĞILIMI + KONU SENTİMENT */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="bz-card p-5 space-y-3">
          <Skeleton width={120} height={11} />
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
          <Skeleton width={140} height={11} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton width="42%" height={12} />
                <Skeleton width={48} height={11} />
              </div>
              <Skeleton height={6} rounded={999} />
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap (Gün × Saat) */}
      <div className="bz-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton width={160} height={14} />
          <Skeleton width={120} height={11} />
        </div>
        <div className="overflow-hidden rounded-xl bg-[#F2F2F2] bz-skeleton h-[180px]" />
      </div>

      {/* AI Insights light card */}
      <div className="bz-card p-5 space-y-3">
        <Skeleton width={88} height={10} />
        <Skeleton width="48%" height={14} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#FAFAFA] p-3 space-y-1.5">
            <Skeleton width={64} height={9} />
            <Skeleton width="76%" height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
