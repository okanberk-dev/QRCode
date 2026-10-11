import {
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin mail templates list — PageHeader + template card grid. The page
 * renders the same card grid skeleton while it fetches (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={4}>
      <SkPageHeader withActions titleWidth="w-44" />
      <SkCardGrid count={9} cols={3} />
    </SkPageShell>
  );
}
