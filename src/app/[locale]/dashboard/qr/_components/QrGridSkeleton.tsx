import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * QR card grid placeholder — same grid, gap and card anatomy as the real
 * <QRCard> list (title + badge, 186px preview, platform row, two stats, two
 * download buttons, utility row). Used by the route `loading.tsx` and by
 * QrClient while a business's QR codes load, so both look like one state
 * (CLAUDE.md §40.10).
 */
export function QrGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bz-card p-[18px]">
          <div className="mb-3.5 flex items-start justify-between gap-2">
            <SkBox className="h-5 w-40" />
            <SkBox className="h-5 w-12" />
          </div>
          <SkBox className="h-[186px] w-full rounded-xl" />
          <SkBox className="mt-3 h-8 w-full rounded-lg" />
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <SkBox className="h-3 w-12" />
              <SkBox className="h-4 w-20" />
            </div>
            <div className="space-y-1.5">
              <SkBox className="h-3 w-16" />
              <SkBox className="h-4 w-14" />
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-[#EDEDED] pt-3">
            <SkBox className="h-10 w-full" />
            <SkBox className="h-10 w-full" />
          </div>
          <SkBox className="mt-2 h-11 w-full sm:h-9" />
        </div>
      ))}
    </div>
  );
}
