import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Platform provider detail — back link + PageHeader + KPI + recent
 * events list. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkBox className="h-3 w-40" />
      <SkPageHeader withActions titleWidth="w-56" />

      <SkStatGrid count={3} />

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkBox className="h-3 w-3 rounded-full" />
              <SkBox className="h-4 w-32" />
              <SkBox className="h-4 flex-1" />
              <SkBox className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
