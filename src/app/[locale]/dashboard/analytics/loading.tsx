import { Skeleton, StatCardSkeleton } from "@/components/ui";

// §38.71 — Analitik segment loading skeleton. Wrapper tracks the real page
// (`dashboard/analytics/page.tsx:706`) exactly:
//   `mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5`
// Content order: live indicator → PageHeader (compact §38.66) → filter bar →
// mobile hero (sm:hidden graphite) → KPI 5-col strip → main trend chart →
// 3-up bottom grid (1.4fr / 1fr / 1fr) → heatmap → AI insights.

export default function AnalyticsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* AnalyticsLiveIndicator — small inline status pill (right-aligned) */}
      <div className="flex justify-end">
        <Skeleton width={160} height={22} rounded={999} />
      </div>

      {/* PageHeader (compact §38.66 — h1 ~22-32px) */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={72} height={10} />
          <Skeleton width="22%" height={26} />
          <Skeleton width="56%" height={12} />
        </div>
      </div>

      {/* AnalyticsFilterBar — range pills + platform/branch chips + restaurant scope */}
      <div className="bz-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`r-${i}`} width={56} height={32} rounded={999} />
        ))}
        <div className="flex-1 hidden sm:block" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`f-${i}`} width={120} height={32} rounded={999} />
        ))}
      </div>

      {/* Mobile-only hero (sm:hidden graphite + lime rating + sparkline) */}
      <div className="sm:hidden rounded-[18px] bg-[#0A0A0A] p-[18px] space-y-3">
        <div className="h-[10px] w-32 rounded-sm bg-white/15 bz-skeleton" />
        <div className="flex items-baseline gap-2">
          <div className="h-12 w-24 rounded-md bg-white/15 bz-skeleton" />
          <div className="h-3 w-16 rounded-sm bg-white/10 bz-skeleton" />
        </div>
        <div className="-mx-[18px] -mb-[18px] h-[50px] rounded-b-[18px] bg-white/[0.06] bz-skeleton" />
      </div>

      {/* KPI 5-col single row (TOPLAM YORUM / ORTALAMA PUAN / YANIT SÜRESİ / NPS / TEKRAR GELME) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* MainTrendChart — 30-day stacked area, big simultaneous chart */}
      <div className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={180} height={14} />
          <div className="flex gap-2">
            <Skeleton width={64} height={28} rounded={999} />
            <Skeleton width={64} height={28} rounded={999} />
            <Skeleton width={64} height={28} rounded={999} />
            <Skeleton width={64} height={28} rounded={999} />
          </div>
        </div>
        <div className="h-[260px] sm:h-[300px] rounded-xl bg-[#F2F2F2] bz-skeleton" />
      </div>

      {/* 3-up bottom grid — matches real `lg:grid-cols-[1.4fr_1fr_1fr]` */}
      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr]">
        {/* Channel distribution */}
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
        {/* Sentiment donut */}
        <div className="bz-card p-5 space-y-3 flex flex-col">
          <Skeleton width={112} height={11} />
          <div className="flex flex-1 items-center justify-center py-3">
            <Skeleton width={160} height={160} rounded={999} />
          </div>
          <div className="flex justify-center gap-3">
            <Skeleton width={56} height={11} />
            <Skeleton width={56} height={11} />
            <Skeleton width={56} height={11} />
          </div>
        </div>
        {/* Top mentions polarity */}
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
