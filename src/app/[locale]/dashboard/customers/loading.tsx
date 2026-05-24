import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner CRM customers — KPI + filter strip + customer table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1600}>
      <SkPageHeader withActions titleWidth="w-44" />

      <SkStatGrid count={4} />

      <div className="bz-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SkBox className="h-9 w-56" />
          <SkBox className="h-9 w-32" />
          <SkBox className="h-9 w-28" />
          <SkBox className="h-9 w-32" />
          <SkBox className="h-9 w-24" />
        </div>
      </div>

      <SkTable rows={8} cols={6} />
    </SkPageShell>
  );
}
