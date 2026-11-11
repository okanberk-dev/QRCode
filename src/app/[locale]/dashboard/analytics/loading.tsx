import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner analytics — header (title + scope/period subtitle + export) + one
 * filter toolbar + 5 KPI cards + main trend chart + lower cards. Mirrors
 * page.tsx (space-y-3.5, no eyebrow, toolbar without a card, 5-col KPI
 * grid). (CLAUDE.md §40.10)
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

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <SkBox className="h-72 w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-40" />
          <SkBox className="h-56 w-full" />
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-36" />
          <SkBox className="h-56 w-full" />
        </div>
      </div>

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-48" />
        <SkBox className="h-4 w-full" />
        <SkBox className="h-4 w-5/6" />
        <SkBox className="h-4 w-3/4" />
      </div>
    </SkPageShell>
  );
}
