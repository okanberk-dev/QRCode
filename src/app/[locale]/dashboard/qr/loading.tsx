import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { QrGridSkeleton } from './_components/QrGridSkeleton';

/**
 * Owner QR codes — header (title + two/three-line description, one
 * "Yeni QR oluştur" action, no eyebrow), the toolbar row and the QR card
 * grid. Heights follow the real page: title 26px → 33px, description 2
 * lines (3 on phones), action 44px on phones / 40px above, toolbar row 50px
 * on phones (44px tabs + strip padding) / 38px above. The toolbar is one
 * row; it only wraps to a second row on phones for owners with several
 * businesses whose QR codes use 2+ platforms. The create wizard is a modal,
 * so there is no inline form. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1">
          <SkBox className="mt-1 h-[26px] w-40 lg:h-[33px]" />
          <div className="mt-2 flex max-w-2xl flex-col gap-1.5 py-[3px]">
            <SkBox className="h-[14px] w-full" />
            <SkBox className="h-[14px] w-3/4" />
            <SkBox className="h-[14px] w-1/2 md:hidden" />
          </div>
        </div>
        <SkBox className="h-11 w-[146px] shrink-0 sm:h-10" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-[50px] w-[232px] sm:h-[38px]" />
        <SkBox className="ml-auto h-[50px] w-24 sm:h-9 sm:w-[152px]" />
      </div>

      <QrGridSkeleton count={6} />
    </SkPageShell>
  );
}
