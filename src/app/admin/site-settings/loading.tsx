import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin site settings — PageHeader + SEO card (language toggle + 4 fields) +
 * brand card (logo / favicon uploaders) + profile-link card (2-col URLs).
 * Mirrors page.tsx, which also renders this while the settings load
 * (CLAUDE.md §40.10).
 */
function CardHead({ withToggle = false }: { withToggle?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2">
        <SkBox className="h-6 w-44" />
        <SkBox className="h-3 w-72 max-w-full" />
      </div>
      {withToggle && <SkBox className="h-9 w-32 rounded-[20px]" />}
    </div>
  );
}

function FieldRow({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-2">
      <SkBox className="h-3 w-36" />
      <SkBox className={`${tall ? 'h-24' : 'h-10'} w-full`} />
    </div>
  );
}

export default function Loading() {
  return (
    <SkPageShell max={1280} space={5}>
      <SkPageHeader withActions titleWidth="w-48" />
      <div className="bz-card p-6 sm:p-8">
        <CardHead withToggle />
        <div className="space-y-5">
          <FieldRow />
          <FieldRow />
          <FieldRow tall />
          <FieldRow tall />
        </div>
      </div>
      <div className="bz-card p-6 sm:p-8">
        <CardHead />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkBox className="aspect-square w-full max-w-[200px] rounded-[20px]" />
          <SkBox className="aspect-square w-full max-w-[128px] rounded-[20px]" />
        </div>
      </div>
      <div className="bz-card p-6 sm:p-8">
        <CardHead />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FieldRow />
          <FieldRow />
          <FieldRow />
          <FieldRow />
        </div>
      </div>
    </SkPageShell>
  );
}
