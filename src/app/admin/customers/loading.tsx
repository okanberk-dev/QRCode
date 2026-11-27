import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin customer (end-user feedback authors) registry — mirrors the page:
 * header + 3 KPI tiles + filter card (range / select / search, toggles,
 * segment pills) + table. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card space-y-3 p-3.5 sm:p-[18px]">
            <SkBox className="h-3 w-24" />
            <SkBox className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-[24px] border border-pn-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <SkBox className="h-9 w-full sm:w-[340px]" />
          <SkBox className="h-11 w-full sm:h-[34px] sm:w-[180px]" />
          <SkBox className="h-9 basis-full sm:basis-auto sm:min-w-[200px] sm:flex-1" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkBox className="h-8 w-24" />
          <SkBox className="h-8 w-24" />
          <SkBox className="h-8 w-24" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkBox key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <SkTable rows={8} cols={6} />
    </SkPageShell>
  );
}
