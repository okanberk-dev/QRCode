import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner campaigns list — KPI + filter strip + campaign table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1400}>
      <SkPageHeader withActions titleWidth="w-44" />

      <SkStatGrid count={4} />

      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-48" />
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-28" />
      </div>

      <SkTable rows={6} cols={5} />
    </SkPageShell>
  );
}
