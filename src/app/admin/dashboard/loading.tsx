import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin superadmin dashboard — mirrors page.tsx (CLAUDE.md §40.10):
 * PageHeader (breadcrumb + title) → 4 KPI cards (2×2 on phones) → menu
 * publish card → business growth + plan distribution → recently joined +
 * needs attention. Same wrapper (max 1440, space-y-3) and grids.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={3}>
      <div className="mb-5 lg:mb-6">
        <SkBox className="mb-2.5 hidden h-4 w-36 sm:block" />
        <SkBox className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card p-5 sm:p-6">
            <div className="flex h-10 items-center justify-between gap-2">
              <SkBox className="h-3.5 w-20" />
              <SkBox className="h-10 w-10 rounded-full" />
            </div>
            <SkBox className="mt-3 h-8 w-20 sm:mt-4 sm:h-9" />
            <SkBox className="mt-3 h-6 w-28 max-w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Menu publish card */}
      <div className="bz-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <SkBox className="h-5 w-32" />
            <SkBox className="h-3.5 w-72 max-w-full" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <SkBox className="h-8 w-16" />
            <SkBox className="h-3.5 w-28" />
          </div>
        </div>
        <SkBox className="mt-5 h-2.5 w-full rounded-full" />
      </div>

      <div className="grid gap-2.5 lg:grid-cols-[2fr_1fr]">
        <div className="bz-card space-y-3 p-5 sm:p-6">
          <SkBox className="h-5 w-40" />
          <SkBox className="h-3.5 w-52" />
          <SkBox className="h-[168px] w-full" />
        </div>
        <div className="bz-card space-y-2 p-5 sm:p-6">
          <SkBox className="h-5 w-32" />
          <SkBox className="mb-2 h-3.5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBox key={i} className="h-[60px] w-full rounded-[16px]" />
          ))}
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="bz-card space-y-2 p-5 sm:p-6">
            <div className="mb-2 flex items-center justify-between">
              <SkBox className="h-5 w-44" />
              <SkBox className="h-11 w-11 rounded-full" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkBox key={i} className="h-[60px] w-full rounded-[16px]" />
            ))}
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
