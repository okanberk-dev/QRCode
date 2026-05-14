import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin announcements editor — PageHeader + filter strip + card grid.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-48" />
        <SkBox className="h-9 w-28" />
      </div>
      <SkCardGrid count={4} cols={2} />
    </SkPageShell>
  );
}
