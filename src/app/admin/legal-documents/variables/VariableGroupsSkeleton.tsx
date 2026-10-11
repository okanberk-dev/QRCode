import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Variable group cards (group title + label / input / action rows) —
 * shared by loading.tsx and the page's first fetch (CLAUDE.md §40.10).
 */
export function VariableGroupsSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {[3, 2, 2, 2].map((rows, i) => (
        <div key={i} className="bz-card overflow-hidden">
          <div className="border-b border-[#EDEDED] px-5 py-3">
            <SkBox className="h-4 w-40" />
          </div>
          <div className="divide-y divide-[#EDEDED]">
            {Array.from({ length: rows }).map((__, j) => (
              <div
                key={j}
                className="grid gap-2 px-5 py-3.5 sm:grid-cols-[200px_1fr_auto] sm:items-center"
              >
                <div className="space-y-1.5">
                  <SkBox className="h-3 w-32" />
                  <SkBox className="h-3 w-24" />
                </div>
                <SkBox className="h-10 w-full" />
                <span />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
