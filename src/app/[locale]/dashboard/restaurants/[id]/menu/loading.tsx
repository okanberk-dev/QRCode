import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner menu builder skeleton (CLAUDE.md §40.10). Clones page.tsx:
 * header card → [theme panel | live preview] → mobile preview hint →
 * [categories | items]. The client page renders this same component for its
 * first data load, so segment loading → client loading → content does not
 * swap layers.
 */
export default function Loading() {
  return (
    <SkPageShell max={1600} space={6}>
      {/* Header card */}
      <div className="rounded-3xl border border-[#EDEDED] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-3 w-20" />
            <div className="flex items-center gap-3">
              <SkBox className="h-11 w-11 shrink-0 rounded-2xl" />
              <SkBox className="h-8 w-56 max-w-full" />
            </div>
            <SkBox className="h-3 w-full max-w-[520px]" />
            <SkBox className="h-3 w-40" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBox key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Theme panel + live preview */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[#EDEDED] px-6 py-4">
            <SkBox className="h-8 w-8 rounded-xl" />
            <div className="space-y-1.5">
              <SkBox className="h-3 w-28" />
              <SkBox className="h-3 w-40" />
            </div>
          </div>
          <div className="space-y-7 p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkBox key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkBox key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
            <SkBox className="h-20 w-full rounded-2xl" />
          </div>
        </div>
        <div className="hidden self-start overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm lg:block">
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-4 py-3">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-5 w-14 rounded-full" />
          </div>
          <div className="px-4 py-6">
            <SkBox className="mx-auto h-[540px] w-[308px] max-w-full rounded-[40px]" />
          </div>
        </div>
      </div>

      {/* Mobile preview hint */}
      <SkBox className="h-10 w-full rounded-xl lg:hidden" />

      {/* Categories + items */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#EDEDED] px-5 py-4">
            <div className="space-y-1.5">
              <SkBox className="h-3 w-24" />
              <SkBox className="h-3 w-14" />
            </div>
            <SkBox className="h-8 w-28 rounded-full" />
          </div>
          <div className="divide-y divide-[#F5F5F5]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <SkBox className="h-4 w-4" />
                <SkBox className="h-4 flex-1" />
                <SkBox className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[#EDEDED] px-5 py-4 sm:px-6">
            <div className="space-y-2">
              <SkBox className="h-3 w-16" />
              <SkBox className="h-5 w-44" />
            </div>
            <SkBox className="h-8 w-24 rounded-full" />
          </div>
          <div className="space-y-3 p-5 sm:p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#EDEDED] p-3">
                <SkBox className="h-14 w-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkBox className="h-4 w-1/3" />
                  <SkBox className="h-3 w-2/3" />
                </div>
                <SkBox className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
