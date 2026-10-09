import {
  SkBox,
  SkPageHeader,
  SkPageShell,
  SkTabStrip,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner account hub — mirrors `<SettingsLayout>` (CLAUDE.md §40.10): vertical
 * nav card at lg, tab strip at md, none on phones (accordion), ≤920px form
 * column, and the plan/invoice rail as a third column only from 2xl — below
 * that it stacks under the content. Also reused by the client while it
 * fetches on the non-hydrated path.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-32" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 xl:gap-6 2xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <div className="hidden md:block lg:row-span-2 2xl:row-span-1">
          <div className="hidden lg:block bz-card p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkBox key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="lg:hidden">
            <SkTabStrip count={5} />
          </div>
        </div>

        <div className="min-w-0 max-w-[920px] bz-card p-5 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkBox className="h-3 w-32" />
              <SkBox className="h-10 w-full" />
            </div>
          ))}
          <div className="flex justify-end">
            <SkBox className="h-9 w-28" />
          </div>
        </div>

        <div className="space-y-3 md:grid md:grid-cols-2 md:items-start md:gap-3 md:space-y-0 lg:col-start-2 lg:max-w-[920px] lg:grid-cols-1 xl:grid-cols-2 2xl:col-start-3 2xl:row-start-1 2xl:block 2xl:max-w-none 2xl:space-y-3">
          <div className="bz-card p-5 space-y-3">
            <SkBox className="h-3 w-20" />
            <SkBox className="h-6 w-32" />
            <SkBox className="h-4 w-full" />
            <SkBox className="h-4 w-3/4" />
          </div>
          <div className="bz-card p-5 space-y-3">
            <SkBox className="h-3 w-24" />
            <SkBox className="h-9 w-full" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
