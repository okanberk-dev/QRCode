import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin user permissions matrix — back link + PageHeader + permission
 * toggles grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-[#EDEDED] rounded-lg">
            <div className="space-y-1">
              <SkBox className="h-4 w-40" />
              <SkBox className="h-3 w-56" />
            </div>
            <SkBox className="h-6 w-10" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
