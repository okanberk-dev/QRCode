import { AnalyticsSkeleton } from './_components/AnalyticsSkeleton';

/**
 * Menu analytics segment fallback (CLAUDE.md §40.10). The client page renders
 * the same `AnalyticsSkeleton` for its first request, so there is exactly one
 * loading layer.
 */
export default function Loading() {
  return <AnalyticsSkeleton />;
}
