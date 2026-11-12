import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner restaurant detail — back link + PageHeader (name, meta, status badge,
 * "Ayarlar" button) + three link cards (Yorumlar / QR kodlar / Menü with
 * their counts) + customer page row + platform links strip. Spacing mirrors
 * page.tsx: header mb-5, then 12px between the blocks. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={3}>
      {/* Back link: 44px tap target below sm, 32px above (+ mb-3 → space-y-3). */}
      <div className="flex h-11 items-center sm:h-8">
        <SkBox className="h-3 w-32" />
      </div>

      {/* PageHeader (no eyebrow) + its mb-5 */}
      <div className="flex flex-col justify-between gap-3 pb-2 md:flex-row md:items-end">
        <div className="min-w-0 flex-1 space-y-2.5">
          <SkBox className="h-8 w-72 max-w-full" />
          <SkBox className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <SkBox className="h-6 w-16 rounded-full" />
          <SkBox className="h-11 w-28 sm:h-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card flex min-h-[64px] items-center gap-3 p-4 sm:p-5">
            <SkBox className="h-9 w-9 shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkBox className="h-4 w-20" />
              <SkBox className="h-3 w-32 max-w-full" />
              {/* The description wraps to a 2nd line between sm and xl. */}
              <SkBox className="hidden h-3 w-20 sm:block xl:hidden" />
            </div>
            <SkBox className="h-6 w-8 shrink-0" />
          </div>
        ))}
      </div>

      {/* Customer page row */}
      <div className="bz-card-soft flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SkBox className="h-7 w-7 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkBox className="h-3 w-24" />
            <SkBox className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkBox className="h-3 w-28" />
          <SkBox className="h-11 w-11 sm:h-8 sm:w-8" />
          <SkBox className="h-11 w-11 sm:h-8 sm:w-8" />
        </div>
      </div>

      {/* Platform links strip */}
      <SkBox className="h-14 w-full rounded-xl" />
    </SkPageShell>
  );
}
