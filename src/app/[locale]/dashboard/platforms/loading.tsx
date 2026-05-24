import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner platform links — header + restaurant selector + 12-card
 * platform grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-52" />

      <div className="flex items-center gap-3">
        <SkBox className="h-3 w-32" />
        <SkBox className="h-9 w-64" />
      </div>

      <SkCardGrid count={9} cols={3} />
    </SkPageShell>
  );
}
