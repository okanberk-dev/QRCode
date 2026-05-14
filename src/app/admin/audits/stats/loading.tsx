import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit stats — PageHeader + KPI + 3-table breakdown (sector /
 * top templates / per-restaurant). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1400}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader titleWidth="w-44" />
      <SkStatGrid count={4} />
      <SkTable rows={6} cols={4} />
      <SkTable rows={5} cols={4} />
      <SkTable rows={8} cols={5} />
    </SkPageShell>
  );
}
