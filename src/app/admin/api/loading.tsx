import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin API + webhooks management — PageHeader + tab strip + content
 * area. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="flex gap-2 border-b border-[#EDEDED] pb-3">
        <SkBox className="h-8 w-24" />
        <SkBox className="h-8 w-28" />
        <SkBox className="h-8 w-32" />
      </div>
      <SkTable rows={6} cols={4} />
    </SkPageShell>
  );
}
