import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin analytics — KPI + trend chart + cohort breakdown. Sister to
 * owner analytics. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-44" />
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
          <SkBox className="h-5 w-40" />
          <SkBox className="h-56 w-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
