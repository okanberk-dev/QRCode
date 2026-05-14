import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit templates list — PageHeader + filter + template table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-48" />
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-28" />
      </div>
      <SkTable rows={6} cols={5} />
    </SkPageShell>
  );
}
