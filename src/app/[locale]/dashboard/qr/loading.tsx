import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner QR wizard + history list — header + form rows + 3-col QR card
 * grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader withActions titleWidth="w-32" />

      {/* Wizard form */}
      <div className="bz-card p-5 space-y-4">
        <SkBox className="h-5 w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkBox className="h-10 w-full" />
          <SkBox className="h-10 w-full" />
          <SkBox className="h-10 w-full" />
          <SkBox className="h-10 w-full" />
        </div>
        <div className="flex justify-end">
          <SkBox className="h-9 w-32" />
        </div>
      </div>

      {/* History header */}
      <div className="flex items-center justify-between">
        <SkBox className="h-5 w-40" />
        <SkBox className="h-8 w-24" />
      </div>

      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
