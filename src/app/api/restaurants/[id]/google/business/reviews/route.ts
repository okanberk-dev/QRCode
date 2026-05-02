import { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  listGoogleReviews,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
} from '@/lib/google-business';

export const dynamic = 'force-dynamic';

export async function GET(
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
    return ApiErrors.badRequest('Google Business Profile hesabı bağlı değil.', 'GOOGLE_NOT_CONNECTED');
  }

  const selection = selectedGoogleLocation(parseGoogleLocationsCache(integration.locationsJson), id);
  if (!selection) {
    return ApiErrors.badRequest('Bu işletme için Google Business konumu seçilmemiş.', 'GOOGLE_LOCATION_NOT_SELECTED');
  }

  try {
    const reviews = await listGoogleReviews(
      integration,
      selection,
      req.nextUrl.searchParams.get('pageToken'),
    );
    return NextResponse.json({ ...reviews, location: selection });
  } catch (error) {
    console.error('[google reviews] failed', error);
    return ApiErrors.internalError('Google yorumları çekilemedi.');
  }
}
