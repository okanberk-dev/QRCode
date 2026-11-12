import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Surveys list — header (no eyebrow) + one toolbar row + three stacked
 * survey cards. Wrapper (`mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8`)
 * and card chrome match SurveysClient so the swap has no layout shift
 * (CLAUDE.md §40.10). The toolbar is a single summary-line placeholder in a
 * segment-height row: the "This business / All businesses" segment only
 * exists for multi-business owners, which the skeleton cannot know, so one
 * neutral row keeps the shift small in both cases.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8">
      {/* PageHeader: title + description, "New survey" below on mobile. */}
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <SkBox className="h-8 w-36 max-w-full" />
          <SkBox className="h-4 w-96 max-w-full" />
        </div>
        <SkBox className="h-11 w-32 shrink-0 sm:h-9" />
      </div>

      <div aria-busy="true">
        {/* Toolbar: summary line (segment only for multi-business owners). */}
        <div className="mb-4 flex min-h-9 items-center">
          <SkBox className="h-4 w-56 max-w-full" />
        </div>

        <div className="space-y-3">
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
                <SkBox className="h-11 w-36 sm:h-9" />
                <SkBox className="h-11 w-11 sm:h-9 sm:w-9" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
