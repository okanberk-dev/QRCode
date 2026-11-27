import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

/**
 * QR card grid placeholder — same grid, gap and card anatomy as the real
 * <QRCard>: title + "…" menu button, 186px preview, platform/date row and
 * the PNG / PDF buttons (44px tall below 640px, like the real buttons).
 * Used by the route `loading.tsx` and by QrClient while a business's QR
 * codes load, so both look like one state (CLAUDE.md §40.10).
 */
export function QrGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bz-card p-[18px]">
          <div className="mb-3.5 flex items-start justify-between gap-2">
            <SkBox className="h-5 w-40" />
            <SkBox className="-mr-1.5 -mt-1.5 h-11 w-11 shrink-0 sm:h-8 sm:w-8" />
          </div>
          <SkBox className="h-[186px] w-full rounded-[20px]" />
          <SkBox className="mt-3 h-[34px] w-full rounded-[14px]" />
          <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-pn-line pt-3">
            <SkBox className="h-11 w-full sm:h-10" />
            <SkBox className="h-11 w-full sm:h-10" />
          </div>
        </div>
      ))}
    </div>
  );
}
