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
      {/* Header — breadcrumb, title + summary, actions (same box as the page). */}
      <div className="px-4 pb-2 pt-5 sm:px-7 lg:pb-3 lg:pt-8">
        <div className="hidden h-[22px] items-center sm:flex">
          <SkBox className="h-4 w-40" />
        </div>
        <div className="flex flex-col gap-3 sm:mt-2.5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <SkBox className="h-9 w-40" />
            <div className="mt-1.5 flex min-h-[22px] items-center">
              <SkBox className="h-4 w-56 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SkBox className="h-11 w-32 rounded-full" />
            <SkBox className="h-11 w-36 rounded-full" />
          </div>
        </div>
      </div>

      {/* Toolbar — same rows as InboxToolbar (button mode). */}
      <div className="px-4 py-3 sm:px-7 lg:pb-3 lg:pt-1" aria-hidden="true">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <SkBox className="h-12 w-[300px] max-w-full rounded-full" />
          <div className="flex min-w-0 items-center gap-2 md:ml-auto md:w-[min(460px,52%)] xl:w-[min(460px,40%)]">
            <SkBox className="h-11 min-w-0 flex-1 rounded-full md:h-12" />
            <SkBox className="h-11 w-11 shrink-0 rounded-full md:h-12 md:w-[116px]" />
          </div>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-hidden">
          {['w-20', 'w-28', 'w-28', 'w-28', 'w-28'].map((w, i) => (
            <SkBox key={i} className={`h-11 shrink-0 rounded-full sm:h-10 ${w}`} />
          ))}
        </div>
      </div>

      {/* Split — same tracks and cards as the page. */}
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-2.5 lg:overflow-hidden lg:px-7 lg:pb-6 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]">
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
