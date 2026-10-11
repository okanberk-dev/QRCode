import {
  SkBox,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin restaurant detail — header card (back link + avatar + name +
 * actions) followed by the 1.25fr / 0.75fr links + summary grid. Mirrors
 * page.tsx so the skeleton hands over without a layout jump (CLAUDE.md
 * §40.10). The page also renders this component during its own first load.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={5}>
      <div className="rounded-3xl border border-[#EDEDED] bg-white p-6 shadow-sm sm:p-8">
        <SkBox className="h-3 w-32" />
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <SkBox className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="space-y-2">
              <SkBox className="h-7 w-64 max-w-full" />
              <SkBox className="h-3 w-48 max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkBox className="h-9 w-24 rounded-full" />
            <SkBox className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4 rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <SkBox className="h-10 w-10 rounded-2xl" />
            <div className="space-y-1.5">
              <SkBox className="h-3 w-28" />
              <SkBox className="h-4 w-52 max-w-full" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkBox key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
          <SkBox className="h-3 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBox key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
          <SkBox className="h-16 w-full rounded-2xl" />
          <SkBox className="h-9 w-full rounded-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
