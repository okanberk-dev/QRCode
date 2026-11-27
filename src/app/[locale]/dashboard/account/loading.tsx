import { SkBox, SkTabStrip } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner account hub — mirrors `<SettingsLayout>` (CLAUDE.md §40.10): header
 * (title + description + one action, no eyebrow), vertical nav card at lg,
 * tab strip at md, none on phones (accordion), ≤920px content column with
 * the Profile tab (account summary + profile form). Also reused by the
 * client while it fetches on the non-hydrated path.
 */
export default function Loading() {
  return (
    // Same wrapper as <SettingsLayout> (no space-y: the header carries its own margin).
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3 min-w-0 flex-1">
          <SkBox className="h-8 w-36" />
          <SkBox className="h-4 w-80 max-w-full" />
        </div>
        <SkBox className="h-11 w-40 sm:h-9" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden md:block">
          <div className="hidden lg:block bz-card p-2 space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkBox key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="lg:hidden">
            <SkTabStrip count={5} />
          </div>
        </div>

        <div className="min-w-0 max-w-[920px] space-y-4">
          <div className="hidden md:block space-y-2">
            <SkBox className="h-6 w-28" />
            <SkBox className="h-4 w-64 max-w-full" />
          </div>
          <div className="bz-card p-5 flex items-center gap-4">
            <SkBox className="h-[52px] w-[52px] rounded-[20px]" />
            <div className="space-y-2 flex-1">
              <SkBox className="h-5 w-40" />
              <SkBox className="h-3 w-52 max-w-full" />
            </div>
          </div>
          <div className="bz-card p-5 space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkBox className="h-3 w-28" />
                <SkBox className="h-10 w-full" />
              </div>
            ))}
            <div className="flex justify-end">
              <SkBox className="h-9 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
