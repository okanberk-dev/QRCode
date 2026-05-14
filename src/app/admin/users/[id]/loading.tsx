import {
  SkBox,
  SkForm,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin internal user detail — back link + PageHeader + edit form.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1100}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />
      <SkForm rows={5} />
    </SkPageShell>
  );
}
