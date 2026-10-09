import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner dashboard home — structural clone of `dashboard/page.tsx`.
 * Hero greeting + 4 KPI cards + 2-col content grid + activity strip.
 * (CLAUDE.md §40.10 — structural skeleton during server render window.)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={6}>
      <SkPageHeader withActions titleWidth="w-80" />

      <SkStatGrid count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-40" />
          <SkBox className="h-4 w-full" />
          <SkBox className="h-4 w-3/4" />
          <SkBox className="h-4 w-5/6" />
          <SkBox className="h-4 w-2/3" />
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-36" />
          <SkBox className="h-32 w-full" />
        </div>
      </div>

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <div className="space-y-2">
          <SkBox className="h-12 w-full" />
          <SkBox className="h-12 w-full" />
          <SkBox className="h-12 w-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
