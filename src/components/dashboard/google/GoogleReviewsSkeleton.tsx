import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Flat (animation-free) skeletons of the Google reviews page, shared by the
 * route `loading.tsx` (server), the page's Suspense fallback and the client
 * page itself (while the business list resolves) so all three have IDENTICAL
 * geometry: loading → loaded does not shift the wrapper (CLS = 0, CLAUDE.md
 * §40.10). No "use client": pure markup, importable from both worlds.
 *
 * Geometry mirrors the loaded page: the header (title + description, no
 * eyebrow), an optional one-line business status row (owners with several
 * businesses — the page has no business picker of its own, the shell's
 * switcher picks it), then the 2-col grid (rating card, tall checklist, review rows — same
 * `lg:grid-cols-[minmax(0,1fr)_380px]` as the real section) and one reply
 * card row. DOM order = mobile order (rating → checklist → reviews → reply).
 */

/** The 2-col profile grid (used alone as the in-card loading state). */
export function PlacesProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]" aria-hidden="true">
      {/* Rating card */}
      <div className="bz-card space-y-4 p-5 sm:p-6 lg:col-start-1 lg:row-start-1">
        <SkBox className="h-3 w-24" />
        <SkBox className="h-7 w-64 max-w-full" />
        <SkBox className="h-4 w-80 max-w-full" />
        <div className="flex items-end gap-4 pt-2">
          <SkBox className="h-16 w-28 sm:h-20" />
          <div className="space-y-2">
            <SkBox className="h-4 w-28" />
            <SkBox className="h-4 w-36" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <SkBox className="h-11 w-32" />
          <SkBox className="h-11 w-44" />
        </div>
      </div>

      {/* Checklist (spans both rows on desktop) */}
      <div className="bz-card space-y-4 p-5 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <div className="flex items-center justify-between">
          <SkBox className="h-3 w-28" />
          <SkBox className="h-4 w-16" />
        </div>
        <SkBox className="h-1.5 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <SkBox className="h-5 w-5 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkBox className="h-4 w-32" />
              <SkBox className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Sample reviews */}
      <div className="bz-card divide-y divide-[#EDEDED] lg:col-start-1 lg:row-start-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <SkBox className="h-7 w-7 rounded-full" />
              <SkBox className="h-4 w-32" />
              <SkBox className="h-3 w-16" />
            </div>
            <SkBox className="h-4 w-full" />
            <SkBox className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The optional reply card, as one flat row. */
export function ReplyRowSkeleton() {
  return (
    <div className="bz-card space-y-3 p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <SkBox className="h-5 w-64 max-w-full" />
        <SkBox className="h-5 w-20" />
      </div>
      <SkBox className="h-4 w-full max-w-2xl" />
      <SkBox className="h-11 w-48" />
    </div>
  );
}

/**
 * The page header: title + description, no eyebrow (the page dropped it —
 * it only repeated the title). Box heights follow `PageHeader` exactly
 * (`SkPageHeader` has a one-line description and a fixed 36px title, which is
 * ~15px short on phones, where this description wraps to two lines):
 *  - h1: `mt-1`, clamp(24px, 3vw, 30px) × 1.1 → 26px on phones, 33px on lg;
 *  - description: `mt-2`, 13px × 1.55 → two lines on phones, one from sm;
 *  - `mb-5` like `PageHeader`.
 */
export function GoogleReviewsHeaderSkeleton() {
  return (
    <div className="mb-5" aria-hidden="true">
      <SkBox className="mt-1 h-[26px] w-56 max-w-full lg:h-[33px]" />
      <div className="mt-2 space-y-[4px] sm:space-y-0">
        <SkBox className="h-[18px] w-80 max-w-full sm:h-5" />
        <SkBox className="h-[18px] w-44 max-w-full sm:hidden" />
      </div>
    </div>
  );
}

/**
 * Everything under the page header. `withSwitcher` keeps its name for
 * backward compatibility: it is now the one-line business status row (owners
 * with several businesses). On phones that row is two lines (name + badge,
 * then the "X işletmeden …" summary) unless `withSummary` is false (the page
 * hides the summary when Google search is off).
 */
export function GoogleReviewsBodySkeleton({
  withSwitcher = true,
  withSummary = true,
}: {
  withSwitcher?: boolean;
  withSummary?: boolean;
}) {
  return (
    <>
      {withSwitcher && (
        <div className="space-y-1.5 sm:space-y-0" aria-hidden="true">
          <SkBox className="h-[22px] w-48 max-w-full sm:w-full sm:max-w-md" />
          {withSummary && <SkBox className="h-[19px] w-64 max-w-full sm:hidden" />}
        </div>
      )}
      <PlacesProfileSkeleton />
      <ReplyRowSkeleton />
    </>
  );
}

/**
 * Complete page skeleton (route `loading.tsx` + Suspense fallback). The route
 * fallback knows nothing and shows the status row; the page's own Suspense
 * fallback passes what the server already read.
 */
export function GoogleReviewsLoadingShell({
  withSwitcher = true,
  withSummary = true,
}: {
  withSwitcher?: boolean;
  withSummary?: boolean;
} = {}) {
  return (
    <SkPageShell max={1280} space={6}>
      <GoogleReviewsHeaderSkeleton />
      <GoogleReviewsBodySkeleton withSwitcher={withSwitcher} withSummary={withSummary} />
    </SkPageShell>
  );
}
