import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin mail templates list — PageHeader + locale toggle + template
 * card grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="flex items-center gap-2">
        <SkBox className="h-3 w-16" />
        <SkBox className="h-8 w-32" />
      </div>
      <SkCardGrid count={9} cols={3} />
    </SkPageShell>
  );
}
