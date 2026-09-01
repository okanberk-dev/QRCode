import { SkBox, SkPageHeader } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner feedbacks inbox skeleton.
 *
 * §38.238 — this used to render `<SkPageShell max={1600}>`, i.e. a centered,
 * padded, 1600px-capped shell wrapping three `bz-card` boxes in a
 * `lg:grid-cols-[240px_1fr_360px] gap-4` grid. The real page (page.tsx:855) is
 * deliberately FULL-BLEED: no outer wrapper, padding only on the header, and a
 * zero-gap `xl:grid-cols-[260px_360px_minmax(0,1fr)]` split with border
 * dividers so the filter rail butts against the sidebar.
 *
 * The two shared no layout, so hydration moved the rail from 240px@x≈28 to
 * 260px@x=0, resized the list, collapsed the gaps and re-centered the page — a
 * large horizontal CLS spike on the panel's busiest screen. §40.10 requires the
 * skeleton to clone the page wrapper exactly; this now does.
 */
export default function Loading() {
  return (
    <div className="min-h-full bg-white lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      {/* Header — padded wrapper only, matching page.tsx. */}
      <div className="px-4 sm:px-7 py-6 lg:py-8 border-b border-[#EDEDED]">
        <SkPageHeader withActions titleWidth="w-44" />
      </div>

      {/* Columns — same track definition as the page, zero gap, border dividers. */}
      <div className="flex min-h-0 flex-1 flex-col bg-white lg:flex-row lg:overflow-hidden xl:grid xl:grid-cols-[260px_360px_minmax(0,1fr)] 2xl:grid-cols-[300px_400px_minmax(0,1fr)]">
        {/* Filter rail — xl+ only, mirroring FeedbackFiltersRail. */}
        <div className="hidden xl:block border-r border-[#EDEDED] p-4 space-y-3">
          <SkBox className="h-3 w-20" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBox key={i} className="h-8 w-full" />
            ))}
          </div>
          <SkBox className="h-3 w-24" />
          <div className="space-y-2">
            <SkBox className="h-7 w-full" />
            <SkBox className="h-7 w-full" />
          </div>
        </div>

        {/* List column. */}
        <div className="w-full border-b border-[#EDEDED] lg:w-[380px] lg:border-b-0 lg:border-r xl:w-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-b border-[#F5F5F5] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <SkBox className="h-4 w-32" />
                <SkBox className="h-3 w-16" />
              </div>
              <SkBox className="h-3 w-24" />
              <SkBox className="h-4 w-5/6" />
            </div>
          ))}
        </div>

        {/* Detail pane — lg+ only, no card chrome (the page has none). */}
        <div className="hidden min-w-0 flex-1 space-y-3 p-5 sm:p-8 lg:block">
          <SkBox className="h-3 w-20" />
          <SkBox className="h-6 w-48" />
          <SkBox className="h-4 w-full" />
          <SkBox className="h-4 w-3/4" />
          <SkBox className="h-32 w-full" />
          <SkBox className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
