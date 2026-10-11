import { SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { PlatformProviderSkeleton } from '@/components/dashboard/platforms/PlatformSkeletons';

/**
 * Platform provider page — back link + header + link card (field, switch
 * row, action row) + routing summary. No stat grid: the page has none.
 * Mirrors page.tsx (max-w-[1280px], space-y-5). (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <PlatformProviderSkeleton />
    </SkPageShell>
  );
}
