import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner dashboard home — structural clone of `dashboard/page.tsx`
 * (CLAUDE.md §40.10 — same wrapper, same order, close heights, so the swap
 * to the real page does not push content around):
 * greeting header (breadcrumb from sm; actions wrap below md) → setup
 * checklist → Fintora block: headline card (first column, three rows on lg)
 * + four KPI cards (2×2) + the rating volume chart (from sm) → two columns
 * on lg (channels + topics on the left; pending tasks, shortcuts and recent
 * activity on the right).
 * The setup checklist is shown on most visits (until it is dismissed), so
 * it gets a placeholder; the rarer AI insight banner does not.
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={3}>
      {/* Same classes as the PageHeader primitive. */}
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end lg:mb-6">
        <div className="min-w-0 flex-1">
          <SkBox className="mb-2.5 hidden h-4 w-40 sm:block" />
          {/* The greeting wraps to two lines below xl. */}
          <SkBox className="h-8 w-[480px] max-w-full" />
          <SkBox className="mt-1.5 h-8 w-48 max-w-full xl:hidden" />
          <SkBox className="mt-2.5 h-3.5 w-64 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <SkBox className="h-11 w-[124px] rounded-full" />
          <SkBox className="h-11 w-[130px] rounded-full" />
        </div>
      </div>

      {/* Setup checklist: progress on the left (lg), remaining step(s) right. */}
      <div className="bz-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          <div className="lg:w-[260px] lg:shrink-0">
            <SkBox className="h-5 w-44 max-w-full" />
            <SkBox className="mt-2 h-3.5 w-32" />
            <SkBox className="mt-4 h-2.5 w-full rounded-full" />
            <div className="mt-2 flex h-11 items-center sm:h-8">
              <SkBox className="h-3 w-36" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-h-[60px] items-center gap-3 rounded-[16px] bg-pn-canvas px-3 py-2.5">
              <SkBox className="h-10 w-10 shrink-0 rounded-full" />
              <SkBox className="h-3.5 max-w-[220px] flex-1" />
              <SkBox className="h-11 w-20 shrink-0 rounded-full sm:h-9" />
            </div>
          </div>
        </div>
      </div>

      {/* Headline card + 4 KPI cards + chart. */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="bz-card col-span-2 flex flex-col p-5 sm:p-6 lg:col-span-1 lg:row-span-3">
          <div className="flex items-center justify-between">
            <SkBox className="h-4 w-40" />
            <SkBox className="h-11 w-11 rounded-full" />
          </div>
          <SkBox className="mt-1 h-11 w-28 sm:h-12" />
          <SkBox className="mt-3 h-6 w-36 rounded-full" />
          <div className="mt-6 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <SkBox key={i} className="h-10 rounded-full" />
            ))}
          </div>
          <SkBox className="mt-6 h-[96px] w-full" />
          <div className="mt-auto space-y-3 pt-6">
            <SkBox className="h-4 w-48" />
            <SkBox className="h-2.5 w-full rounded-full" />
            <SkBox className="h-[64px] w-full" />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bz-card p-5 sm:p-6">
            <div className="flex h-10 items-center justify-between gap-2">
              <SkBox className="h-3.5 w-16" />
              <SkBox className="h-10 w-10 rounded-full" />
            </div>
            <SkBox className="mt-3 h-8 w-16 sm:mt-4 sm:h-9" />
            <SkBox className="mt-3 h-6 w-24 max-w-full rounded-full" />
          </div>
        ))}
        {/* Rating volume chart (tablet + desktop). */}
        <div className="bz-card col-span-2 hidden space-y-4 p-5 sm:block sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <SkBox className="h-5 w-32" />
              <SkBox className="h-3.5 w-48" />
            </div>
            <SkBox className="h-11 w-48 rounded-full" />
          </div>
          <SkBox className="h-4 w-56" />
          <SkBox className="h-[220px] w-full sm:h-[260px]" />
          <SkBox className="h-3 w-32" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-2.5">
          {/* Platforms customers were sent to. */}
          <div className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-5 w-52" />
            <SkBox className="h-2.5 w-full rounded-full" />
            <SkBox className="h-[64px] w-full" />
            <SkBox className="h-[64px] w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {/* Pending tasks. */}
          <div className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-5 w-32" />
            <SkBox className="h-3.5 w-20" />
            <SkBox className="h-[64px] w-full" />
          </div>
          {/* Recent activity. */}
          <div className="bz-card space-y-2 p-5 sm:p-6">
            <SkBox className="mb-2 h-5 w-32" />
            <SkBox className="h-[64px] w-full" />
            <SkBox className="h-[64px] w-full" />
            <SkBox className="h-[64px] w-full" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
