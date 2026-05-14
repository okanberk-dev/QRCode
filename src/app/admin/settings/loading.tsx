import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTabStrip,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin global settings — PageHeader + tab strip + integration cards.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkPageHeader withActions titleWidth="w-32" />
      <SkTabStrip count={5} />
      <div className="bz-card p-5 space-y-4">
        <SkBox className="h-5 w-44" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-[#EDEDED] rounded-lg">
            <div className="flex items-center gap-3">
              <SkBox className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <SkBox className="h-4 w-32" />
                <SkBox className="h-3 w-56" />
              </div>
            </div>
            <SkBox className="h-9 w-24" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
