import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import {
  fetchGoogleBusinessLocations,
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  GoogleBusinessApiError,
} from '@/lib/google-business';
import { googleBusinessErrorResponse } from '@/lib/google-business-response';
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
      stale: false,
    });
  } catch (error) {
    if (error instanceof GoogleBusinessApiError) {
      // Google API quota tükendiyse (429 GOOGLE_RATE_LIMITED) DB'de
      // saklanan son cache'i UI'a dön. Owner en azından eski
      // location'ları görüp seçim yapabilir + retry-after süresi sonra
      // yenileyebilir. CLAUDE.md §40.1 — graceful degrade, sessiz fail
      // yerine stale data + warning flag.
      if (error.code === 'GOOGLE_RATE_LIMITED') {
        const cached = parseGoogleLocationsCache(integration.locationsJson);
        if (cached.locations.length > 0 || cached.accounts.length > 0) {
          return NextResponse.json(
            {
              accounts: cached.accounts,
              locations: cached.locations,
              selectedLocation: selectedGoogleLocation(cached, id),
              syncedAt: cached.syncedAt,
              stale: true,
              warning: 'GOOGLE_RATE_LIMITED',
              retryAfterSeconds: error.retryAfterSeconds ?? 60,
              message:
                error.retryAfterSeconds && error.retryAfterSeconds > 0
                  ? `Google API kotası doldu. ${error.retryAfterSeconds} saniye sonra yenileyin. (Son güncel veriler gösteriliyor.)`
                  : 'Google API kotası doldu. Birkaç dakika sonra yenileyin. (Son güncel veriler gösteriliyor.)',
            },
            { status: 200 },
          );
        }
      }
      return googleBusinessErrorResponse(error, 'Google işletme konumları alınamadı.');
    }
    console.error('[google business locations] failed', { restaurantId: id });
    return ApiErrors.internalError('Google işletme konumları çekilemedi.');
  }
}
