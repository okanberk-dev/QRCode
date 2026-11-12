import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { QrGridSkeleton } from './_components/QrGridSkeleton';

/**
 * Owner QR codes — header (title + description, one "Yeni QR oluştur"
 * action, no eyebrow), the single toolbar row (business scope · platform ·
 * count + view toggle) and the QR card grid. Mirrors QrClient
 * (max-w-1440, space-y-4, same grid via <QrGridSkeleton>). The create
 * wizard is a modal, so there is no inline form. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1 space-y-2.5">
          <SkBox className="mt-1 h-8 w-40" />
          <SkBox className="h-4 w-full max-w-[640px]" />
          <SkBox className="h-4 w-2/3 max-w-[420px] md:hidden" />
        </div>
        <SkBox className="h-11 w-44 sm:h-9" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SkBox className="h-11 w-60 sm:h-[38px]" />
        <SkBox className="ml-auto h-11 w-40 sm:h-9" />
      </div>

      <QrGridSkeleton count={6} />
    </SkPageShell>
  );
}
