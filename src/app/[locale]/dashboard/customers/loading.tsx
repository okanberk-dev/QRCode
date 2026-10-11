import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner CRM customers — KPI + filter strip + customer table.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1600}>
      <SkPageHeader withActions titleWidth="w-44" />

      {/* 5 KPI cards — same grid as page.tsx (2 → 3 → 4 → 5 cols). */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-3">
            <SkBox className="h-3 w-16" />
            <SkBox className="h-7 w-20" />
          </div>
        ))}
      </div>

      <div className="bz-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SkBox className="h-9 w-56" />
          <SkBox className="h-9 w-32" />
          <SkBox className="h-9 w-28" />
          <SkBox className="h-9 w-32" />
          <SkBox className="h-9 w-24" />
        </div>
      </div>

      <SkTable rows={8} cols={6} />
    </SkPageShell>
  );
}
