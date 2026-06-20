import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Google reviews hub — header + restaurant selector + KPI + 2-col
 * (review list + AI co-pilot). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-56" />

      <div className="flex items-center gap-3">
        <SkBox className="h-3 w-32" />
        <SkBox className="h-9 w-64" />
      </div>

      <SkStatGrid count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="bz-card divide-y divide-[#EDEDED]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SkBox className="h-8 w-8 rounded-full" />
                  <SkBox className="h-4 w-32" />
                </div>
                <SkBox className="h-3 w-16" />
              </div>
              <SkBox className="h-3 w-24" />
              <SkBox className="h-4 w-full" />
              <SkBox className="h-4 w-3/4" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block bz-card p-5 space-y-3">
          <SkBox className="h-3 w-24" />
          <SkBox className="h-5 w-48" />
          <SkBox className="h-32 w-full" />
          <SkBox className="h-9 w-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
