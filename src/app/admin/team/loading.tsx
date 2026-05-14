import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin team members — PageHeader + invite chip + member table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-32" />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-28" />
      </div>
      <SkTable rows={6} cols={4} />
    </SkPageShell>
  );
}
