import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner menu builder skeleton (CLAUDE.md §40.10). Clones page.tsx:
 * page header (title, business name, preview / share / "More") → status strip →
 * [category column | item panel | preview rail] (phones and tablets get a chip
 * strip instead of the column). The client page renders this same component for
 * its first data load, so segment loading → client loading → content does not
 * swap layers. Breakpoints and wrapper match the page: ≥1024 two columns,
 * ≥1400 three.
 */
export default function Loading() {
  return (
    <SkPageShell max={1600} space={6}>
      {/* Page header — PageHeader's real heights: the compact h1 is
          clamp(20px, 2.6vw, 24px) × 1.15 after a 4px margin, the description
          line is 13px × 1.55 after an 8px margin. Actions: one row, 44px tall on
          phones (preview + share stretch, "More" is a 44px square). */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0 flex-1">
          <div className="mt-1" style={{ height: 'calc(clamp(20px, 2.6vw, 24px) * 1.15)' }}>
            <SkBox className="h-full w-24" />
          </div>
          <div className="mt-2 flex h-5 items-center">
            <SkBox className="h-4 w-80 max-w-full" />
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <SkBox className="h-11 flex-1 rounded-lg sm:h-[35px] sm:w-[88px] sm:flex-none" />
          <SkBox className="h-11 flex-1 rounded-lg sm:h-[35px] sm:w-[124px] sm:flex-none" />
          <SkBox className="h-11 w-11 shrink-0 rounded-lg sm:h-[35px] sm:w-[76px]" />
        </div>
      </div>

      {/* Status strip — mirrors MenuStatusBar's draft layout (the strip is
          lg:min-h-[96px] in every state, so 1024+ is height-stable) */}
      <div className="space-y-3">
        <div className="bz-card p-4 sm:px-5 lg:flex lg:min-h-[96px] lg:flex-col lg:justify-center">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
            <div className="flex h-[22px] items-center gap-2 lg:h-auto lg:flex-col lg:items-start lg:gap-1.5">
              <SkBox className="h-4 w-16" />
              <SkBox className="h-3 w-40 max-w-[55%] lg:max-w-full" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkBox key={i} className="h-11 w-full rounded-full sm:h-9 sm:w-28" />
              ))}
            </div>
            <SkBox className="h-11 w-full rounded-lg lg:h-9 lg:w-28" />
          </div>
        </div>
      </div>

      {/* Category chips (phones / tablets) */}
      <div className="-mx-4 border-b border-[#EDEDED] px-4 sm:-mx-7 sm:px-7 lg:hidden">
        <div className="flex gap-2 overflow-hidden py-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBox key={i} className="h-11 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* Categories | items | preview rail */}
      <div className="grid items-start gap-5 lg:max-[1399px]:grid-cols-[240px_minmax(0,1fr)] min-[1400px]:grid-cols-[240px_minmax(0,1fr)_342px]">
        <div className="bz-card hidden overflow-hidden lg:block">
          <div className="space-y-1.5 border-b border-[#EDEDED] px-5 py-4">
            <SkBox className="h-4 w-24" />
            <SkBox className="h-3 w-14" />
          </div>
          <div className="divide-y divide-[#F5F5F5]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex min-h-[56px] items-center gap-2 px-3">
                <SkBox className="h-5 w-5" />
                <SkBox className="h-4 flex-1" />
                <SkBox className="h-5 w-5" />
              </div>
            ))}
          </div>
          <div className="border-t border-[#F5F5F5] p-3">
            <SkBox className="h-[34px] w-full rounded-lg" />
          </div>
        </div>

        <div className="bz-card overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-[#EDEDED] px-4 py-4 sm:px-6">
            <div className="space-y-2">
              <SkBox className="h-5 w-44" />
              <SkBox className="h-3 w-14" />
            </div>
            <SkBox className="h-[34px] w-28 rounded-full" />
          </div>
          <div className="divide-y divide-[#F5F5F5]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                <SkBox className="h-11 w-11" />
                <SkBox className="h-12 w-12 rounded-xl sm:h-14 sm:w-14" />
                <div className="flex-1 space-y-2">
                  <SkBox className="h-4 w-1/3" />
                  <SkBox className="h-3 w-16" />
                </div>
                <SkBox className="h-7 w-[46px] rounded-full" />
                <SkBox className="h-9 w-9" />
              </div>
            ))}
          </div>
        </div>

        {/* Preview rail = MenuLivePreview: header 46 + stage 605 (phone frame 557)
            + footer 73 inside a 1px border = 726px, the tallest column. */}
        <div className="bz-card hidden self-start overflow-hidden min-[1400px]:block">
          <div className="flex h-[46px] items-center justify-between border-b border-[#EDEDED] px-4">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-5 w-14 rounded-full" />
          </div>
          <div className="px-4 py-6">
            <SkBox className="mx-auto h-[557px] w-[308px] max-w-full rounded-[40px]" />
          </div>
          <div className="flex h-[73px] flex-col justify-between border-t border-[#EDEDED] px-4 py-3">
            <SkBox className="h-2.5 w-full" />
            <SkBox className="h-2.5 w-full" />
            <SkBox className="h-2.5 w-2/3" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
