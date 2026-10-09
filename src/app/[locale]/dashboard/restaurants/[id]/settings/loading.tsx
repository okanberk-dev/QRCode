import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTabStrip,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner restaurant settings — back link + PageHeader + quick action
 * chips + settings grid (CLAUDE.md §40.10). The grid mirrors
 * `<SettingsLayout>`: vertical nav card at lg, tab strip at md, no nav on
 * phones (accordion), and a ≤920px content column — so the skeleton → page
 * hand-off doesn't jump. Also reused by the client while it fetches on the
 * impersonation / team-member path.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-40" />
      <SkPageHeader withActions titleWidth="w-72" />

      <div className="flex flex-wrap gap-2">
        <SkBox className="h-7 w-32" />
        <SkBox className="h-7 w-28" />
        <SkBox className="h-7 w-24" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden md:block">
          <div className="hidden lg:block bz-card p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkBox key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="lg:hidden">
            <SkTabStrip count={6} />
          </div>
        </div>

        <div className="min-w-0 max-w-[920px] bz-card p-5 space-y-5">
          <div className="space-y-2">
            <SkBox className="h-3 w-20" />
            <SkBox className="h-6 w-44" />
            <SkBox className="h-4 w-80 max-w-full" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkBox className="h-3 w-28" />
              <SkBox className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
