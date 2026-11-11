import { GoogleReviewsLoadingShell } from '@/components/dashboard/google/GoogleReviewsSkeleton';

/**
 * Google reviews — header (title + description, no eyebrow), the one-line
 * business status row, the 2-col grid (rating card, tall checklist, review
 * rows) and one reply-card row.
 *
 * The SAME shell the page uses as its Suspense fallback, and the body is the
 * SAME component the client page renders while its business list resolves;
 * the wrapper is the page's own `max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8
 * space-y-5`, so the loading → loaded transition does not move anything
 * (CLS = 0, CLAUDE.md §40.10). No spinner anywhere: flat boxes only.
 */
export default function Loading() {
  return <GoogleReviewsLoadingShell />;
}
