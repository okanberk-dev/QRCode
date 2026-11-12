import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner announcements (read-only system updates) — header + a single-column
 * list of announcement cards, like page.tsx (it is not a grid). The page has
 * no `space-y` wrapper; PageHeader's own bottom margin spaces the list.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={3}>
      {/* PageHeader without an eyebrow: title + description. */}
      <div className="space-y-2.5">
        <SkBox className="h-8 w-56 max-w-full" />
        <SkBox className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-col gap-2.5 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card space-y-2.5 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <SkBox className="h-5 w-16 rounded-full" />
              <SkBox className="h-3 w-32" />
            </div>
            <SkBox className="h-5 w-64 max-w-full" />
            <SkBox className="h-4 w-full" />
            <SkBox className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
