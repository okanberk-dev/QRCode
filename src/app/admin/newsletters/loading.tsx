import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin newsletter subscribers — PageHeader + 4 KPI cards + filter card +
 * subscriber list card. The page renders the same KPI and row skeletons
 * while it fetches (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card space-y-3 p-4">
            <SkBox className="h-3 w-16" />
            <SkBox className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-pn-line bg-white p-4 sm:p-5">
        <SkBox className="h-9 w-full sm:w-72" />
        <SkBox className="h-9 w-28" />
        <SkBox className="h-9 w-32" />
        <SkBox className="h-9 w-40" />
        <SkBox className="h-9 w-full sm:w-52" />
      </div>
      <div className="divide-y divide-pn-line overflow-hidden rounded-[24px] border border-pn-line bg-white">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <SkBox className="h-4 w-48 max-w-[50%]" />
            <SkBox className="h-4 w-10" />
            <SkBox className="hidden h-4 w-24 md:block" />
            <SkBox className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
