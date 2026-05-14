import {
  SkBox,
  SkForm,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Mail template editor — back link + PageHeader + field editor +
 * revision history side rail. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <SkForm rows={8} />
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2 border border-[#EDEDED] rounded-lg">
              <SkBox className="h-6 w-16" />
              <div className="flex-1 space-y-1">
                <SkBox className="h-3 w-32" />
                <SkBox className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
