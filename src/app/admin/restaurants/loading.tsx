import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin businesses — PageHeader + one toolbar (view tabs, search, three
 * selects) + table. Mirrors page.tsx so the skeleton hands over without a
 * layout jump (CLAUDE.md §40.10). The page also renders this component
 * during its own first load.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-56" />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SkBox className="h-10 w-full lg:w-64" />
        <SkBox className="h-10 w-full lg:flex-1" />
        <SkBox className="h-10 w-full lg:w-[426px]" />
      </div>
      <SkTable rows={8} cols={6} />
    </SkPageShell>
  );
}
