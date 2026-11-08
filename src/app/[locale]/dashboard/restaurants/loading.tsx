import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner businesses (franchise table) — header + 4 stats + filter strip +
 * table. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-44" />
      <SkStatGrid count={4} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SkBox className="h-9 w-72" />
        <SkBox className="h-9 w-full lg:w-72" />
      </div>
      <SkTable rows={6} cols={6} />
    </SkPageShell>
  );
}
