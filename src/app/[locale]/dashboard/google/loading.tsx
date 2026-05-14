import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Google reviews hub (legacy entry component) — header + content
 * placeholder. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1200}>
      <SkPageHeader titleWidth="w-56" />
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <SkBox className="h-4 w-full" />
        <SkBox className="h-4 w-3/4" />
        <SkBox className="h-64 w-full" />
      </div>
    </SkPageShell>
  );
}
