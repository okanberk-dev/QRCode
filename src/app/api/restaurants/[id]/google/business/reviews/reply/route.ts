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
import { moderateReplyContent } from '@/lib/content-safety';
import { loadReplyAllowedHosts } from '@/lib/reply-allowed-hosts';
import { isReplyRiskKind, replyRiskMessages } from '@/lib/reply-risk';

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
  // Per-message responsibility acknowledgement (required on every send —
  // the UI resets this after each reply). `z.literal(true)` rejects a
  // missing or `false` value with the standard 400 validation response.
  confirmResponsibility: z.literal(true),
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

  // Risk gate (CLAUDE.md §45, §48). Public Google replies carry more
  // exposure than internal-only ones (visible to anyone, indexed by Google),
  // so this runs before the reply ever reaches Google's API.
  const allowedHosts = await loadReplyAllowedHosts(id);
  const safety = await moderateReplyContent(parsed.data.comment, { allowedHosts });
  if (safety.blocked) {
    const issues = safety.categories.filter(isReplyRiskKind);
    return NextResponse.json(
      {
        error: isTr
          ? 'Bu yanıt gönderilemedi: riskli bir ifade içeriyor.'
          : 'This reply could not be sent: it contains risky content.',
        code: 'CONTENT_BLOCKED',
        issues,
        messages: replyRiskMessages(issues, isTr ? 'tr' : 'en'),
      },
      { status: 400 },
    );
  }

  try {
    const reply = await updateGoogleReviewReply(
      integration,
      canonicalReviewName,
      parsed.data.comment,
    );

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
