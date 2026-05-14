import {
  SkBox,
  SkCard,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner getting-started guide — PageHeader + step cards.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkPageHeader titleWidth="w-56" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card p-5 flex gap-4">
            <SkBox className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <SkBox className="h-5 w-48" />
              <SkBox className="h-4 w-full" />
              <SkBox className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>

      <SkCard titleWidth="w-44" lines={3} />
    </SkPageShell>
  );
}
