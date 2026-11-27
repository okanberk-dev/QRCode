import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin Google integration oversight — PageHeader + KPI + integration
 * list. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-56" />
      <SkStatGrid count={3} />
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border border-pn-line rounded-[14px]">
            <SkBox className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <SkBox className="h-4 w-40" />
              <SkBox className="h-3 w-32" />
            </div>
            <SkBox className="h-6 w-20" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
