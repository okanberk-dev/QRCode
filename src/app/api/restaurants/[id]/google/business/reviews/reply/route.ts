import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { getLocaleFromRequest } from '@/lib/api/locale';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  updateGoogleReviewReply,
  GoogleBusinessApiError,
  GOOGLE_REVIEW_NAME_RE,
} from '@/lib/google-business';
import { googleBusinessErrorResponse } from '@/lib/google-business-response';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { sendFirstReplyCelebrationEmail } from '@/lib/email';
import { alreadySent, recordSent } from '@/lib/email/lifecycle';

export const dynamic = 'force-dynamic';

// Google review resource name: accounts/{acct}/locations/{loc}/reviews/{id}.
// The charset is pinned to URL-safe base64 (what Google actually emits) so a
// `..` dot-segment can never enter. This matters because `reviewName` is
// concatenated into the request URL: `fetch()` resolves dot-segments per the
// WHATWG URL spec, so `.../reviews/../../../../accounts/X/locations/Y/reviews/Z`
// passes a `startsWith(expectedPrefix)` ownership check and still PUTs the
// reply onto a completely different Google account/location. Encoding does not
// help here (encodeURIComponent('..') === '..'); only an allow-list does.
const Body = z.object({
  reviewName: z.string().min(10).max(500).regex(GOOGLE_REVIEW_NAME_RE),
  comment: z.string().trim().min(2).max(4096),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  // Fix #7 — locale-aware error mesajları
  const locale = getLocaleFromRequest(req);
  const isTr = locale === 'tr';
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();
  if (!(await googleReviewManagementEnabled(id))) {
    return ApiErrors.forbidden(
      isTr
        ? 'Google yorum yönetimi bu işletme için kapalı.'
        : 'Google review management is disabled for this business.',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody(Body, body);
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-reply:${actor.id}:${id}`, 20, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      isTr
        ? 'Çok fazla Google yorum yanıtı denemesi. Biraz bekleyip tekrar deneyin.'
        : 'Too many Google reply attempts. Wait a moment and try again.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
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

  const expectedPrefix = `accounts/${selection.accountId}/locations/${selection.locationId}/reviews/`;
  if (!parsed.data.reviewName.startsWith(expectedPrefix)) {
    return ApiErrors.forbidden(
      isTr
        ? 'Bu yorum seçili Google konumuna ait değil.'
        : 'This review does not belong to the selected Google location.',
    );
  }

  // Never forward the client string: rebuild the resource name from the
  // trusted selection plus the validated id, so the URL that is actually
  // requested is provably the one the ownership check just approved.
  const reviewId = parsed.data.reviewName.slice(expectedPrefix.length);
  if (!/^[A-Za-z0-9_-]+$/.test(reviewId)) {
    return ApiErrors.forbidden(
      isTr
        ? 'Bu yorum seçili Google konumuna ait değil.'
        : 'This review does not belong to the selected Google location.',
    );
  }
  const canonicalReviewName = `${expectedPrefix}${reviewId}`;

  try {
    const reply = await updateGoogleReviewReply(
      integration,
      canonicalReviewName,
      parsed.data.comment,
    );

    // Wave C3 (CLAUDE.md §38.194) — first reply celebration. Fire-and-forget;
    // LifecycleEmailLog cooldown (lifetime per restaurant) keeps this to a
    // single mail per restaurant for the lifetime of the account. We check
    // BEFORE sending so a Google reply edit (which would call this endpoint
    // a second time) doesn't double-fire.
    (async () => {
      try {
        const already = await alreadySent({
          restaurantId: id,
          type: 'first_reply_celebration',
        });
        if (already) return;
        const rest = await prisma.restaurant.findUnique({
          where: { id },
          select: {
            name: true,
            notificationEmail: true,
            user: { select: { email: true, name: true, locale: true } },
          },
        });
        if (!rest) return;
        const recipient = rest.notificationEmail || rest.user?.email;
        if (!recipient) return;
        const userLocale: 'tr' | 'en' = rest.user?.locale === 'en' ? 'en' : 'tr';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
        const ok = await sendFirstReplyCelebrationEmail({
          to: recipient,
          ownerName: rest.user?.name ?? null,
          restaurantName: rest.name,
          reviewsUrl: `${appUrl}/${userLocale}/dashboard/google-reviews`,
          locale: userLocale,
        });
        if (ok) {
          await recordSent({
            restaurantId: id,
            type: 'first_reply_celebration',
            metadata: { reviewName: canonicalReviewName },
          });
        }
      } catch (err) {
        console.error('[GOOGLE_REPLY] first-reply celebration failed', {
          restaurantId: id,
          errName: err instanceof Error ? err.name : 'unknown',
        });
      }
    })().catch(() => {
      // IIFE already swallows; defence-in-depth
    });

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof GoogleBusinessApiError) {
      return googleBusinessErrorResponse(
        error,
        'Google yorum yanıtı gönderilemedi.',
        'Failed to publish Google reply.',
        locale,
      );
    }
    console.error('[google review reply] failed', { restaurantId: id });
    return ApiErrors.internalError(
      isTr ? 'Google yorum yanıtı gönderilemedi.' : 'Failed to publish Google reply.',
    );
  }
}
