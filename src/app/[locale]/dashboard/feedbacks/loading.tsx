import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner feedbacks inbox — 3-col layout (filter rail + list + detail
 * preview on lg+). Mobile: stacked. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1400}>
      <SkPageHeader withActions titleWidth="w-44" />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_360px] gap-4">
        {/* Filter rail */}
        <div className="bz-card p-4 space-y-3">
          <SkBox className="h-3 w-20" />
          <div className="space-y-2">
            <SkBox className="h-8 w-full" />
            <SkBox className="h-8 w-full" />
            <SkBox className="h-8 w-full" />
            <SkBox className="h-8 w-full" />
          </div>
          <SkBox className="h-3 w-24" />
          <div className="space-y-2">
            <SkBox className="h-7 w-full" />
            <SkBox className="h-7 w-full" />
          </div>
        </div>

        {/* List */}
        <div className="bz-card divide-y divide-[#EDEDED]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <SkBox className="h-4 w-32" />
                <SkBox className="h-3 w-16" />
              </div>
              <SkBox className="h-3 w-24" />
              <SkBox className="h-4 w-5/6" />
            </div>
          ))}
        </div>

        {/* Detail preview (lg+) */}
        <div className="hidden lg:block bz-card p-5 space-y-3">
          <SkBox className="h-3 w-20" />
          <SkBox className="h-6 w-48" />
          <SkBox className="h-4 w-full" />
          <SkBox className="h-4 w-3/4" />
          <SkBox className="h-32 w-full" />
          <SkBox className="h-9 w-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
