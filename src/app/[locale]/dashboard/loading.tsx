import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner dashboard home — structural clone of `dashboard/page.tsx`
 * (CLAUDE.md §40.10 — same wrapper, same order, close heights, so the swap
 * to the real page does not push content around):
 * greeting header (no eyebrow; actions wrap below md) → mobile summary card
 * (below sm only) → setup checklist → 4 KPI cards (first two hidden below sm,
 * the summary card carries them) → two columns on lg (chart on the left,
 * pending tasks + recent activity on the right).
 * The setup checklist is shown on most visits (until it is dismissed), so
 * it gets a placeholder; the rarer AI insight banner does not.
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={6}>
      {/* Same classes as the PageHeader primitive. */}
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1">
          {/* The greeting wraps to two lines below xl. */}
          <SkBox className="mt-1 h-7 w-[480px] max-w-full" />
          <SkBox className="mt-1.5 h-7 w-48 max-w-full xl:hidden" />
          <SkBox className="mt-3 h-3.5 w-64 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <SkBox className="h-11 w-[124px] sm:h-[38px]" />
          <SkBox className="h-11 w-[110px] sm:h-[38px]" />
        </div>
      </div>

      {/* Mobile summary card (graphite). */}
      <div className="h-[190px] rounded-[18px] bg-pn-ink sm:hidden" />

      {/* Setup checklist: progress on the left (lg), remaining step(s) right. */}
      <div className="bz-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          <div className="lg:w-[260px] lg:shrink-0">
            <SkBox className="h-4 w-44 max-w-full" />
            <SkBox className="mt-2 h-3 w-32" />
            <SkBox className="mt-4 h-2 w-full rounded-full" />
            <div className="mt-2 flex h-11 items-center sm:h-8">
              <SkBox className="h-3 w-36" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 px-3 py-2">
              <SkBox className="h-7 w-7 shrink-0 rounded-full" />
              <SkBox className="h-3.5 max-w-[220px] flex-1" />
              <SkBox className="h-11 w-28 shrink-0 rounded-full sm:h-[38px]" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards — below sm the first two live in the summary card. */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`bz-card min-h-[136px] p-3.5 sm:p-[18px] ${i < 2 ? 'hidden sm:block' : ''}`}
          >
            <SkBox className="h-3 w-16" />
            <SkBox className="mt-4 h-7 w-14" />
            <SkBox className="mt-3 h-3 w-24 max-w-full" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
        {/* Chart card (tablet + desktop). */}
        <div className="bz-card hidden space-y-3 p-5 sm:block sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <SkBox className="h-3 w-16" />
              <SkBox className="h-4 w-48" />
            </div>
            <SkBox className="h-8 w-36" />
          </div>
          <SkBox className="h-4 w-40" />
          <SkBox className="h-[300px] w-full md:h-[330px]" />
          <SkBox className="h-3 w-32" />
        </div>
        <div className="flex flex-col gap-3">
          {/* Pending tasks. */}
          <div className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-6 w-24" />
            <SkBox className="h-12 w-full" />
          </div>
          {/* Recent activity. */}
          <div className="bz-card space-y-3 p-5 sm:p-6">
            <SkBox className="h-3 w-32" />
            <SkBox className="h-11 w-full" />
            <SkBox className="h-11 w-full" />
            <SkBox className="h-11 w-full" />
            <SkBox className="h-11 w-full" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
