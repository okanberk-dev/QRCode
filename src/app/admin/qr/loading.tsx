import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin QR oversight — PageHeader + KPI + wizard form + history grid.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-44" />
      <SkStatGrid count={3} />
      <div className="bz-card p-5 space-y-4">
        <SkBox className="h-5 w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkBox className="h-10 w-full" />
          <SkBox className="h-10 w-full" />
          <SkBox className="h-10 w-full" />
          <SkBox className="h-10 w-full" />
        </div>
      </div>
      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
