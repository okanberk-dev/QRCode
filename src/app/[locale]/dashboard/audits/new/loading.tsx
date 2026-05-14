import {
  SkBox,
  SkForm,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Audit wizard (create / fork) — back link + PageHeader + step strip
 * + form rows. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader titleWidth="w-56" />

      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBox key={i} className="h-2 flex-1" />
        ))}
      </div>

      <SkForm rows={6} />
    </SkPageShell>
  );
}
