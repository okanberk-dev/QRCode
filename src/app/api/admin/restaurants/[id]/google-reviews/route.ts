import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import { writeAdminAuditLog } from '@/lib/audit-log';
import {
  fetchGoogleBusinessLocations,
  GoogleBusinessApiError,
  googleReviewUrlFromPlaceId,
  withSelectedGoogleLocation,
} from '@/lib/google-business';
import { googleConnectionState, isGoogleTenantAllowed } from '@/lib/gbp-access';
import {
  enqueueGoogleReviewRefresh,
  refreshGoogleReviewCache,
  showcaseFailureFromError,
} from '@/lib/google-review-showcase';
import { clearBusinessApiNotProvisioned } from '@/lib/google-business-availability';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('locate'),
    /** `locations/{id}` from a previous answer — only needed when several exist. */
    locationName: z.string().min(1).max(160).optional(),
  }).strict(),
  z.object({ action: z.literal('refresh') }).strict(),
]);

/**
 * Admin tools for one business's Google review showcase (CLAUDE.md §53):
 *
 *  - `locate`: reads the owner's Business Profile accounts + locations with
 *    the owner's own connection. Exactly one location → it is selected;
 *    several → the list comes back and the admin repeats with `locationName`.
 *    Selecting also sets the business's Google review link (same as the owner
 *    panel) and queues a review refresh.
 *  - `refresh`: fetches the reviews now (still through the global budget).
 *
 * Superadmin only, 6 calls/min per business (each call spends shared quota).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: admin ? 403 : 401 });
  }
  const { id } = await params;

  const limit = await rateLimit(`admin:gbp-showcase:${id}`, 6, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek', code: 'RATE_LIMITED', retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const parsed = validateBody(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, userId: true, slug: true },
  });
  if (!restaurant?.userId) return NextResponse.json({ error: 'İşletme bulunamadı' }, { status: 404 });

  if (!(await isGoogleTenantAllowed(restaurant.userId))) {
    return NextResponse.json(
      { error: 'Bu işletme GBP_ALLOWED_TENANTS listesinde değil.', code: 'GOOGLE_TENANT_NOT_ALLOWED' },
      { status: 403 },
    );
  }

  const integration = await prisma.googleIntegration.findUnique({ where: { userId: restaurant.userId } });
  const state = googleConnectionState(integration, process.env.GOOGLE_CLIENT_ID);
  if (!integration || state !== 'connected') {
    return NextResponse.json(
      {
        error: 'İşletme sahibinin Google bağlantısı yok ya da yeniden bağlanmalı.',
        code: 'GOOGLE_NOT_CONNECTED',
        connectionState: state,
      },
      { status: 409 },
    );
  }

  const adminId = typeof admin.id === 'string' ? admin.id : 'env-admin';

  if (parsed.data.action === 'refresh') {
    await enqueueGoogleReviewRefresh(id);
    const result = await refreshGoogleReviewCache(id);
    await writeAdminAuditLog({
      actorId: adminId,
      actorSource: 'admin',
      action: 'admin.google.reviews.refresh',
      targetId: id,
      payload: { ok: result.ok, code: result.ok ? null : result.code },
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  let locationsCache;
  try {
    locationsCache = await fetchGoogleBusinessLocations(integration);
  } catch (err) {
    const { code, retryAfterSeconds } = err instanceof GoogleBusinessApiError
      ? showcaseFailureFromError(err)
      : { code: 'INTERNAL_ERROR' as const, retryAfterSeconds: undefined };
    return NextResponse.json({ error: 'Google konumları alınamadı.', code, retryAfterSeconds }, { status: 502 });
  }
  // A successful Business Profile call proves the API is provisioned.
  void clearBusinessApiNotProvisioned(id);

  const wanted = parsed.data.locationName;
  const candidates = wanted
    ? locationsCache.locations.filter((l) => l.locationName === wanted)
    : locationsCache.locations;

  if (candidates.length !== 1) {
    // Keep the freshly listed accounts/locations so the owner panel sees them too.
    await prisma.googleIntegration.update({
      where: { id: integration.id },
      data: { locationsJson: locationsCache as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json(
      {
        selected: null,
        reason: candidates.length === 0 ? 'no_location' : 'multiple_locations',
        accounts: locationsCache.accounts.map((a) => ({ name: a.name, accountName: a.accountName })),
        locations: locationsCache.locations.map((l) => ({
          locationName: l.locationName,
          title: l.title,
          address: l.address,
        })),
      },
      { status: candidates.length === 0 ? 404 : 409 },
    );
  }

  const location = candidates[0];
  const nextCache = withSelectedGoogleLocation(locationsCache, id, location);
  const googleReviewUrl =
    location.newReviewUri ?? (location.placeId ? googleReviewUrlFromPlaceId(location.placeId) : undefined);

  await prisma.$transaction([
    prisma.googleIntegration.update({
      where: { id: integration.id },
      data: { locationsJson: nextCache as unknown as Prisma.InputJsonValue },
    }),
    prisma.restaurant.update({
      where: { id },
      data: {
        ...(location.placeId ? { googlePlaceId: location.placeId } : {}),
        ...(googleReviewUrl ? { googleReviewUrl } : {}),
        googleEnabled: true,
      },
    }),
  ]);
  await enqueueGoogleReviewRefresh(id);
  const refresh = await refreshGoogleReviewCache(id);

  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.google.location.select',
    targetId: id,
    payload: { locationTitle: location.title, autoSelected: !wanted, refreshOk: refresh.ok },
  });

  return NextResponse.json({
    selected: {
      accountName: location.accountName,
      locationName: location.locationName,
      title: location.title,
      address: location.address,
    },
    refresh,
    embedUrl: `/embed/${restaurant.slug}/google`,
  });
}
