import {
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin team members — PageHeader (with invite action) + member table.
 * TeamClient renders the same table skeleton while it fetches
 * (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-32" />
      <SkTable rows={6} cols={4} />
    </SkPageShell>
  );
}
