import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin customer (end-user feedback authors) registry — KPI + filter
 * + table. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-44" />
      <SkStatGrid count={4} />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-56" />
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-28" />
      </div>
      <SkTable rows={8} cols={6} />
    </SkPageShell>
  );
}
