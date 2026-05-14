import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin notification preferences — PageHeader + toggle list.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkPageHeader titleWidth="w-44" />
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-[#EDEDED] rounded-lg">
            <div className="space-y-1">
              <SkBox className="h-4 w-44" />
              <SkBox className="h-3 w-64" />
            </div>
            <SkBox className="h-6 w-10" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
