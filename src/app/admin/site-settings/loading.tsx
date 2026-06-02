import {
  SkForm,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Admin site settings (logo / hero / about) — PageHeader + multi-card
 * form sections. (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1280}>
      <SkPageHeader withActions titleWidth="w-44" />
      <SkForm rows={4} />
      <SkForm rows={4} />
      <SkForm rows={3} />
    </SkPageShell>
  );
}
