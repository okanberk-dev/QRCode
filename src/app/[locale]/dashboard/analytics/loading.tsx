import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner analytics — KPI + heatmap + 14-week trend chart structural
 * clone. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-56" />

      <SkStatGrid count={4} />

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
