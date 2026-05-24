import {
  SkBox,
  SkForm,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Audit edit (template editor) — back link + PageHeader + meta form
 * + question list. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />

      <SkForm rows={4} />

      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 p-3 border border-[#EDEDED] rounded-lg">
            <div className="flex items-center justify-between">
              <SkBox className="h-4 w-2/3" />
              <SkBox className="h-4 w-16" />
            </div>
            <SkBox className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
