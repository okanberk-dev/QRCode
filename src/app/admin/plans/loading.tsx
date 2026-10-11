import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin plans — clones page.tsx (CLAUDE.md §40.10): header, 4 KPI cards,
 * plan distribution + recently paid (1fr / 1.4fr), PlansManager header +
 * tier card grid, payment integration note.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader titleWidth="w-44" />
      <SkStatGrid count={4} />

      <div className="grid gap-3.5 lg:grid-cols-[1fr_1.4fr]">
        <div className="bz-card p-5 sm:p-6 space-y-3">
          <SkBox className="h-3 w-24" />
          <SkBox className="h-5 w-36" />
          <div className="space-y-3 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <SkBox className="h-3 w-20" />
                  <SkBox className="h-3 w-6" />
                </div>
                <SkBox className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="bz-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-4">
            <SkBox className="h-3 w-44" />
            <SkBox className="h-3 w-10" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <SkBox className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <SkBox className="h-4 w-40" />
                <SkBox className="h-3 w-52 max-w-full" />
              </div>
              <SkBox className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <SkBox className="h-6 w-40" />
            <SkBox className="h-4 w-72 max-w-full" />
          </div>
          <SkBox className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-[#EDEDED] bg-white p-6 sm:p-7 space-y-3">
              <SkBox className="h-4 w-24" />
              <SkBox className="h-10 w-32" />
              <SkBox className="h-3 w-full" />
              <div className="space-y-2 pt-2">
                <SkBox className="h-3 w-3/4" />
                <SkBox className="h-3 w-2/3" />
                <SkBox className="h-3 w-3/4" />
                <SkBox className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <SkBox className="h-16 w-full rounded-xl" />
    </SkPageShell>
  );
}
