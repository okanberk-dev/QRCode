import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner menu builder skeleton (CLAUDE.md §40.10). Clones page.tsx:
 * back link + page header (title, four buttons) → status strip →
 * [category column | item panel | preview rail] (phones and tablets get a chip
 * strip instead of the column). The client page renders this same component for
 * its first data load, so segment loading → client loading → content does not
 * swap layers. Breakpoints and wrapper match the page: ≥1024 two columns,
 * ≥1400 three.
 */
export default function Loading() {
  return (
    <SkPageShell max={1600} space={6}>
      {/* Back link + page header */}
      <div className="space-y-3">
        <SkBox className="h-8 w-28" />
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
          <div className="min-w-0 flex-1">
            <SkBox className="h-3 w-12" />
            <SkBox className="mt-1 h-[35px] w-72 max-w-full" />
            <SkBox className="mt-2 hidden h-4 w-80 max-w-full sm:block" />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBox key={i} className="h-11 w-full rounded-full sm:h-[34px] sm:w-28" />
            ))}
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div className="space-y-3">
        <div className="bz-card p-4 sm:px-5 lg:min-h-[76px]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
            <div className="space-y-2">
              <SkBox className="h-4 w-24" />
              <SkBox className="h-3 w-56 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkBox key={i} className="h-11 w-28 rounded-full sm:h-9" />
              ))}
            </div>
            <SkBox className="h-11 w-full rounded-full lg:h-[34px] lg:w-28" />
          </div>
        </div>
      </div>

      {/* Category chips (phones / tablets) */}
      <div className="-mx-4 border-b border-[#EDEDED] px-4 sm:-mx-7 sm:px-7 lg:hidden">
        <div className="flex gap-2 overflow-hidden py-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBox key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* Categories | items | preview rail */}
      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] min-[1400px]:grid-cols-[240px_minmax(0,1fr)_320px]">
        <div className="hidden overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm lg:block">
          <div className="space-y-1.5 border-b border-[#EDEDED] px-5 py-4">
            <SkBox className="h-3 w-20" />
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
            <SkBox className="h-[34px] w-full rounded-full" />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[#EDEDED] px-4 py-4 sm:px-6">
            <div className="space-y-2">
              <SkBox className="h-3 w-16" />
              <SkBox className="h-5 w-44" />
              <SkBox className="h-3 w-14" />
            </div>
            <SkBox className="h-[34px] w-28 rounded-full" />
          </div>
          <div className="divide-y divide-[#F5F5F5]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                <SkBox className="h-11 w-9" />
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

        <div className="hidden self-start overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm min-[1400px]:block">
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-4 py-3">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-5 w-14 rounded-full" />
          </div>
          <div className="px-4 py-6">
            <SkBox className="mx-auto h-[540px] w-[308px] max-w-full rounded-[40px]" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
