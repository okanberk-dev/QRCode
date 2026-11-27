import { SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { PlatformsOverviewSkeleton } from '@/components/dashboard/platforms/PlatformSkeletons';

/**
 * Owner platform links — header + view tabs + business strip + 4 stat
 * cards + review-platform card (grey breakdown rows) + routing card.
 * Mirrors page.tsx (max-w-[1280px], space-y-5; the cards stack 10px apart
 * inside). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <PlatformsOverviewSkeleton />
    </SkPageShell>
  );
}
