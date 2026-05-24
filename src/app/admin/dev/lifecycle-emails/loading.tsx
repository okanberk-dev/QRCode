import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Dev lifecycle email monitor — PageHeader + KPI + filter + log table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1600}>
      <SkPageHeader withActions titleWidth="w-56" />
      <SkStatGrid count={4} />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-48" />
        <SkBox className="h-9 w-32" />
      </div>
      <SkTable rows={10} cols={5} />
    </SkPageShell>
  );
}
