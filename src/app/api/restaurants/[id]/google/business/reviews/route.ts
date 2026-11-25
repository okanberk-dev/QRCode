import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { getLocaleFromRequest } from '@/lib/api/locale';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  listGoogleReviews,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  GoogleBusinessApiError,
} from '@/lib/google-business';
import { googleBusinessErrorResponse } from '@/lib/google-business-response';
import { prisma } from '@/lib/prisma';
import { withServerTiming } from '@/lib/server-timing';

export const dynamic = 'force-dynamic';

async function handleGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  // Fix #7 — locale-aware error mesajları
  const locale = getLocaleFromRequest(req);
  const isTr = locale === 'tr';
  if (!(await canAccessRestaurant(actor, id))) return ApiErrors.forbidden();
  if (!(await googleReviewManagementEnabled(id))) {
    return ApiErrors.forbidden(
      isTr
        ? 'Google yorum yönetimi bu işletme için kapalı.'
        : 'Google review management is disabled for this business.',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
    );
  }

  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  if (!integration) {
    return ApiErrors.badRequest(
      isTr
        ? 'Google Business Profile hesabı bağlı değil.'
        : 'Google Business Profile account is not connected.',
      'GOOGLE_NOT_CONNECTED',
    );
  }

  const selection = selectedGoogleLocation(parseGoogleLocationsCache(integration.locationsJson), id);
  if (!selection) {
    return ApiErrors.badRequest(
      isTr
        ? 'Bu işletme için Google Business konumu seçilmemiş.'
        : 'No Google Business location selected for this business.',
      'GOOGLE_LOCATION_NOT_SELECTED',
    );
  }

  // Per-restaurant throttle. CLAUDE.md §5.1.1: the Google quota is PROJECT-wide
  // and shared by every tenant, so "yeni googleBusinessFetch-tabanlı endpoint
  // eklerken aynı 4-katman desenini uygula". The locations endpoint does; this
  // one called the API on every single request — each page load, restaurant
  // switch and component remount went straight to Google. 20/min is far above
  // what a human browsing reviews needs, while capping remount storms.
  const rl = await rateLimit(`google-reviews:${id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'GOOGLE_CLIENT_THROTTLED',
        message: isTr
          ? 'Çok sık yenilendi. Birkaç saniye sonra tekrar deneyin.'
          : 'Refreshed too often. Please try again in a few seconds.',
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const reviews = await listGoogleReviews(
      integration,
      selection,
      req.nextUrl.searchParams.get('pageToken'),
    );

    // Reputation OS — pre-loaded AI drafts. Cron taraması yaptıysa
    // (`/api/cron/google-reviews-autodraft`) her unreplied review için
    // GoogleReviewAiDraft satırı vardır; UI bunu kullanarak owner panel
    // açtığında "Taslak Öner" butonuna basmadan taslağı gösterir.
    //
    // Defensive query: GoogleReviewAiDraft tablosu henüz migrate
    // olmadıysa (preview deploy senaryoları, CLAUDE.md §19) hata kabul
    // edip drafts:{} dön. Reviews listing yine başarılı.
    let drafts: Record<string, { body: string; tone: string; source: string; generatedAt: string }> = {};
    try {
      const reviewNames = (reviews.reviews ?? [])
        .map((r) => r.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
      if (reviewNames.length > 0) {
        const rows = await prisma.googleReviewAiDraft.findMany({
          where: { restaurantId: id, reviewName: { in: reviewNames } },
          select: { reviewName: true, body: true, tone: true, source: true, generatedAt: true },
        });
        drafts = Object.fromEntries(
          rows.map((row) => [
            row.reviewName,
            {
              body: row.body,
              tone: row.tone,
              source: row.source,
              generatedAt: row.generatedAt.toISOString(),
            },
          ]),
        );
      }
    } catch (err) {
      console.warn('[google reviews] draft preload skipped', err);
    }

    return NextResponse.json({ ...reviews, location: selection, drafts });
  } catch (error) {
    if (error instanceof GoogleBusinessApiError) {
      return googleBusinessErrorResponse(
        error,
        'Google yorumları alınamadı.',
        'Failed to fetch Google reviews.',
        locale,
      );
    }
    console.error('[google reviews] failed', { restaurantId: id });
    return ApiErrors.internalError(
      isTr ? 'Google yorumları çekilemedi.' : 'Failed to fetch Google reviews.',
    );
  }
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
