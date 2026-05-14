import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin campaign approval queue — KPI + filter + table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-56" />
      <SkStatGrid count={3} />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-40" />
        <SkBox className="h-9 w-32" />
      </div>
      <SkTable rows={6} cols={5} />
    </SkPageShell>
  );
}
