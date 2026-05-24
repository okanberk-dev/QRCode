import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Legal document variables (placeholder token registry) — PageHeader
 * + table. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />
      <SkTable rows={6} cols={4} />
    </SkPageShell>
  );
}
