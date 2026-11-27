import { SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { PlatformProviderSkeleton } from '@/components/dashboard/platforms/PlatformSkeletons';

/**
 * Platform provider page — back link + header + link card (card header,
 * field, switch row, action pills) + routing card. No stat grid: the page
 * has none. Mirrors page.tsx (max-w-[1280px], space-y-5). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <PlatformProviderSkeleton />
    </SkPageShell>
  );
}
