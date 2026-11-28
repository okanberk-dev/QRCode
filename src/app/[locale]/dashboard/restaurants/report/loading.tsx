import { SkBox, SkPageHeader, SkPageShell, SkTable } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Branch report — header + period pills + comparison table. Without this
 * file the route fell back to the businesses list skeleton (4 stat cards),
 * which is not what loads. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={2.5}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="flex gap-2">
        <SkBox className="h-11 w-16 rounded-full sm:h-10" />
        <SkBox className="h-11 w-20 rounded-full sm:h-10" />
        <SkBox className="h-11 w-20 rounded-full sm:h-10" />
      </div>
      <SkTable rows={3} cols={6} />
    </SkPageShell>
  );
}
