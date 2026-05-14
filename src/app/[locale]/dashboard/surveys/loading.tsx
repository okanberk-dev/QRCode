import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner surveys list — PageHeader + filter strip + survey card grid.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-32" />

      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-48" />
        <SkBox className="h-9 w-28" />
      </div>

      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
