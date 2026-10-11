import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Audit template detail — PageHeader (back + publish) + meta form card +
 * question builder card. Mirrors AdminTemplateDetailClient
 * (CLAUDE.md §40.10).
 */
function FieldBox() {
  return (
    <div className="space-y-1.5">
      <SkBox className="h-3 w-20" />
      <SkBox className="h-10 w-full" />
    </div>
  );
}

export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-72" />
      <div className="bz-card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SkBox className="h-5 w-20 rounded-full" />
          <SkBox className="h-5 w-16 rounded-full" />
          <SkBox className="h-3 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldBox />
          <FieldBox />
        </div>
        <div className="space-y-1.5">
          <SkBox className="h-3 w-20" />
          <SkBox className="h-20 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FieldBox />
          <FieldBox />
          <FieldBox />
        </div>
        <FieldBox />
      </div>
      <div className="bz-card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <SkBox className="h-5 w-28" />
          <SkBox className="h-9 w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card-soft flex items-start gap-3 p-3">
            <SkBox className="h-3 w-5" />
            <div className="flex-1 space-y-2">
              <SkBox className="h-4 w-24 rounded-full" />
              <SkBox className="h-4 w-3/4" />
              <SkBox className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
