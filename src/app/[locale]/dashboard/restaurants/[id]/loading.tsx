import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner restaurant detail — back link + PageHeader + 3-stat KPI +
 * public preview row + 2×2 quick actions. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-72" />

      <SkStatGrid count={3} />

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-3 w-32" />
        <div className="flex items-center justify-between gap-3">
          <SkBox className="h-5 w-72 max-w-full" />
          <div className="flex gap-2">
            <SkBox className="h-8 w-20" />
            <SkBox className="h-8 w-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card p-5 space-y-2">
            <SkBox className="h-3 w-16" />
            <SkBox className="h-5 w-32" />
            <SkBox className="h-4 w-full" />
            <SkBox className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
