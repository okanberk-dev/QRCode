import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Menu analytics skeleton (CLAUDE.md §40.10).
 *
 * One component, two users: the segment `loading.tsx` (server fetch window)
 * AND the client page while its first request is in flight. Rendering the very
 * same tree in both places means loading → loading → content never swaps
 * layers — the visitor sees a single skeleton, then the report.
 *
 * It clones the top of `page.tsx` box for box (header card, four KPI cards,
 * the start of "Ne yapmalı?") so the report replaces it without a jump. The
 * numbers below are the real element heights at phone width and at ≥ sm, kept
 * in step with `page.tsx`. Everything under the KPI row is data-dependent
 * (how many rows a report has) and only approximates a typical report.
 */
export function AnalyticsSkeleton() {
  return (
    <SkPageShell max={1440} space={6}>
      {/* Header card: back link, title, subtitle, window label, refresh, filters */}
      <div className="bz-card flex flex-col gap-4 p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <SkBox className="h-11 w-36 sm:h-5" />
            <SkBox className="h-8 w-64 max-w-full sm:h-9" />
            <SkBox className="h-10 w-full max-w-xl sm:h-5" />
            <SkBox className="h-[21px] w-48 max-w-full" />
          </div>
          <SkBox className="h-11 w-[85px] shrink-0 rounded-full sm:h-[35px]" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SkBox className="h-[102px] w-full rounded-xl sm:h-[39px] sm:w-[401px]" />
          <SkBox className="h-11 w-full sm:h-[34px] sm:w-[142px]" />
          <SkBox className="h-11 w-full sm:h-[34px] sm:w-[135px]" />
        </div>
      </div>

      {/* Four KPI cards: label row 14px, value 28px, delta 12px (24px on phones) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card min-w-0 space-y-3 p-4">
            <SkBox className="h-[14px] w-24" />
            <SkBox className="h-7 w-20" />
            <SkBox className="h-6 w-full max-w-[9rem] sm:h-3" />
          </div>
        ))}
      </div>

      {/* Ne yapmalı? */}
      <div className="bz-card space-y-3 p-5 sm:p-6">
        <SkBox className="h-4 w-32" />
        <SkBox className="h-3 w-72 max-w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkBox key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>

      {/* Products | categories */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="bz-card space-y-3 p-5 sm:p-6">
          <SkBox className="h-4 w-48" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkBox className="h-4 w-4" />
              <SkBox className="h-4 flex-1" />
              <SkBox className="h-4 w-12" />
            </div>
          ))}
        </div>
        <div className="bz-card space-y-3 p-5 sm:p-6">
          <SkBox className="h-4 w-32" />
          <SkBox className="h-72 w-full" />
        </div>
      </div>

      {/* Over time */}
      <div className="bz-card space-y-3 p-5 sm:p-6">
        <SkBox className="h-4 w-36" />
        <SkBox className="h-72 w-full" />
      </div>
    </SkPageShell>
  );
}

export default AnalyticsSkeleton;
