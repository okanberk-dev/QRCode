import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit categories list — PageHeader + actions + table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />
      <SkTable rows={6} cols={4} />
    </SkPageShell>
  );
}
