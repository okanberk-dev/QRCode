import { SkBox, SkPageHeader } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Survey detail — back link + header + tab strip + the two Share cards.
 * Wrapper (`mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8`) and the block
 * spacing match SurveyDetailClient so the swap has no layout shift
 * (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8">
      <div className="mb-3 flex h-11 items-center">
        <SkBox className="h-3 w-24" />
      </div>
      <div className="mb-5">
        <SkPageHeader withActions titleWidth="w-64" />
      </div>

      <div className="mt-5 flex gap-2 border-b border-[#EDEDED] pb-3">
        <SkBox className="h-8 w-20" />
        <SkBox className="h-8 w-24" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-5 w-40" />
            <SkBox className="h-11 w-full" />
            <div className="flex gap-2">
              <SkBox className="h-11 w-28" />
              <SkBox className="h-11 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
