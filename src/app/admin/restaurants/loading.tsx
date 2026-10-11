import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
  SkTabStrip,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin businesses list — PageHeader + plan tabs + menu tabs + status
 * tabs/search row + business card grid. Mirrors page.tsx (no KPI row) so
 * the skeleton hands over without a layout jump (CLAUDE.md §40.10). The
 * page also renders this component during its own first load.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-56" />
      <SkTabStrip count={6} />
      <SkTabStrip count={4} />
      <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
        <SkTabStrip count={3} />
        <SkBox className="h-10 w-full md:max-w-md" />
      </div>
      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
