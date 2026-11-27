import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit logs — PageHeader (refresh + CSV) + retention notice +
 * filter card + log table. Mirrors page.tsx (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-56" />
      <SkBox className="h-14 w-full rounded-[20px]" />
      <div className="bz-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SkBox className="h-9 w-64 max-w-full rounded-[20px]" />
          <SkBox className="h-10 w-40" />
          <SkBox className="h-10 w-full flex-1 sm:w-auto sm:min-w-[200px]" />
        </div>
      </div>
      <SkTable rows={8} cols={6} />
    </SkPageShell>
  );
}
