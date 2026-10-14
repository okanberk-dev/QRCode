import { SkBox, SkPageHeader } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Surveys list — header + summary line + three stacked survey cards. Wrapper
 * (`mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8`) and card chrome match
 * SurveysClient exactly so the swap has no layout shift (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8">
      <div className="mb-5">
        <SkPageHeader withActions titleWidth="w-32" />
      </div>

      <div className="space-y-3" aria-busy="true">
        <SkBox className="h-4 w-56" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bz-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
          >
            <div className="min-w-0 flex-1 space-y-2.5">
              <SkBox className="h-5 w-64 max-w-full" />
              <SkBox className="h-3.5 w-72 max-w-full" />
            </div>
            <div className="flex items-center gap-2">
              <SkBox className="h-11 w-36" />
              <SkBox className="h-11 w-11" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
