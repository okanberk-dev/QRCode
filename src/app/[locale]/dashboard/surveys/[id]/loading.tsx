import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Survey detail — back link + header (title · status/business line ·
 * description, "Edit" + "More" on the right) + tab strip + the two Share cards.
 * Wrapper (`mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8`) and the block
 * spacing match SurveyDetailClient so the swap has no layout shift
 * (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8">
      <div className="mb-3 flex h-11 items-center sm:h-9">
        <SkBox className="h-3 w-24" />
      </div>

      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <SkBox className="h-8 w-64 max-w-full" />
          <div className="flex items-center gap-2">
            <SkBox className="h-5 w-16 rounded-full" />
            <SkBox className="h-4 w-28" />
          </div>
          <SkBox className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SkBox className="h-11 w-28 sm:h-9" />
          <SkBox className="h-11 w-11 sm:h-9 sm:w-24" />
        </div>
      </div>

      <div className="mt-5">
        <SkBox className="h-[50px] w-[180px] rounded-[10px] sm:h-9" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-5 w-40" />
            <SkBox className="h-11 w-full sm:h-9" />
            <div className="flex gap-2">
              <SkBox className="h-11 w-28 sm:h-9" />
              <SkBox className="h-11 w-40 sm:h-9" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
