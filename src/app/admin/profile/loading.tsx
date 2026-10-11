import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin profile — PageHeader (eyebrow + title) + 260px account card + four
 * form cards (recovery e-mail, account, language, password). Mirrors
 * page.tsx, which also renders this while /api/admin/me loads
 * (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={5}>
      <div className="space-y-3">
        <SkBox className="h-3 w-16" />
        <SkBox className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr] lg:gap-7">
        <div className="bz-card self-start space-y-4 p-5 sm:p-6">
          <SkBox className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <SkBox className="h-3 w-14" />
            <SkBox className="h-5 w-28" />
            <SkBox className="h-3 w-24" />
          </div>
          <SkBox className="h-20 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          {[3, 1, 2, 3].map((rows, i) => (
            <div key={i} className="bz-card space-y-3 p-5 sm:p-7">
              <div className="flex items-center gap-2.5">
                <SkBox className="h-8 w-8 rounded-lg" />
                <SkBox className="h-5 w-40" />
              </div>
              {Array.from({ length: rows }).map((_, r) => (
                <SkBox key={r} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkPageShell>
  );
}
