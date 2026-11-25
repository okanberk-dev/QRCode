import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  listLocationMedia,
  listLocationQuestions,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  GoogleBusinessApiError,
} from '@/lib/google-business';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/restaurants/[id]/google/business/profile-stats
 *
 * Stage 10 — closes the §38.55 PROFİL SAĞLIĞI backlog: feeds the owner panel
 * Google Yorumları gauge with the real `mediaCount` + `unansweredQuestions`
 * counts from Google Business Profile, replacing the "— yakında" placeholder.
 *
 * Robustness contract (CLAUDE.md §38.80):
 *   - Hard 4xx/5xx only for IDOR / not-connected / location-unselected /
 *     review-management-disabled (parity with the reviews endpoint).
 *   - Soft failures inside Google's APIs degrade to `null` counts and a
 *     200 response. The Q&A API (`mybusinessq-and-a.googleapis.com`) is a
 *     separate Google Cloud product surface that may be disabled by default;
 *     a 403 there must NOT take the rest of the gauge offline.
 *   - The owner UI renders a "— yakında" placeholder for any null count.
 */
async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();
  if (!(await googleReviewManagementEnabled(id))) {
    return ApiErrors.forbidden(
      'Google yorum yönetimi bu işletme için kapalı.',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
    );
  }

  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  if (!integration) {
    return ApiErrors.badRequest(
      'Google Business Profile hesabı bağlı değil.',
      'GOOGLE_NOT_CONNECTED',
    );
  }

  const selection = selectedGoogleLocation(parseGoogleLocationsCache(integration.locationsJson), id);
  if (!selection) {
    return ApiErrors.badRequest(
      'Bu işletme için Google Business konumu seçilmemiş.',
      'GOOGLE_LOCATION_NOT_SELECTED',
    );
  }

  const profileComplete = Boolean(selection.title && selection.address);

  // Both calls intentionally independent — Q&A API may be disabled in the
  // owner's Google Cloud project (403) and shouldn't pull the media count
  // down with it. The reviews wrapper already emits a single Sentry event
  // per failure; nothing to log again here.
  const [mediaResult, questionsResult] = await Promise.allSettled([
    listLocationMedia(integration, selection),
    listLocationQuestions(integration, selection),
  ]);

  const mediaCount =
    mediaResult.status === 'fulfilled' ? mediaResult.value.count : null;
  const totalQuestions =
    questionsResult.status === 'fulfilled' ? questionsResult.value.totalCount : null;
  const unansweredQuestions =
    questionsResult.status === 'fulfilled' ? questionsResult.value.unansweredCount : null;

  // Reauth wins as a hard error — owner can't fix the gauge without
  // reconnecting, surface that signal even if the rest of the stats came back.
  for (const r of [mediaResult, questionsResult]) {
    if (r.status === 'rejected' && r.reason instanceof GoogleBusinessApiError && r.reason.requiresReauth) {
      return NextResponse.json(
        {
          error: 'Google bağlantısı süresi doldu. Hesabı yeniden bağlayın.',
          code: 'GOOGLE_REAUTH_REQUIRED',
          requiresReauth: true,
        },
        { status: 401 },
      );
    }
  }

  return NextResponse.json(
    {
      profileComplete,
      mediaCount,
      totalQuestions,
      unansweredQuestions,
      // surface the location title for parity with the status endpoint payload
      // — UI helpers can stitch the gauge sub-text without a second fetch.
      location: { title: selection.title, address: selection.address },
    },
    {
      // PROFİL SAĞLIĞI gauge polled at most a few times per session; reviews
      // page already caches its own data. 60s fresh + 5min SWR mirrors the
      // owner-cache pattern (CLAUDE.md §19.3).
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
