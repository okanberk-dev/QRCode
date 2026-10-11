import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit categories — PageHeader (seed + new actions) + categories
 * grouped by sector in 3-col card grids. Mirrors page.tsx (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-64" />
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, s) => (
          <div key={s} className="space-y-2">
            <div className="flex items-center gap-2">
              <SkBox className="h-3 w-28" />
              <SkBox className="h-5 w-7 rounded-full" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bz-card flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <SkBox className="h-4 w-36" />
                      <SkBox className="h-3 w-44 max-w-full" />
                    </div>
                    <SkBox className="h-5 w-10 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <SkBox className="h-3 w-16" />
                    <div className="flex gap-1">
                      <SkBox className="h-8 w-8" />
                      <SkBox className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
