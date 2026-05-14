import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin plans + subscriptions — KPI + plan tier cards + recently paid.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-44" />
      <SkStatGrid count={4} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card p-5 space-y-3">
            <SkBox className="h-4 w-24" />
            <SkBox className="h-8 w-32" />
            <SkBox className="h-3 w-full" />
            <div className="space-y-2 pt-2">
              <SkBox className="h-3 w-3/4" />
              <SkBox className="h-3 w-2/3" />
              <SkBox className="h-3 w-3/4" />
              <SkBox className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkBox className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <SkBox className="h-4 w-40" />
              <SkBox className="h-3 w-32" />
            </div>
            <SkBox className="h-6 w-16" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
