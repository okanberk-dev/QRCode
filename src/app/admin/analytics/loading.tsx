import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin analytics — mirrors the page: live indicator + header + filter row +
 * 5 KPI tiles (AnalyticsKpiGrid) + trend chart + channel / sentiment / mentions row +
 * day×hour heatmap + insights card. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={3.5}>
      <SkBox className="h-3 w-28" />
      <SkPageHeader titleWidth="w-40" />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-48" />
        <SkBox className="h-7 w-80 max-w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card space-y-3 p-4 sm:p-5">
            <SkBox className="h-3 w-20" />
            <SkBox className="h-7 w-16" />
            <SkBox className="h-7 w-full" />
            <SkBox className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="bz-card space-y-3 p-5 sm:p-6">
        <SkBox className="h-3 w-32" />
        <SkBox className="h-5 w-56" />
        <SkBox className="h-72 w-full" />
      </div>
      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-5 w-40" />
            <SkBox className="h-40 w-full" />
          </div>
        ))}
      </div>
      <div className="bz-card space-y-3 p-5 sm:p-6">
        <SkBox className="h-3 w-32" />
        <SkBox className="h-5 w-28" />
        <SkBox className="h-64 w-full" />
      </div>
      <div className="h-40 rounded-[18px] bg-pn-ink" aria-hidden="true" />
    </SkPageShell>
  );
}
