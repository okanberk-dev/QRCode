import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner analytics — live line + header + filter bar + 5 KPI cards + main
 * trend chart + lower cards. Mirrors page.tsx (space-y-3.5, 5-col KPI
 * grid, header without actions). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={3.5}>
      <SkBox className="h-3 w-36" />

      <SkPageHeader titleWidth="w-56" />

      {/* Filter bar */}
      <div className="bz-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SkBox className="h-8 w-48" />
          <SkBox className="h-8 w-28" />
          <SkBox className="h-8 w-24" />
          <SkBox className="h-8 w-44" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SkBox className="h-7 w-14" />
          <SkBox className="h-7 w-20" />
          <SkBox className="h-7 w-24" />
          <SkBox className="h-7 w-24" />
        </div>
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
