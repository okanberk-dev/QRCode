import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  updateGoogleReviewReply,
  GoogleBusinessApiError,
} from '@/lib/google-business';
import { googleBusinessErrorResponse } from '@/lib/google-business-response';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { sendFirstReplyCelebrationEmail } from '@/lib/email';
import { alreadySent, recordSent } from '@/lib/email/lifecycle';

export const dynamic = 'force-dynamic';

const Body = z.object({
  reviewName: z.string().min(10).max(500),
  comment: z.string().trim().min(2).max(4096),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();
  if (!(await googleReviewManagementEnabled(id))) {
    return ApiErrors.forbidden(
      'Google yorum yönetimi bu işletme için kapalı.',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody(Body, body);
  if (!parsed.ok) return parsed.response;

  const limit = await rateLimit(`google-review-reply:${actor.id}:${id}`, 20, 60_000);
  if (!limit.allowed) {
    return ApiErrors.tooManyRequests(
      'Çok fazla Google yorum yanıtı denemesi. Biraz bekleyip tekrar deneyin.',
      'RATE_LIMITED',
      limit.retryAfterSeconds,
    );
  }

  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  if (!integration) {
    return ApiErrors.badRequest('Google Business Profile hesabı bağlı değil.', 'GOOGLE_NOT_CONNECTED');
  }

  const selection = selectedGoogleLocation(parseGoogleLocationsCache(integration.locationsJson), id);
  if (!selection) {
    return ApiErrors.badRequest('Bu işletme için Google Business konumu seçilmemiş.', 'GOOGLE_LOCATION_NOT_SELECTED');
  }

  const expectedPrefix = `accounts/${selection.accountId}/locations/${selection.locationId}/reviews/`;
  if (!parsed.data.reviewName.startsWith(expectedPrefix)) {
    return ApiErrors.forbidden('Bu yorum seçili Google konumuna ait değil.');
  }

  try {
    const reply = await updateGoogleReviewReply(
      integration,
      parsed.data.reviewName,
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
            metadata: { reviewName: parsed.data.reviewName },
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
      return googleBusinessErrorResponse(error, 'Google yorum yanıtı gönderilemedi.');
    }
    console.error('[google review reply] failed', { restaurantId: id });
    return ApiErrors.internalError('Google yorum yanıtı gönderilemedi.');
  }
}
