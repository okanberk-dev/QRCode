import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner menu builder — back link + PageHeader + theme panel + DnD
 * category / item rows. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1400}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-64" />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Theme panel */}
        <div className="bz-card p-4 space-y-4">
          <SkBox className="h-4 w-28" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkBox key={i} className="h-20 w-full" />
            ))}
          </div>
          <SkBox className="h-3 w-24" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkBox key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
          <SkBox className="h-9 w-full" />
          <SkBox className="h-9 w-full" />
        </div>

        {/* DnD list */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, c) => (
            <div key={c} className="bz-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <SkBox className="h-5 w-44" />
                <SkBox className="h-7 w-24" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border border-[#EDEDED] rounded-lg">
                  <SkBox className="h-14 w-14" />
                  <div className="flex-1 space-y-2">
                    <SkBox className="h-4 w-1/3" />
                    <SkBox className="h-3 w-2/3" />
                  </div>
                  <SkBox className="h-4 w-16" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
