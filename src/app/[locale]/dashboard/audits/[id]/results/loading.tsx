import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Audit results dashboard — back link + PageHeader + KPI + response
 * table. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />

      <SkStatGrid count={4} />

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <SkBox className="h-56 w-full" />
      </div>

      <SkTable rows={8} cols={5} />
    </SkPageShell>
  );
}
