import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner analytics — header (title + scope/period subtitle + export) + one
 * filter toolbar + 5 KPI cards + main trend chart + 3-up breakdown row +
 * day/hour row + heatmap. Mirrors page.tsx (space-y-3.5, no eyebrow,
 * toolbar without a card, same grids and gaps). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={3.5}>
      {/* PageHeader: title + subtitle, export action */}
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="space-y-2.5">
          <SkBox className="h-7 w-36" />
          <SkBox className="h-3.5 w-52" />
        </div>
        <SkBox className="h-11 w-32 sm:h-9" />
      </div>

      {/* Filter toolbar: period segment + platform (+ branch) select */}
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-[50px] w-full sm:h-[34px] sm:w-72" />
        <SkBox className="h-11 w-full sm:h-[34px] sm:w-[170px]" />
      </div>

      {/* 5 KPI cards — same grid as AnalyticsKpiGrid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card p-4 sm:p-5 space-y-3">
            <SkBox className="h-3 w-20" />
            <SkBox className="h-7 w-16" />
            <SkBox className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Main trend chart (MainTrendChart) */}
      <div className="bz-card p-5 sm:p-6 space-y-3">
        <SkBox className="h-3 w-28" />
        <SkBox className="h-5 w-52" />
        <SkBox className="h-72 w-full" />
      </div>

      {/* Channel · sentiment · top mentions — same 3-up grid as page.tsx */}
      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr]">
        {['w-32', 'w-36', 'w-40'].map((w) => (
          <div key={w} className="bz-card p-5 sm:p-6 space-y-3">
            <SkBox className="h-3 w-28" />
            <SkBox className={`h-5 ${w}`} />
            <SkBox className="h-28 w-full" />
          </div>
        ))}
      </div>

      {/* Day + hour distribution */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        {['w-56', 'w-48'].map((w) => (
          <div key={w} className="bz-card p-5 sm:p-6 space-y-3">
            <SkBox className="h-3 w-28" />
            <SkBox className={`h-5 ${w}`} />
            <SkBox className="h-40 w-full" />
          </div>
        ))}
      </div>

      {/* Day × hour heatmap */}
      <div className="bz-card p-5 sm:p-6 space-y-3">
        <SkBox className="h-3 w-28" />
        <SkBox className="h-5 w-32" />
        <SkBox className="h-48 w-full" />
      </div>
    </SkPageShell>
  );
}
