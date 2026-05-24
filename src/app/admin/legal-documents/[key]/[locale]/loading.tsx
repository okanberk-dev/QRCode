import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Legal document editor — back link + PageHeader + content editor +
 * revision side rail. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-44" />
          <SkBox className="h-10 w-full" />
          <SkBox className="h-96 w-full" />
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1 p-2 border border-[#EDEDED] rounded-lg">
              <SkBox className="h-3 w-32" />
              <SkBox className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
