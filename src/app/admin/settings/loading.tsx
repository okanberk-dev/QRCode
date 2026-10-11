import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin workspace settings — PageHeader + 220px section nav + content card
 * (mirrors SettingsClient; CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader titleWidth="w-56" />
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-1 rounded-2xl border border-[#EDEDED] bg-white p-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkBox key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="space-y-4 rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
          <SkBox className="h-6 w-32" />
          <SkBox className="h-4 w-80 max-w-full" />
          <SkBox className="h-9 w-28" />
          <SkBox className="h-16 w-full" />
        </div>
      </div>
    </SkPageShell>
  );
}
