import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Document-group cards (title + description + TR/EN rows) — shared by
 * loading.tsx and the page's first fetch so the hand-off has no layout
 * jump (CLAUDE.md §40.10).
 */
export function LegalDocGroupsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bz-card overflow-hidden">
          <div className="space-y-2 border-b border-[#EDEDED] px-5 py-4">
            <SkBox className="h-5 w-56 max-w-full" />
            <SkBox className="h-3 w-80 max-w-full" />
          </div>
          <div className="divide-y divide-[#EDEDED]">
            {Array.from({ length: 2 }).map((__, j) => (
              <div key={j} className="flex items-center gap-3 px-5 py-3.5">
                <SkBox className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <SkBox className="h-4 w-64 max-w-full" />
                  <SkBox className="h-3 w-40 max-w-full" />
                </div>
                <SkBox className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
