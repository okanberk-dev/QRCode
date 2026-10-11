import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner getting-started guide — mirrors page.tsx (CLAUDE.md §40.10):
 * PageHeader, quick-start banner, 2-column grid of six step cards, the dark
 * tips block and the two closing cards, inside the same `space-y-6` shell.
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={6}>
      <SkPageHeader titleWidth="w-72" />

      <div className="bz-card flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-start gap-3">
          <SkBox className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-5 w-64 max-w-full" />
            <SkBox className="h-4 w-full max-w-[560px]" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkBox className="h-9 w-32 rounded-full" />
          <SkBox className="h-9 w-36 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bz-card flex flex-col gap-3 p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <SkBox className="h-9 w-9 rounded-full" />
              <SkBox className="h-3 w-6" />
            </div>
            <SkBox className="h-5 w-56 max-w-full" />
            <SkBox className="h-4 w-full" />
            <SkBox className="h-4 w-4/5" />
            <SkBox className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="h-[340px] rounded-2xl bg-[#EDEDED]" aria-hidden="true" />

      <div className="bz-card-soft space-y-3 p-5 sm:p-6">
        <SkBox className="h-4 w-48" />
        <SkBox className="h-4 w-80 max-w-full" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkBox key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
