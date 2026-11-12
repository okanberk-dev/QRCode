import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Structural skeletons for the platform-links pages (CLAUDE.md §40.10).
 * Shared by the route `loading.tsx` files and by the client components while
 * they resolve the remembered business (no wrong-business flash).
 * Wrapper (max-w-[1280px] + paddings + space-y-5) comes from the caller.
 */

export function PlatformBackLinkSkeleton() {
  // Same box as the real back link (44px tap target below sm, 32px above).
  return (
    <div className="mb-3 flex h-11 items-center sm:h-8">
      <SkBox className="h-3 w-40" />
    </div>
  );
}

/** PageHeader without an eyebrow: title + one description line (mb-5). */
function HeaderSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <div className="mb-5 space-y-3">
      <SkBox className={`h-8 ${titleWidth} max-w-full`} />
      <SkBox className="h-4 w-80 max-w-full" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <SkBox className="h-10 w-10 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkBox className="h-4 w-40 max-w-full" />
        <SkBox className="h-3 w-72 max-w-full" />
      </div>
      <SkBox className="hidden h-9 w-24 rounded-full sm:block" />
    </div>
  );
}

/** Overview body: context card + review list + routing card. */
export function PlatformsOverviewBodySkeleton() {
  return (
    <>
      <SkBox className="h-[84px] w-full rounded-2xl" />
      <div className="space-y-3">
        <SkBox className="h-5 w-40" />
        <SkBox className="h-3 w-80 max-w-full" />
        <div className="bz-card divide-y divide-[#EDEDED] overflow-hidden p-0" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      </div>
      <SkBox className="h-[220px] w-full rounded-2xl" />
    </>
  );
}

/** Overview: header (no back link — the business card links to settings). */
export function PlatformsOverviewSkeleton() {
  return (
    <>
      <HeaderSkeleton titleWidth="w-60" />
      <PlatformsOverviewBodySkeleton />
    </>
  );
}

/** Provider page body: link card (label + input + switch row + buttons) + routing summary. */
export function PlatformProviderBodySkeleton() {
  return (
    <>
      <div className="bz-card space-y-4 p-5 sm:p-6" aria-hidden="true">
        <div className="space-y-2">
          <SkBox className="h-5 w-24" />
          <SkBox className="h-3 w-64 max-w-full" />
        </div>
        <div className="space-y-2">
          <SkBox className="h-3 w-40" />
          <SkBox className="h-3 w-full max-w-[520px]" />
          <SkBox className="h-11 w-full rounded-xl" />
        </div>
        <SkBox className="h-11 w-full max-w-[360px] rounded-xl" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SkBox className="h-11 w-full rounded-full sm:h-9 sm:w-24" />
          <SkBox className="h-11 w-full rounded-full sm:h-9 sm:w-32" />
          <SkBox className="h-11 w-full rounded-full sm:h-9 sm:w-28" />
        </div>
      </div>
      <SkBox className="h-[96px] w-full rounded-2xl" />
    </>
  );
}

export function PlatformProviderSkeleton() {
  return (
    <>
      <div>
        <PlatformBackLinkSkeleton />
        <HeaderSkeleton titleWidth="w-48" />
      </div>
      <PlatformProviderBodySkeleton />
    </>
  );
}
