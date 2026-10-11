import { SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { PlatformsOverviewSkeleton } from '@/components/dashboard/platforms/PlatformSkeletons';

/**
 * Owner platform links — back link + header + business context card +
 * review-platform list + routing card. Mirrors page.tsx (max-w-[1280px],
 * space-y-5). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <PlatformsOverviewSkeleton />
    </SkPageShell>
  );
}
