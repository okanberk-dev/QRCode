/**
 * Shared gate for the Google review inbox routes (CLAUDE.md §54): actor,
 * IDOR scope, write permission, the admin master switch and — when the route
 * talks to Google — the connection and the selected location.
 */
import type { NextRequest, NextResponse } from 'next/server';
import { getPanelActorFromRequest, type PanelActor } from '@/lib/auth';
import { canAccessRestaurant, canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { getLocaleFromRequest } from '@/lib/api/locale';
import {
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  type GoogleRestaurantLocationSelection,
} from '@/lib/google-business';

type Integration = NonNullable<Awaited<ReturnType<typeof getGoogleIntegrationForRestaurant>>>;

export interface GoogleReviewRouteBase {
  actor: PanelActor;
  restaurantId: string;
  locale: 'tr' | 'en';
}

export interface GoogleReviewRouteConnected extends GoogleReviewRouteBase {
  integration: Integration;
  selection: GoogleRestaurantLocationSelection;
}

type Fail = { ok: false; response: NextResponse };

export async function gateGoogleReviewRoute(
  req: NextRequest,
  restaurantId: string,
  opts: { write?: boolean } = {},
): Promise<({ ok: true } & GoogleReviewRouteBase) | Fail> {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return { ok: false, response: ApiErrors.unauthorized() };
  const locale = getLocaleFromRequest(req) === 'en' ? 'en' : 'tr';
  const allowed = opts.write
    ? await canWriteRestaurant(actor, restaurantId)
    : await canAccessRestaurant(actor, restaurantId);
  if (!allowed) return { ok: false, response: ApiErrors.forbidden() };
  if (!(await googleReviewManagementEnabled(restaurantId))) {
    return {
      ok: false,
      response: ApiErrors.forbidden(
        locale === 'tr'
          ? 'Google yorum yönetimi bu işletme için kapalı.'
          : 'Google review management is disabled for this business.',
        'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
      ),
    };
  }
  return { ok: true, actor, restaurantId, locale };
}

export async function gateConnectedGoogleReviewRoute(
  req: NextRequest,
  restaurantId: string,
  opts: { write?: boolean } = {},
): Promise<({ ok: true } & GoogleReviewRouteConnected) | Fail> {
  const base = await gateGoogleReviewRoute(req, restaurantId, opts);
  if (!base.ok) return base;
  const isTr = base.locale === 'tr';
  const integration = await getGoogleIntegrationForRestaurant(base.actor, restaurantId);
  if (!integration) {
    return {
      ok: false,
      response: ApiErrors.badRequest(
        isTr ? 'Google hesabı bağlı değil.' : 'Google account is not connected.',
        'GOOGLE_NOT_CONNECTED',
      ),
    };
  }
  const selection = selectedGoogleLocation(parseGoogleLocationsCache(integration.locationsJson), restaurantId);
  if (!selection) {
    return {
      ok: false,
      response: ApiErrors.badRequest(
        isTr ? 'Bu işletme için Google konumu seçilmemiş.' : 'No Google location selected for this business.',
        'GOOGLE_LOCATION_NOT_SELECTED',
      ),
    };
  }
  return { ...base, integration, selection };
}

/** `accounts/{a}/locations/{l}/reviews/{reviewId}` rebuilt from the trusted selection. */
export function canonicalReviewName(selection: GoogleRestaurantLocationSelection, reviewId: string): string | null {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(reviewId)) return null;
  return `accounts/${selection.accountId}/locations/${selection.locationId}/reviews/${reviewId}`;
}
