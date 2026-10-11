import {
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Owner QR codes — header (+ "Liste" / "Yeni QR oluştur" actions) and the
 * 3-col QR card grid. The create wizard is a modal, so there is no inline
 * form here; QrClient renders the same <SkCardGrid> while QR history loads,
 * so the route skeleton and the in-page load look like one state.
 * (CLAUDE.md §40.10)
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-48" />

      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
