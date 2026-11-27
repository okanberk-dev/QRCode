import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Structural skeletons for the platform-links pages (CLAUDE.md §40.10).
 * Shared by the route `loading.tsx` files and by the client components while
 * they resolve the remembered business (no wrong-business flash).
 * Wrapper (max-w-[1280px] + paddings + space-y-5) comes from the caller.
 * The placeholders use the same `bz-card` boxes as the real cards, so the
 * Pano 10px card stack and the phone colours match the loaded page.
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

/** Card header: title + grey sub line (+ an optional action pill). */
function CardHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <SkBox className="h-6 w-48 max-w-full rounded-full" />
        <SkBox className="h-3 w-80 max-w-full rounded-full" />
      </div>
      {withAction && <SkBox className="h-11 w-full rounded-full sm:w-40" />}
    </div>
  );
}

/** Grey breakdown row: logo circle + name/reason + status pill + action circle. */
function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-[16px] bg-pn-canvas p-3 sm:gap-4">
      <SkBox className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkBox className="h-4 w-32 max-w-full rounded-full" />
        <SkBox className="h-3 w-64 max-w-full rounded-full" />
      </div>
      <SkBox className="hidden h-7 w-20 rounded-full sm:block" />
      <SkBox className="h-10 w-10 shrink-0 rounded-full" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bz-card p-5 sm:p-6" aria-hidden="true">
      <div className="flex items-start justify-between gap-2">
        <SkBox className="h-4 w-20 rounded-full" />
        <SkBox className="h-10 w-10 rounded-full" />
      </div>
      <SkBox className="mt-4 h-[30px] w-14 rounded-full sm:mt-5 sm:h-9" />
    </div>
  );
}

/**
 * Overview body: [view tabs] + business strip + 4 stat cards + review card +
 * routing card. `withTabs` — the "Bu işletme / Tüm işletmeler" tabs every
 * multi-business owner sees above the cards (without it the content jumped
 * down on load).
 */
export function PlatformsOverviewBodySkeleton({ withTabs = false }: { withTabs?: boolean } = {}) {
  return (
    <>
      {withTabs && (
        <div className="flex gap-2" aria-hidden="true">
          <SkBox className="h-10 w-28 rounded-full" />
          <SkBox className="h-10 w-40 rounded-full" />
        </div>
      )}
      <div className="space-y-2.5" aria-hidden="true">
        <div className="bz-card flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
          <SkBox className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkBox className="h-5 w-44 max-w-full rounded-full" />
            <SkBox className="h-3 w-28 rounded-full" />
          </div>
          <SkBox className="h-11 w-11 shrink-0 rounded-full sm:w-44" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
        <div className="bz-card p-5 sm:p-6">
          <CardHeaderSkeleton withAction />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>
        <div className="bz-card p-5 sm:p-6">
          <CardHeaderSkeleton />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <SkBox className="h-[76px] rounded-[24px]" />
            <SkBox className="h-[76px] rounded-[24px]" />
          </div>
        </div>
      </div>
    </>
  );
}

/** Overview: header (no back link — the business card links to settings). */
export function PlatformsOverviewSkeleton() {
  return (
    <>
      <HeaderSkeleton titleWidth="w-60" />
      {/* Route loading can't know the business count; the panel is built for
          franchises, so the tabs placeholder is shown by default. */}
      <PlatformsOverviewBodySkeleton withTabs />
    </>
  );
}

/** Provider page body: link card (header + field + switch row + buttons) + routing card. */
export function PlatformProviderBodySkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <div className="bz-card p-5 sm:p-6">
        <CardHeaderSkeleton />
        <div className="space-y-4">
          <div className="space-y-2">
            <SkBox className="h-4 w-40 rounded-full" />
            <SkBox className="h-3 w-full max-w-[520px] rounded-full" />
            <SkBox className="h-[46px] w-full rounded-full" />
          </div>
          <SkBox className="h-[60px] w-full rounded-[18px]" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SkBox className="h-11 w-full rounded-full sm:w-28" />
            <SkBox className="h-11 w-full rounded-full sm:w-32" />
            <SkBox className="h-11 w-full rounded-full sm:w-24" />
          </div>
        </div>
      </div>
      <div className="bz-card p-5 sm:p-6">
        <CardHeaderSkeleton />
        <SkBox className="h-4 w-72 max-w-full rounded-full" />
      </div>
    </div>
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
