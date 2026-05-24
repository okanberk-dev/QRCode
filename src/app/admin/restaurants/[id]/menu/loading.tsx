import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin restaurant menu read-only view — back link + PageHeader +
 * category accordions. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader titleWidth="w-56" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, c) => (
          <div key={c} className="bz-card p-4 space-y-3">
            <SkBox className="h-5 w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border border-[#EDEDED] rounded-lg">
                <SkBox className="h-12 w-12" />
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
    </SkPageShell>
  );
}
