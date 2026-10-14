import { SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import { GoogleReviewsBodySkeleton } from '@/components/dashboard/google/GoogleReviewsSkeleton';

/**
 * Google reviews — header, a `h-11` business select row, the 2-col grid
 * (rating card, tall checklist, review rows) and one reply-card row.
 *
 * The body skeleton is the SAME component the client page renders while its
 * business list resolves (and as its Suspense fallback), and the wrapper is
 * the page's own `max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-5`, so the
 * loading → loaded transition does not move anything (CLS = 0, CLAUDE.md
 * §40.10). No spinner anywhere: flat boxes only.
 */
export default function Loading() {
  return (
    <SkPageShell max={1440}>
      <SkPageHeader titleWidth="w-56" />
      <GoogleReviewsBodySkeleton />
    </SkPageShell>
  );
}
