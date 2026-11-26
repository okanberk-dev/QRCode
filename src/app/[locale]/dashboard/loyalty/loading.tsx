import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Loyalty page — header, four stat cards, tab strip and the counter card.
 * Wrapper matches LoyaltyClient (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-7 lg:py-8" aria-busy="true">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <SkBox className="h-8 w-44 max-w-full" />
          <SkBox className="h-4 w-96 max-w-full" />
        </div>
        <SkBox className="h-11 w-36 shrink-0 sm:h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bz-card space-y-3 p-4">
            <SkBox className="h-3.5 w-24" />
            <SkBox className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <SkBox key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="bz-card mt-4 space-y-4 p-5">
        <SkBox className="h-11 w-full" />
        <SkBox className="h-24 w-full" />
      </div>
    </div>
  );
}
