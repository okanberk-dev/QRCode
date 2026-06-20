import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * "Yeni İşletme" creation page — back link + heading + step strip + form
 * card. Narrow form tier (max 920) to match the page wrapper. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={920}>
      <SkBox className="h-4 w-32" />
      <div className="space-y-2">
        <SkBox className="h-3 w-24" />
        <SkBox className="h-8 w-56" />
        <SkBox className="h-3 w-72" />
      </div>
      <SkBox className="h-12 w-full rounded-2xl" />
      <SkBox className="h-[420px] w-full rounded-2xl" />
    </SkPageShell>
  );
}
