import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Survey detail (responses + results) — back link + PageHeader + KPI
 * + response list. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-64" />

      <SkStatGrid count={3} />

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <SkBox className="h-56 w-full" />
      </div>

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 p-3 border border-[#EDEDED] rounded-lg">
            <SkBox className="h-4 w-2/3" />
            <SkBox className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
