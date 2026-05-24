import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin billing overview — PageHeader + KPI + invoices/subscriptions
 * table. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-56" />
      <SkStatGrid count={4} />
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border border-[#EDEDED] rounded-lg space-y-2">
              <SkBox className="h-3 w-16" />
              <SkBox className="h-7 w-24" />
              <SkBox className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
      <SkTable rows={6} cols={6} />
    </SkPageShell>
  );
}
