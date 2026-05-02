import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import {
  fetchGoogleBusinessLocations,
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  selectedGoogleLocation,
} from '@/lib/google-business';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
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

  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  if (!integration) {
    return ApiErrors.badRequest('Google Business Profile hesabı bağlı değil.', 'GOOGLE_NOT_CONNECTED');
  }

  try {
    const cache = await fetchGoogleBusinessLocations(integration);
    await prisma.googleIntegration.update({
      where: { id: integration.id },
      data: { locationsJson: cache as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      accounts: cache.accounts,
      locations: cache.locations,
      selectedLocation: selectedGoogleLocation(cache, id),
      syncedAt: cache.syncedAt,
    });
  } catch (error) {
    console.error('[google business locations] failed', error);
    return ApiErrors.internalError('Google işletme konumları çekilemedi.');
  }
}
