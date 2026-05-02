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
} from '@/lib/google-business';
import { rateLimit } from '@/lib/rate-limit';

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
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[google review reply] failed', error);
    return ApiErrors.internalError('Google yorum yanıtı gönderilemedi.');
  }
}
