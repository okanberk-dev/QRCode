import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin legal documents (KVKK / Terms / Cookie) list — PageHeader +
 * card grid by document type. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-56" />
      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-9 w-40" />
        <SkBox className="h-9 w-28" />
      </div>
      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
