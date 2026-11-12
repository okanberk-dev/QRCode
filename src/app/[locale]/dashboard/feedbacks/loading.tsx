import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import { FeedbackListSkeletonRow } from './_components/FeedbackList';
import { FeedbackDetailSkeleton } from './_components/FeedbackDetail';

/**
 * Owner reviews inbox skeleton — §40.10: a structural clone of page.tsx so
 * nothing moves on hydration. Full-bleed root (§38.62), the same header and
 * toolbar padding, and the same 2-column split tracks (360 / 420 / 480 list +
 * minmax(0,1fr) detail). The list rows and the detail placeholder are the
 * very components the page renders while its own fetch is in flight.
 */
export default function Loading() {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col bg-white lg:min-h-0 lg:flex-1">
      {/* Header */}
      <div className="px-4 pb-3 pt-5 sm:px-7 lg:pb-4 lg:pt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex h-9 items-center lg:hidden">
              <SkBox className="h-6 w-40" />
            </div>
            <div className="mt-0.5 flex min-h-[20px] items-center">
              <SkBox className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SkBox className="h-11 w-28 rounded-full sm:h-[34px]" />
            <SkBox className="h-11 w-32 rounded-full sm:h-[34px]" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-y border-[#EDEDED] bg-white px-4 py-3 sm:px-7">
        <div className="flex gap-1.5 overflow-hidden">
          {['w-20', 'w-28', 'w-28', 'w-28', 'w-28'].map((w, i) => (
            <SkBox key={i} className={`h-11 shrink-0 rounded-full sm:h-9 ${w}`} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <div className="flex items-center gap-2 md:contents">
            <SkBox className="h-11 min-w-0 flex-1 rounded-full md:h-[34px] md:flex-[1_1_240px] xl:max-w-[340px]" />
            <SkBox className="h-11 w-11 shrink-0 rounded-full md:hidden" />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <SkBox className="h-[34px] w-[150px] rounded-[10px]" />
            <SkBox className="h-[34px] w-[150px] rounded-[10px]" />
            <SkBox className="h-[34px] w-[150px] rounded-[10px]" />
            {/* "Yanıtsızlar" + "Yalnız işaretliler" toggles */}
            <SkBox className="h-[34px] w-[84px] rounded-full" />
            <SkBox className="h-[34px] w-[112px] rounded-full" />
          </div>
        </div>
      </div>

      {/* Split — same tracks as the page. */}
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]">
        <div className="min-h-0 lg:overflow-hidden lg:border-r lg:border-[#EDEDED]">
          {Array.from({ length: 6 }).map((_, i) => (
            <FeedbackListSkeletonRow key={i} />
          ))}
        </div>
        <div className="hidden min-w-0 lg:block">
          <FeedbackDetailSkeleton />
        </div>
      </div>
    </div>
  );
}
