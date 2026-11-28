'use client';

import { PageHeader } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import { AdminFeedbackListSkeletonRow, AdminFeedbackSelectAllSkeleton } from './AdminFeedbackList';
import { AdminFeedbackDetailSkeleton } from './AdminFeedbackDetail';

/**
 * Shared chrome for /admin/reviews: the page header (static copy, so the
 * skeleton can render it verbatim) and the full-page skeleton used by
 * loading.tsx and the page's Suspense fallback. Both clone the page's DOM
 * (§40.10): full-bleed root, the same header / toolbar padding and the same
 * split tracks as the owner inbox (360 / 420 / 480 list + minmax(0,1fr)).
 */

// Fintora layout: header + toolbar on the grey canvas, the list and the
// detail as two white cards (24 / 28px) 10px apart that scroll internally
// on lg. On phones the page is white and the rows carry their own fill.
export const ADMIN_REVIEWS_ROOT_CLASS =
  'flex min-h-full w-full min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden';

export const ADMIN_REVIEWS_SPLIT_CLASS =
  'lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-2.5 lg:overflow-hidden lg:px-7 lg:pb-6 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]';

/** List card (aside): white card on sm+, plain rows on phones. */
export const ADMIN_REVIEWS_LIST_CLASS =
  'min-h-0 px-2 pb-4 sm:mx-6 sm:mb-6 sm:rounded-[24px] sm:bg-white sm:p-2 lg:m-0 lg:overflow-y-auto';

/** Detail card column. */
export const ADMIN_REVIEWS_DETAIL_CLASS =
  'min-w-0 flex-col bg-white sm:mx-6 sm:mb-6 sm:rounded-[28px] lg:m-0 lg:flex lg:min-h-0 lg:overflow-hidden';

export function AdminReviewsHeader({ isTr, className = '' }: { isTr: boolean; className?: string }) {
  return (
    <div className={`px-4 pb-2 pt-5 sm:px-7 lg:pb-1 lg:pt-5 ${className}`}>
      <PageHeader
        className="mb-0"
        titleScale="compact"
        title={isTr ? 'Yorumlar' : 'Reviews'}
        description={
          isTr
            ? 'Tüm işletmelerden gelen yorumları incele, yanıtla, işaretle veya ata.'
            : 'Review, reply to, flag or assign feedback from every business.'
        }
      />
    </div>
  );
}

export function AdminReviewsSkeleton({ isTr }: { isTr: boolean }) {
  return (
    <div className={ADMIN_REVIEWS_ROOT_CLASS} aria-busy="true">
      <AdminReviewsHeader isTr={isTr} />

      {/* Toolbar — same rows as InboxToolbar (button mode). */}
      <div className="px-4 py-3 sm:px-7 lg:pb-3 lg:pt-1" aria-hidden="true">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex min-w-0 gap-1.5 overflow-hidden md:flex-1">
            {['w-20', 'w-36', 'w-32', 'w-32'].map((w, i) => (
              <SkBox key={i} className={`h-11 shrink-0 rounded-full sm:h-10 ${w}`} />
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-2 md:ml-auto md:w-[min(460px,52%)] xl:w-[min(460px,40%)]">
            <SkBox className="h-11 min-w-0 flex-1 rounded-full md:h-12" />
            <SkBox className="h-11 w-11 shrink-0 rounded-full md:h-12 md:w-[116px]" />
          </div>
        </div>
      </div>

      {/* Split — same tracks and cards as the page. */}
      <div className={ADMIN_REVIEWS_SPLIT_CLASS}>
        <div className={`${ADMIN_REVIEWS_LIST_CLASS} space-y-2`}>
          <AdminFeedbackSelectAllSkeleton />
          {Array.from({ length: 6 }).map((_, i) => (
            <AdminFeedbackListSkeletonRow key={i} />
          ))}
        </div>
        <div className="hidden min-w-0 bg-white lg:block lg:rounded-[28px]">
          <AdminFeedbackDetailSkeleton />
        </div>
      </div>
    </div>
  );
}
