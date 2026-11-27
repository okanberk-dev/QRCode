import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin owner detail — back link + PageHeader + KPI + invoice list +
 * danger actions. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-72" />
      <SkStatGrid count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-pn-line rounded-[14px]">
              <div className="space-y-1">
                <SkBox className="h-4 w-32" />
                <SkBox className="h-3 w-24" />
              </div>
              <SkBox className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-3 w-24" />
          <SkBox className="h-6 w-32" />
          <SkBox className="h-4 w-full" />
          <SkBox className="h-9 w-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
