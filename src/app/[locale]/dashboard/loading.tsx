import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner dashboard home — structural clone of `dashboard/page.tsx`.
 * Greeting header + 4 KPI cards + two columns on lg (chart on the left,
 * pending tasks + recent activity on the right).
 * (CLAUDE.md §40.10 — structural skeleton during server render window.)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={6}>
      <SkPageHeader withActions titleWidth="w-80" />

      <SkStatGrid count={4} />

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
        <div className="bz-card p-5 sm:p-6 hidden sm:block space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <SkBox className="h-3 w-16" />
              <SkBox className="h-4 w-48" />
            </div>
            <SkBox className="h-8 w-36" />
          </div>
          <SkBox className="h-4 w-28" />
          <SkBox className="h-[300px] w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="bz-card p-5 sm:p-6 space-y-3">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-6 w-24" />
            <SkBox className="h-12 w-full" />
          </div>
          <div className="bz-card p-5 sm:p-6 space-y-3">
            <SkBox className="h-3 w-32" />
            <SkBox className="h-10 w-full" />
            <SkBox className="h-10 w-full" />
            <SkBox className="h-10 w-full" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
