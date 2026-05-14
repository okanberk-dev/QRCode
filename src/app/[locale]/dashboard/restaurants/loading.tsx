import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner restaurants (locations) list — header + filter strip + card
 * grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-44" />

      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-48" />
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-28" />
      </div>

      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
