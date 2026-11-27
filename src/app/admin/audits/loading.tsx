import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit hub — PageHeader + 3 section cards (templates / categories /
 * stats) + quick-start hint. Mirrors page.tsx (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={5}>
      <SkPageHeader titleWidth="w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <SkBox className="h-10 w-10 rounded-[20px]" />
              <SkBox className="h-3 w-24" />
            </div>
            <SkBox className="h-5 w-28" />
            <SkBox className="h-3 w-full" />
            <SkBox className="h-3 w-3/4" />
            <SkBox className="mt-2 h-3 w-10" />
          </div>
        ))}
      </div>
      <div className="bz-card-soft space-y-2 p-4">
        <SkBox className="h-3 w-full" />
        <SkBox className="h-3 w-2/3" />
      </div>
    </SkPageShell>
  );
}
