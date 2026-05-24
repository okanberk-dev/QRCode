import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Campaign approval detail — back link + PageHeader + content
 * preview + decision form. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-72" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-44" />
          <SkBox className="h-4 w-full" />
          <SkBox className="h-4 w-full" />
          <SkBox className="h-4 w-2/3" />
          <SkBox className="h-32 w-full" />
        </div>
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-5 w-32" />
          <SkBox className="h-9 w-full" />
          <SkBox className="h-9 w-full" />
          <SkBox className="h-3 w-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
