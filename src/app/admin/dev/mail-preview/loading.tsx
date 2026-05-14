import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Dev mail preview — PageHeader + template card grid (preview + test
 * mail buttons). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader withActions titleWidth="w-44" />
      <SkCardGrid count={9} cols={3} />
    </SkPageShell>
  );
}
