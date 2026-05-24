import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Audit global catalog (browse + fork templates) — header + sector
 * tabs + template card grid. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader titleWidth="w-56" />

      <div className="flex flex-wrap gap-2 border-b border-[#EDEDED] pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkBox key={i} className="h-8 w-24" />
        ))}
      </div>

      <SkCardGrid count={9} cols={3} />
    </SkPageShell>
  );
}
