import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin newsletter campaigns — header card + filter card + campaign list
 * card. The page renders the same row skeleton while it fetches
 * (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={6}>
      <div className="space-y-3 rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
        <SkBox className="h-3 w-28" />
        <SkBox className="h-8 w-72 max-w-full" />
        <SkBox className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
        <SkBox className="h-9 w-full sm:w-96" />
        <SkBox className="h-9 w-full sm:w-52" />
      </div>
      <div className="divide-y divide-[#EDEDED] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <SkBox className="h-4 w-56 max-w-[55%]" />
            <SkBox className="h-4 w-10" />
            <SkBox className="hidden h-5 w-20 rounded-full md:block" />
            <SkBox className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
