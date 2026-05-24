import {
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner menu hub (restaurant picker) — PageHeader + restaurant card
 * grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader titleWidth="w-44" />
      <SkCardGrid count={4} cols={2} />
    </SkPageShell>
  );
}
