import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit logs (security trail) — PageHeader + filter + table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-56" />
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-32" />
      </div>
      <SkTable rows={10} cols={5} />
    </SkPageShell>
  );
}
