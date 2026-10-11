import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit stats — PageHeader (back + refresh) + 4 KPI cards + three
 * titled sections (sector table / top templates / most active businesses).
 * Mirrors page.tsx (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1600} space={4}>
      <SkPageHeader withActions titleWidth="w-48" />
      <SkStatGrid count={4} />
      {[6, 3, 3].map((rows, i) => (
        <div key={i} className="space-y-2">
          <SkBox className="h-5 w-48" />
          <SkTable rows={rows} cols={4} />
        </div>
      ))}
    </SkPageShell>
  );
}
