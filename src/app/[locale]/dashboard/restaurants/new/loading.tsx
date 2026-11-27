import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { WizardFooterSkeleton, WizardStepsSkeleton } from '@/components/ui/WizardSteps';

/**
 * "Yeni İşletme" creation page — back link + header (title + one line) +
 * the wizard stepper + the first step's two white cards (details, sector
 * rows) + the action bar. Narrow form tier (max 920) like the page wrapper.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={920} space={3}>
      {/* Back link: 44px tap target below sm, 32px above. */}
      <div className="flex h-11 items-center sm:h-8">
        <SkBox className="h-4 w-32" />
      </div>
      {/* PageHeader (no eyebrow) + its mb-5 */}
      <div className="space-y-2.5 pb-2">
        <SkBox className="hidden h-5 w-48 sm:block" />
        <SkBox className="h-8 w-56" />
        <SkBox className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-4 sm:space-y-5">
        <WizardStepsSkeleton count={3} />
        <div className="space-y-2.5">
          <div className="bz-card space-y-5 p-5 sm:p-7">
            <div className="space-y-2">
              <SkBox className="h-5 w-40" />
              <SkBox className="h-4 w-72 max-w-full" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkBox className="h-4 w-24" />
                <SkBox className="h-[46px] w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="bz-card space-y-5 p-5 sm:p-7">
            <div className="space-y-2">
              <SkBox className="h-5 w-24" />
              <SkBox className="h-4 w-80 max-w-full" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkBox key={i} className="h-16 w-full rounded-[16px]" />
              ))}
            </div>
          </div>
        </div>
        <WizardFooterSkeleton />
      </div>
    </SkPageShell>
  );
}
