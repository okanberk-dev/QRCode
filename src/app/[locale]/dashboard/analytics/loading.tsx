import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner analytics — header (title + scope/period subtitle + export) + one
 * filter toolbar + 5 KPI cards + rating volume chart + 3-up breakdown row +
 * day/hour row + heatmap. Mirrors page.tsx (space-y-3, no eyebrow, toolbar
 * without a card, same grids and gaps). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={3}>
      {/* PageHeader: breadcrumb (sm+) + title + subtitle, export action */}
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end lg:mb-6">
        <div className="space-y-2.5">
          <SkBox className="hidden h-4 w-32 sm:block" />
          <SkBox className="h-8 w-36" />
          <SkBox className="h-3.5 w-52" />
        </div>
        <SkBox className="h-11 w-36 rounded-full" />
      </div>

      {/* Filter toolbar: period pills on a white track + platform (+ branch) select */}
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-[52px] w-full rounded-full sm:h-[44px] sm:w-80" />
        <SkBox className="h-11 w-full rounded-full sm:h-[34px] sm:w-[170px]" />
      </div>

      {/* 5 KPI cards — same grid as AnalyticsKpiGrid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-3.5 w-20" />
            <SkBox className="h-8 w-16" />
            <SkBox className="h-6 w-16 rounded-full" />
            <SkBox className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Rating volume chart (VolumeChart) */}
      <div className="bz-card space-y-4 p-5 sm:p-6">
        <div className="space-y-1.5">
          <SkBox className="h-5 w-32" />
          <SkBox className="h-3.5 w-16" />
        </div>
        <SkBox className="h-4 w-56" />
        <SkBox className="h-[220px] w-full sm:h-[260px]" />
        <SkBox className="h-3 w-32" />
      </div>

      {/* Channel · sentiment · top mentions — same 3-up grid as page.tsx */}
      <div className="grid gap-2.5 lg:grid-cols-[1.4fr_1fr_1fr]">
        {['w-32', 'w-36', 'w-40'].map((w) => (
          <div key={w} className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className={`h-5 ${w}`} />
            <SkBox className="h-3.5 w-28" />
            <SkBox className="h-32 w-full" />
          </div>
        ))}
      </div>

      {/* Day + hour distribution */}
      <div className="grid gap-2.5 lg:grid-cols-2">
        {['w-32', 'w-28'].map((w) => (
          <div key={w} className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className={`h-5 ${w}`} />
            <SkBox className="h-3.5 w-48" />
            <SkBox className="h-[168px] w-full" />
          </div>
        ))}
      </div>

      {/* Day × hour heatmap */}
      <div className="bz-card space-y-3 p-5 sm:p-6">
        <SkBox className="h-5 w-52" />
        <SkBox className="h-3.5 w-40" />
        <SkBox className="h-48 w-full" />
      </div>
    </SkPageShell>
  );
}
