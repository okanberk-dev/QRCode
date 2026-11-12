import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * "Yeni İşletme" creation page — back link + header (title + one line) +
 * WizardSteps strip + first step's fields + footer row. Narrow form tier
 * (max 920) like the page wrapper. (CLAUDE.md §40.10)
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
        <SkBox className="h-8 w-56" />
        <SkBox className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-5">
        <SkBox className="h-14 w-full rounded-2xl sm:h-[52px]" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkBox className="h-3.5 w-24" />
              <SkBox className="h-11 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <SkBox className="h-3.5 w-16" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkBox key={i} className="h-[66px] w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
