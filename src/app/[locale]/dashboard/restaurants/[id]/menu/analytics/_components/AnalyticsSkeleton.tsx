import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Menu analytics skeleton (CLAUDE.md §40.10).
 *
 * One component, two users: the segment `loading.tsx` (server fetch window)
 * AND the client page while its first request is in flight. Rendering the very
 * same tree in both places means loading → loading → content never swaps
 * layers — the visitor sees a single skeleton, then the report.
 *
 * It clones the top of `page.tsx` box for box (back link + header, the
 * filter toolbar, four KPI cards, the start of "Ne yapmalı?") so the report
 * replaces it without a jump. The
 * numbers below are the real element heights at phone width and at ≥ sm, kept
 * in step with `page.tsx`. Everything under the KPI row is data-dependent
 * (how many rows a report has) and only approximates a typical report.
 */
export function AnalyticsSkeleton() {
  return (
    <SkPageShell max={1440} space={6}>
      {/* Back link (44px tall on phones, 32px from sm) + PageHeader: compact h1
          (clamp(20px, 2.6vw, 24px) × 1.15 after 4px), date range (12px × 1.5
          after 8px), description (13px × 1.55 after 8px; two lines on phones). */}
      <div className="space-y-2">
        <div className="flex h-11 items-center sm:h-8">
          <SkBox className="h-4 w-32" />
        </div>
        {/* flex: PageHeader's text column is a flex item, so the h1's top margin
            does not collapse into the gap above — same here. */}
        <div className="flex flex-col">
          <div className="mt-1" style={{ height: 'calc(clamp(20px, 2.6vw, 24px) * 1.15)' }}>
            <SkBox className="h-full w-56 max-w-full" />
          </div>
          <div className="mt-2 flex h-[18px] items-center">
            <SkBox className="h-3 w-44" />
          </div>
          <div className="mt-2 flex h-10 flex-col justify-around sm:h-5">
            <SkBox className="h-4 w-full max-w-xl" />
            <SkBox className="h-4 w-2/3 sm:hidden" />
          </div>
        </div>
      </div>

      {/* Toolbar: period segments (full width on phones), then category +
          source + refresh in one row. From sm the controls sit beside the
          segments when they fit and wrap to their own line when they do not —
          the same flex rules as page.tsx, so the break happens at the same width. */}
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-[50px] w-full rounded-[14px] sm:h-[34px] sm:w-[378px]" />
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-auto">
          <SkBox className="h-11 flex-1 rounded-[14px] sm:h-[34px] sm:w-[170px] sm:flex-none" />
          <SkBox className="h-11 flex-1 rounded-[14px] sm:h-[34px] sm:w-[160px] sm:flex-none" />
          <SkBox className="h-11 w-11 shrink-0 rounded-[14px] sm:ml-auto sm:h-[35px] sm:w-[83px]" />
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
          <SkBox key={i} className="h-14 w-full rounded-[24px]" />
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
