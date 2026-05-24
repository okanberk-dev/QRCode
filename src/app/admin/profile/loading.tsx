import {
  SkBox,
  SkForm,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin profile self-edit — PageHeader + form. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkPageHeader titleWidth="w-44" />
      <SkForm rows={5} />
      <div className="bz-card p-5 space-y-3">
        <SkBox className="h-5 w-44" />
        <SkBox className="h-10 w-full" />
        <SkBox className="h-10 w-full" />
        <div className="flex justify-end">
          <SkBox className="h-9 w-32" />
        </div>
      </div>
    </SkPageShell>
  );
}
