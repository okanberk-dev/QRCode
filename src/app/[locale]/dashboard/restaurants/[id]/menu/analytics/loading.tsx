import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Menu analytics — KPI grid + trend chart + category breakdown bar.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />

      <SkStatGrid count={4} />

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <SkBox className="h-64 w-full" />
      </div>

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkBox className="h-4 w-32" />
            <SkBox className="h-4 flex-1" />
            <SkBox className="h-4 w-12" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
