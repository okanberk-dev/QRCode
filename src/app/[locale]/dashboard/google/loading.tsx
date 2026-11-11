import { GoogleReviewsLoadingShell } from '@/components/dashboard/google/GoogleReviewsSkeleton';

/**
 * /dashboard/google only redirects to /dashboard/google-reviews, so while the
 * redirect resolves show that page's own skeleton (same geometry, CLAUDE.md
 * §40.10).
 */
export default function Loading() {
  return <GoogleReviewsLoadingShell />;
}
