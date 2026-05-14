import {
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner announcements (read-only system updates) — header + card
 * grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkPageHeader titleWidth="w-40" />
      <SkCardGrid count={4} cols={2} />
    </SkPageShell>
  );
}
