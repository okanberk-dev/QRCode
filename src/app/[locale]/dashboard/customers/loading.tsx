import {
  SkBox,
  SkPageShell,
  SkTable,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner CRM customers — header + KPI cards + one-row toolbar + table.
 * Mirrors page.tsx (CLAUDE.md §40.10): no eyebrow, KPI grid 2 → 6 (2 + 3)
 * → 5 on xl, toolbar with the same container-query layout as
 * CustomersToolbar (tabs · search · period ≥ 68rem; search · two selects
 * ≥ 48rem; search, then the two selects in a row below that), table on
 * lg+ / cards below.
 */
export default function Loading() {
  return (
    <SkPageShell max={1600}>
      {/* PageHeader: title + description, CSV button below on mobile. */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <SkBox className="h-7 w-40 max-w-full" />
          <SkBox className="h-4 w-80 max-w-full" />
        </div>
        <SkBox className="h-11 w-28 shrink-0 sm:h-10" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`bz-card space-y-3 p-4 ${
              i === 0
                ? 'col-span-2 md:col-span-3 xl:col-span-1'
                : i === 1
                  ? 'md:col-span-3 xl:col-span-1'
                  : 'md:col-span-2 xl:col-span-1'
            }`}
          >
            <SkBox className="h-3 w-16" />
            <SkBox className="h-7 w-20" />
          </div>
        ))}
      </div>

      <div className="@container">
        <div className="flex flex-col gap-2.5 @min-[48rem]:flex-row @min-[48rem]:items-center @min-[48rem]:gap-2">
          <SkBox className="hidden h-[38px] w-[470px] shrink-0 @min-[68rem]:block" />
          <SkBox className="h-11 w-full lg:h-[38px] @min-[48rem]:flex-1" />
          <div className="grid grid-cols-2 gap-2 @min-[40rem]:flex @min-[48rem]:shrink-0">
            <SkBox className="h-11 w-full lg:h-[38px] @min-[40rem]:w-[190px] @min-[68rem]:hidden" />
            <SkBox className="h-11 w-full lg:h-[38px] @min-[40rem]:w-[150px]" />
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <SkTable rows={8} cols={6} />
      </div>
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card flex items-start gap-3 p-4">
            <SkBox className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkBox className="h-4 w-36 max-w-full" />
              <SkBox className="h-3 w-48 max-w-full" />
              <SkBox className="h-5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
