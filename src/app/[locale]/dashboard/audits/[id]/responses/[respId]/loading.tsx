import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Single audit response detail — back link + PageHeader + meta strip
 * + answer rows. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkBox className="h-3 w-40" />
      <SkPageHeader titleWidth="w-72" />

      <div className="bz-card p-5 space-y-3">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <SkBox className="h-3 w-16" />
            <SkBox className="h-5 w-32" />
          </div>
          <div className="space-y-1">
            <SkBox className="h-3 w-16" />
            <SkBox className="h-5 w-28" />
          </div>
          <div className="space-y-1">
            <SkBox className="h-3 w-16" />
            <SkBox className="h-5 w-24" />
          </div>
        </div>
      </div>

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 p-3 border border-[#EDEDED] rounded-lg">
            <SkBox className="h-4 w-3/4" />
            <SkBox className="h-3 w-1/2" />
            <SkBox className="h-4 w-full" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
