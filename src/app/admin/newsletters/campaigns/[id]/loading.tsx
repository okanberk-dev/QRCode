import {
  SkBox,
  SkForm,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Newsletter campaign edit — back link + PageHeader + compose form +
 * post picker. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-72" />
      <SkForm rows={3} />
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 border border-[#EDEDED] rounded-lg">
            <SkBox className="h-5 w-5" />
            <div className="flex-1 space-y-1">
              <SkBox className="h-4 w-1/2" />
              <SkBox className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
