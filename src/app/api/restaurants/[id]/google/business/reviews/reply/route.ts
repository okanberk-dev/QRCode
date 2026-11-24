import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import {
  deleteGoogleReviewReply,
  updateGoogleReviewReply,
  GoogleBusinessApiError,
  GOOGLE_REVIEW_NAME_RE,
} from '@/lib/google-business';
import { googleBusinessErrorResponse } from '@/lib/google-business-response';
import { rateLimit } from '@/lib/rate-limit';
import { moderateReplyContent } from '@/lib/content-safety';
import { loadReplyAllowedHosts } from '@/lib/reply-allowed-hosts';
import { isReplyRiskKind, replyRiskMessages } from '@/lib/reply-risk';
import { prisma } from '@/lib/prisma';
import { writePanelAuditLog } from '@/lib/audit-log';
import { gateConnectedGoogleReviewRoute, type GoogleReviewRouteConnected } from '@/lib/google-review-route';
import { recordReplyOnReview } from '@/lib/google-review-sync';
import { findBannedPhrases, readGoogleReplySettings } from '@/lib/google-reply-settings';

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

const DeleteBody = z.object({
  reviewName: z.string().min(10).max(500).regex(GOOGLE_REVIEW_NAME_RE),
}).strict();

/**
 * Ownership check: the review must sit under the business's selected
 * location. Never forward the client string — rebuild the resource name from
 * the trusted selection plus the validated id, so the URL actually requested
 * is provably the one the check approved.
 */
function ownedReview(ctx: GoogleReviewRouteConnected, reviewName: string): { name: string; reviewId: string } | null {
  const prefix = `accounts/${ctx.selection.accountId}/locations/${ctx.selection.locationId}/reviews/`;
  if (!reviewName.startsWith(prefix)) return null;
  const reviewId = reviewName.slice(prefix.length);
  if (!/^[A-Za-z0-9_-]+$/.test(reviewId)) return null;
  return { name: `${prefix}${reviewId}`, reviewId };
}

function notOwned(isTr: boolean) {
  return ApiErrors.forbidden(
    isTr ? 'Bu yorum seçili Google konumuna ait değil.' : 'This review does not belong to the selected Google location.',
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await gateConnectedGoogleReviewRoute(req, id, { write: true });
  if (!ctx.ok) return ctx.response;
  const isTr = ctx.locale === 'tr';

  const parsed = validateBody(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-reply:${ctx.actor.id}:${id}`, 30, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      isTr
        ? 'Çok fazla Google yorum yanıtı denemesi. Biraz bekleyip tekrar deneyin.'
        : 'Too many Google reply attempts. Wait a moment and try again.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const owned = ownedReview(ctx, parsed.data.reviewName);
  if (!owned) return notOwned(isTr);

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

  // Business-level banned phrases (§54 reply settings).
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { googleReplySettings: true },
  });
  const banned = findBannedPhrases(parsed.data.comment, readGoogleReplySettings(restaurant?.googleReplySettings).bannedPhrases);
  if (banned.length > 0) {
    return NextResponse.json(
      {
        error: isTr
          ? 'Yanıt, işletme ayarlarındaki yasaklı ifadeleri içeriyor.'
          : 'The reply contains phrases banned in the business settings.',
        code: 'BANNED_PHRASE',
        phrases: banned,
      },
      { status: 400 },
    );
  }

  try {
    const reply = await updateGoogleReviewReply(ctx.integration, owned.name, parsed.data.comment);
    const stored = { comment: reply.comment ?? parsed.data.comment, updateTime: reply.updateTime ?? new Date().toISOString() };
    await recordReplyOnReview(id, owned.reviewId, stored);
    await prisma.googleReviewAiDraft.deleteMany({ where: { restaurantId: id, reviewName: owned.name } });
    await writePanelAuditLog(ctx.actor, 'owner.google.review.reply', id, {
      reviewId: owned.reviewId,
      comment: parsed.data.comment.slice(0, 1000),
      confirmedResponsibility: true,
    });
    return NextResponse.json({ reply: { ...reply, comment: stored.comment, updateTime: stored.updateTime } });
  } catch (error) {
    if (error instanceof GoogleBusinessApiError) {
      return googleBusinessErrorResponse(error, 'Google yorum yanıtı gönderilemedi.', 'Failed to publish Google reply.', ctx.locale);
    }
    console.error('[google review reply] failed', { restaurantId: id });
    return ApiErrors.internalError(isTr ? 'Google yorum yanıtı gönderilemedi.' : 'Failed to publish Google reply.');
  }
}

/** Removes the public reply from Google and from the stored review. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await gateConnectedGoogleReviewRoute(req, id, { write: true });
  if (!ctx.ok) return ctx.response;
  const isTr = ctx.locale === 'tr';

  const parsed = validateBody(DeleteBody, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-reply:${ctx.actor.id}:${id}`, 30, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      isTr ? 'Çok fazla istek. Biraz bekleyip tekrar deneyin.' : 'Too many requests. Wait a moment and try again.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const owned = ownedReview(ctx, parsed.data.reviewName);
  if (!owned) return notOwned(isTr);

  try {
    await deleteGoogleReviewReply(ctx.integration, owned.name);
    await recordReplyOnReview(id, owned.reviewId, null);
    await writePanelAuditLog(ctx.actor, 'owner.google.review.reply_delete', id, { reviewId: owned.reviewId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GoogleBusinessApiError) {
      return googleBusinessErrorResponse(error, 'Google yanıtı silinemedi.', 'Failed to delete the Google reply.', ctx.locale);
    }
    console.error('[google review reply delete] failed', { restaurantId: id });
    return ApiErrors.internalError(isTr ? 'Google yanıtı silinemedi.' : 'Failed to delete the Google reply.');
  }
}
