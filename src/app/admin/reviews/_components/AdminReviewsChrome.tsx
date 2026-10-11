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

export const ADMIN_REVIEWS_ROOT_CLASS =
  'flex min-h-full w-full min-w-0 flex-1 flex-col bg-white lg:min-h-0';

export const ADMIN_REVIEWS_SPLIT_CLASS =
  'lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]';

export function AdminReviewsHeader({ isTr, className = '' }: { isTr: boolean; className?: string }) {
  return (
    <div className={`px-4 pb-3 pt-5 sm:px-7 lg:pb-4 lg:pt-6 ${className}`}>
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

      {/* Toolbar — same padding and rows as InboxToolbar. */}
      <div className="border-y border-[#EDEDED] bg-white px-4 py-3 sm:px-7" aria-hidden="true">
        <div className="flex gap-1.5 overflow-hidden">
          {['w-20', 'w-36', 'w-32', 'w-32'].map((w, i) => (
            <SkBox key={i} className={`h-9 shrink-0 rounded-full ${w}`} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <div className="flex items-center gap-2 md:contents">
            <SkBox className="h-10 min-w-0 flex-1 rounded-full md:h-[34px] md:flex-[1_1_240px] xl:max-w-[340px]" />
            <SkBox className="h-10 w-10 shrink-0 rounded-full md:hidden" />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <SkBox className="h-[34px] w-[150px] rounded-[10px]" />
            <SkBox className="h-[34px] w-[150px] rounded-[10px]" />
            <SkBox className="h-[34px] w-[150px] rounded-[10px]" />
            <SkBox className="h-[34px] w-32 rounded-full" />
          </div>
        </div>
      </div>

      {/* Split — same tracks as the page. */}
      <div className={ADMIN_REVIEWS_SPLIT_CLASS}>
        <div className="min-h-0 lg:overflow-hidden lg:border-r lg:border-[#EDEDED]">
          <AdminFeedbackSelectAllSkeleton />
          {Array.from({ length: 6 }).map((_, i) => (
            <AdminFeedbackListSkeletonRow key={i} />
          ))}
        </div>
        <div className="hidden min-w-0 lg:block">
          <AdminFeedbackDetailSkeleton />
        </div>
      </div>
    </div>
  );
}
