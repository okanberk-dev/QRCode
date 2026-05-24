import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTabStrip,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner restaurant settings — back link + PageHeader + quick action
 * chips + 6-tab strip + section panel (form rows). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-40" />
      <SkPageHeader withActions titleWidth="w-72" />

      <div className="flex flex-wrap gap-2">
        <SkBox className="h-7 w-32" />
        <SkBox className="h-7 w-28" />
        <SkBox className="h-7 w-24" />
      </div>

      <SkTabStrip count={6} />

      <div className="bz-card p-5 space-y-5">
        <div className="space-y-2">
          <SkBox className="h-3 w-20" />
          <SkBox className="h-6 w-44" />
          <SkBox className="h-4 w-80 max-w-full" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-10 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <SkBox className="h-9 w-24" />
          <SkBox className="h-9 w-28" />
        </div>
      </div>
    </SkPageShell>
  );
}
