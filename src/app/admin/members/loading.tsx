import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin owners list — PageHeader + filter card (search + plan/status
 * selects) + table. Mirrors MembersClient (no KPI row) so the skeleton
 * hands over without a layout jump (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="bz-card flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
        <SkBox className="h-11 w-full lg:flex-1" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SkBox className="h-11 w-full sm:w-44" />
          <SkBox className="h-11 w-full sm:w-44" />
        </div>
      </div>
      <SkTable rows={6} cols={6} />
    </SkPageShell>
  );
}
