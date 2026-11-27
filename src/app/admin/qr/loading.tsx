import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin QR oversight — mirrors the page: header (view toggle + "Yeni QR")
 * + filter row + QR card grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-44" />
      <div className="flex flex-wrap gap-2">
        <SkBox className="h-11 w-[180px] sm:h-[34px]" />
        <SkBox className="h-11 w-[180px] sm:h-[34px]" />
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bz-card p-[18px]">
            <div className="mb-3.5 flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <SkBox className="h-4 w-32" />
                <SkBox className="h-3 w-20" />
              </div>
              <SkBox className="h-5 w-14" />
            </div>
            <SkBox className="h-[186px] w-full rounded-[20px]" />
            <SkBox className="mt-3 h-8 w-full rounded-[14px]" />
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <SkBox className="h-9 w-full" />
              <SkBox className="h-9 w-full" />
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-pn-line pt-3">
              <SkBox className="h-10 w-full" />
              <SkBox className="h-10 w-full" />
            </div>
            <SkBox className="mt-2 h-11 w-full sm:h-9" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
