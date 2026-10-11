import {
  SkBox,
  SkCard,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit template catalog — PageHeader + 3 count tiles + scope tabs /
 * filters + table (lg) or card list (< lg). Mirrors page.tsx
 * (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1600} space={4}>
      <SkPageHeader withActions titleWidth="w-56" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card space-y-2 p-3">
            <SkBox className="h-3 w-16" />
            <SkBox className="h-6 w-10" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-2">
          <SkBox className="h-8 w-44" />
          <SkBox className="h-8 w-28" />
          <SkBox className="h-8 w-14" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkBox className="h-10 w-40" />
          <SkBox className="h-10 w-36" />
        </div>
      </div>
      <div className="hidden lg:block">
        <SkTable rows={6} cols={6} />
      </div>
      <div className="space-y-3 lg:hidden">
        <SkCard titleWidth="w-48" lines={3} />
        <SkCard titleWidth="w-48" lines={3} />
        <SkCard titleWidth="w-48" lines={3} />
      </div>
    </SkPageShell>
  );
}
