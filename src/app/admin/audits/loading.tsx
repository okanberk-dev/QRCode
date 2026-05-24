import {
  SkBox,
  SkCard,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin audit hub — PageHeader + 3-card grid (templates / categories /
 * stats). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader titleWidth="w-44" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SkCard titleWidth="w-32" lines={2} />
        <SkCard titleWidth="w-32" lines={2} />
        <SkCard titleWidth="w-32" lines={2} />
      </div>
      <div className="bz-card p-5 space-y-3 bg-[#FAFAFA]">
        <SkBox className="h-4 w-32" />
        <SkBox className="h-3 w-full" />
        <SkBox className="h-3 w-3/4" />
      </div>
    </SkPageShell>
  );
}
