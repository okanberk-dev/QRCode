import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import { FeedbackListSkeletonRow } from './_components/FeedbackList';
import { FeedbackDetailSkeleton } from './_components/FeedbackDetail';

/**
 * Owner reviews inbox skeleton — §40.10: a structural clone of page.tsx so
 * nothing moves on hydration. Full-bleed root (§38.62) on the canvas, the
 * same header and toolbar padding, and the same 2-column split tracks
 * (360 / 420 / 480 list card + minmax(0,1fr) detail card, 10px apart). The
 * list rows and the detail placeholder are the very components the page
 * renders while its own fetch is in flight.
 */
export default function Loading() {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      {/* Header */}
      <div className="px-4 pb-2 pt-5 sm:px-6 lg:px-4 lg:pb-3 lg:pt-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex h-9 items-center lg:hidden">
              <SkBox className="h-7 w-40" />
            </div>
            <div className="mt-1 flex min-h-[22px] items-center lg:mt-0">
              <SkBox className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SkBox className="h-11 w-32 rounded-full" />
            <SkBox className="h-11 w-36 rounded-full" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 sm:px-6 lg:px-4 lg:pb-3 lg:pt-1">
        <div className="flex gap-1.5 overflow-hidden">
          {['w-20', 'w-28', 'w-28', 'w-28', 'w-28'].map((w, i) => (
            <SkBox key={i} className={`h-11 shrink-0 rounded-full sm:h-10 ${w}`} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <div className="flex items-center gap-2 md:contents">
            <SkBox className="h-11 min-w-0 flex-1 rounded-full md:h-[46px] md:flex-[1_1_240px] xl:max-w-[340px]" />
            <SkBox className="h-11 w-11 shrink-0 rounded-full md:hidden" />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <SkBox className="h-[46px] w-[150px] rounded-full" />
            <SkBox className="h-[46px] w-[150px] rounded-full" />
            <SkBox className="h-[46px] w-[150px] rounded-full" />
            {/* "Yanıtsızlar" + "Yalnız işaretliler" toggles */}
            <SkBox className="h-[46px] w-[112px] rounded-full" />
            <SkBox className="h-[46px] w-[148px] rounded-full" />
          </div>
        </div>
      </div>

      {/* Split — same tracks and cards as the page. */}
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-2.5 lg:overflow-hidden lg:px-2 lg:pb-2 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]">
        <div className="min-h-0 space-y-2 px-2 pb-4 sm:mx-6 sm:mb-6 sm:rounded-[24px] sm:bg-white sm:p-2 lg:m-0 lg:overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <FeedbackListSkeletonRow key={i} />
          ))}
        </div>
        <div className="hidden min-w-0 bg-white lg:block lg:rounded-[28px]">
          <FeedbackDetailSkeleton />
        </div>
      </div>
    </div>
  );
}
