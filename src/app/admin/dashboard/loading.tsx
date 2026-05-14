import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkStatGrid,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin superadmin dashboard — PageHeader + 4 KPI + business growth
 * chart + plan distribution + recently joined + needs attention.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-72" />

      <SkStatGrid count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-44" />
          <SkBox className="h-64 w-full" />
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <SkBox className="h-3 w-16" />
                <SkBox className="h-3 w-12" />
              </div>
              <SkBox className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkBox className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <SkBox className="h-4 w-32" />
                <SkBox className="h-3 w-24" />
              </div>
              <SkBox className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-44" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 border border-[#EDEDED] rounded-lg">
              <SkBox className="h-4 w-40" />
              <SkBox className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
