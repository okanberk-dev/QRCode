import { SkBox, SkTabStrip } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner restaurant settings — back link + header (eyebrow, name, URL +
 * status, "QR oluştur" + "Diğer") + settings grid (CLAUDE.md §40.10). The
 * grid mirrors `<SettingsLayout>`: vertical nav card at lg, tab strip at md,
 * no nav on phones (accordion), and a ≤920px content column — so the
 * skeleton → page hand-off doesn't jump. Also reused by the client while it
 * fetches on the impersonation / team-member path.
 */
export default function Loading() {
  return (
    // Same wrapper as <SettingsLayout> (no space-y: the header carries its own margin).
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      <div className="mb-5 sm:mb-6">
        {/* Back link: 44px tap target below sm, 32px above. */}
        <div className="mb-2 flex h-11 items-center sm:h-8">
          <SkBox className="h-3 w-36" />
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-8 w-64 max-w-full" />
            <SkBox className="h-4 w-48 max-w-full" />
          </div>
          <div className="flex gap-2">
            <SkBox className="h-11 w-32 sm:h-9" />
            <SkBox className="h-11 w-11 sm:h-9 sm:w-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden md:block">
          <div className="hidden lg:block bz-card p-2 space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkBox key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="lg:hidden">
            <SkTabStrip count={6} />
          </div>
        </div>

        <div className="min-w-0 max-w-[920px] space-y-4">
          <div className="hidden md:block space-y-2">
            <SkBox className="h-6 w-36" />
            <SkBox className="h-4 w-72 max-w-full" />
          </div>
          <div className="bz-card p-5 space-y-5">
            <SkBox className="h-5 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkBox className="h-3 w-28" />
                <SkBox className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
