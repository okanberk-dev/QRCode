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
      return googleBusinessErrorResponse(error, 'Google yorumları alınamadı.');
    }
    console.error('[google reviews] failed', { restaurantId: id });
    return ApiErrors.internalError('Google yorumları çekilemedi.');
  }
}
