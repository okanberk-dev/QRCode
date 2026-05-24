import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin embed widget usage — PageHeader + KPI + per-restaurant table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-56" />
      <SkStatGrid count={4} />
      <SkTable rows={8} cols={5} />
    </SkPageShell>
  );
}
