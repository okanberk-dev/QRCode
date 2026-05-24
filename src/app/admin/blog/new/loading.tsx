import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin blog post create — back link + PageHeader + editor + meta side
 * rail. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div className="bz-card p-5 space-y-3">
          <SkBox className="h-10 w-full" />
          <SkBox className="h-10 w-full" />
          <SkBox className="h-72 w-full" />
        </div>
        <div className="space-y-4">
          <div className="bz-card p-5 space-y-3">
            <SkBox className="h-4 w-32" />
            <SkBox className="h-10 w-full" />
            <SkBox className="h-10 w-full" />
          </div>
          <div className="bz-card p-5 space-y-3">
            <SkBox className="h-4 w-32" />
            <SkBox className="h-32 w-full" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
