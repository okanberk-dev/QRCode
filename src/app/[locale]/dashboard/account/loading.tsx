import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTabStrip,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner account hub — PageHeader + tab strip + form rows + right rail.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkPageHeader withActions titleWidth="w-32" />

      <SkTabStrip count={5} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bz-card p-5 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkBox className="h-3 w-32" />
              <SkBox className="h-10 w-full" />
            </div>
          ))}
          <div className="flex justify-end">
            <SkBox className="h-9 w-28" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bz-card p-5 space-y-3">
            <SkBox className="h-3 w-20" />
            <SkBox className="h-6 w-32" />
            <SkBox className="h-4 w-full" />
            <SkBox className="h-4 w-3/4" />
          </div>
          <div className="bz-card p-5 space-y-3">
            <SkBox className="h-3 w-24" />
            <SkBox className="h-9 w-full" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
