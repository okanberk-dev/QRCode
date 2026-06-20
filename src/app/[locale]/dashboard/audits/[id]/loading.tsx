import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Audit detail (overview) — back link + PageHeader + KPI + question
 * preview + recent responses. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-72" />

      <SkStatGrid count={3} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 p-3 border border-[#EDEDED] rounded-lg">
              <SkBox className="h-4 w-2/3" />
              <SkBox className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <SkBox className="h-4 w-full" />
              <SkBox className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
