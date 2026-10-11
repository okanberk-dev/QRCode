import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Lifecycle email monitor — PageHeader + manual-run card + KPI row +
 * log card (filters + table). Mirrors page.tsx (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={6}>
      <SkPageHeader titleWidth="w-56" />
      <div className="bz-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-2">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-5 w-72 max-w-full" />
            <SkBox className="h-3 w-96 max-w-full" />
          </div>
          <SkBox className="h-11 w-36 rounded-full" />
        </div>
      </div>
      <SkStatGrid count={4} />
      <div className="bz-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SkBox className="h-5 w-36" />
          <div className="flex flex-wrap items-center gap-2">
            <SkBox className="h-10 w-40" />
            <SkBox className="h-10 w-24" />
            <SkBox className="h-8 w-8" />
          </div>
        </div>
        <SkTable rows={5} cols={4} />
      </div>
    </SkPageShell>
  );
}
