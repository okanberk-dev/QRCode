import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { getLocaleFromRequest } from '@/lib/api/locale';
import {
  fetchGoogleBusinessLocations,
  getGoogleIntegrationForRestaurant,
  googleReviewManagementEnabled,
  parseGoogleLocationsCache,
  selectedGoogleLocation,
  GoogleBusinessApiError,
  type GoogleLocationsCache,
} from '@/lib/google-business';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// CLAUDE.md §5.1 quota math: Google'ın varsayılan kotaları çok dar —
//   - accounts.list: 1 istek/dakika/proje (TÜM Buaze kullanıcıları paylaşır)
//   - locations.list: 10 istek/dakika/proje
// Bir owner'ın "Konumları yenile" tıklaması proje-geneli quota'yı tüketir;
// 2-3 kullanıcı aynı dakikada yenilerse hepsi 429 alır. Bu yüzden:
//   1. Server-side TTL (CACHE_FRESH_SECONDS): cache N sn taze ise Google'a
//      hiç gitme, doğrudan DB cache'ini dön. Owner istemediği sürece
//      quota yakılmaz.
//   2. force=true query param: kullanıcı bilinçli "yenile" butonuna basarsa
//      cache'i bypass eder ve Google'ı çağırır.
//   3. Per-restaurant rate limit: 6 force-refresh/dakika — rapid click
//      veya bot ile quota burn'ünü kısıtlar.
//   4. 429 + empty cache: hard 429 yerine 200 + warning + boş array dön —
//      UI sarı banner + auto-retry countdown göstersin (kırmızı error
//      yerine).
const CACHE_FRESH_SECONDS = 30;

function cacheAgeSeconds(cache: GoogleLocationsCache): number | null {
  if (!cache.syncedAt) return null;
  const ts = Date.parse(cache.syncedAt);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 1000));
}

export async function GET(
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

  const integration = await getGoogleIntegrationForRestaurant(actor, id);
  if (!integration) {
    return ApiErrors.badRequest(
      isTr
        ? 'Google Business Profile hesabı bağlı değil.'
        : 'Google Business Profile account is not connected.',
      'GOOGLE_NOT_CONNECTED',
    );
  }

  const force = req.nextUrl.searchParams.get('force') === 'true';
  const cached = parseGoogleLocationsCache(integration.locationsJson);
  const ageSec = cacheAgeSeconds(cached);

  // (1) TTL fast-path: force=false + cache taze + en az 1 account var ise
  // Google'a hiç gitme. Dashboard ilk yüklemede, refresh butonu olmayan
  // sub-component remount'larda quota yakmaz.
  const canServeFromCache =
    !force &&
    ageSec !== null &&
    ageSec < CACHE_FRESH_SECONDS &&
    cached.accounts.length > 0;

  if (canServeFromCache) {
    return NextResponse.json({
      accounts: cached.accounts,
      locations: cached.locations,
      selectedLocation: selectedGoogleLocation(cached, id),
      syncedAt: cached.syncedAt,
      stale: false,
      source: 'cache',
      cacheAgeSeconds: ageSec,
    });
  }

  // (2) Rate limit: force refresh kotayı tüketir. Per-restaurant 6/dakika.
  // Owner panel buton mash veya parallel sub-component mount'tan koruma —
  // proje-geneli Google quota'sının korunması için gerekli.
  const rl = await rateLimit(`google-locations:${id}`, 6, 60_000);
  if (!rl.allowed) {
    // Cache varsa kullanıcıya kapatmak yerine son sync'i + uyarıyı dön.
    if (cached.accounts.length > 0 || cached.locations.length > 0) {
      return NextResponse.json({
        accounts: cached.accounts,
        locations: cached.locations,
        selectedLocation: selectedGoogleLocation(cached, id),
        syncedAt: cached.syncedAt,
        stale: true,
        source: 'cache',
        cacheAgeSeconds: ageSec,
        warning: 'CLIENT_THROTTLED',
        retryAfterSeconds: rl.retryAfterSeconds,
        message: isTr
          ? `Çok sık yenileme. ${rl.retryAfterSeconds} saniye sonra tekrar deneyin. (Son güncel veriler gösteriliyor.)`
          : `Too many refresh requests. Try again in ${rl.retryAfterSeconds}s. (Showing last synced data.)`,
      });
    }
    return ApiErrors.tooManyRequests(
      isTr
        ? `Çok sık yenileme. ${rl.retryAfterSeconds} saniye sonra tekrar deneyin.`
        : `Too many refresh requests. Try again in ${rl.retryAfterSeconds}s.`,
      'CLIENT_THROTTLED',
      rl.retryAfterSeconds,
    );
  }

  try {
    const fresh = await fetchGoogleBusinessLocations(integration);
    await prisma.googleIntegration.update({
      where: { id: integration.id },
      data: { locationsJson: fresh as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      accounts: fresh.accounts,
      locations: fresh.locations,
      selectedLocation: selectedGoogleLocation(fresh, id),
      syncedAt: fresh.syncedAt,
      stale: false,
      source: 'google',
      cacheAgeSeconds: 0,
    });
  } catch (error) {
    if (error instanceof GoogleBusinessApiError) {
      if (error.code === 'GOOGLE_RATE_LIMITED') {
        // (3) Google API quota tükendiyse, cache varsa stale data + warning
        // ile graceful degrade et. Cache yoksa da hard 429 yerine 200 +
        // boş array + warning dön — UI sarı banner + auto-retry countdown
        // ile recover etsin (kırmızı error yerine).
        // CLAUDE.md §40.1 — graceful degrade, sessiz fail yerine
        // explicit warning + retry-after.
        const retryAfter = error.retryAfterSeconds ?? 60;
        const hasCache = cached.locations.length > 0 || cached.accounts.length > 0;
        return NextResponse.json(
          {
            accounts: cached.accounts,
            locations: cached.locations,
            selectedLocation: selectedGoogleLocation(cached, id),
            syncedAt: cached.syncedAt,
            stale: true,
            source: hasCache ? 'cache' : 'empty',
            cacheAgeSeconds: ageSec,
            warning: 'GOOGLE_RATE_LIMITED',
            retryAfterSeconds: retryAfter,
            message: isTr
              ? (hasCache
                ? `Google API kotası doldu. ${retryAfter} saniye sonra otomatik tekrar denenecek. (Son güncel veriler gösteriliyor.)`
                : `Google API kotası doldu. ${retryAfter} saniye sonra otomatik tekrar denenecek.`)
              : (hasCache
                ? `Google API quota exhausted. Auto-retry in ${retryAfter}s. (Showing last synced data.)`
                : `Google API quota exhausted. Auto-retry in ${retryAfter}s.`),
          },
          { status: 200 },
        );
      }
      if (error.requiresReauth) {
        return NextResponse.json(
          {
            error: isTr
              ? 'Google bağlantısı süresi doldu. Hesabı yeniden bağlayın.'
              : 'Google connection expired. Reconnect the account.',
            code: 'GOOGLE_REAUTH_REQUIRED',
            requiresReauth: true,
          },
          { status: 401 },
        );
      }
      return NextResponse.json(
        {
          error: isTr
            ? 'Google işletme konumları alınamadı.'
            : 'Failed to fetch Google business locations.',
          code: error.code,
        },
        { status: 502 },
      );
    }
    console.error('[google business locations] failed', { restaurantId: id });
    return ApiErrors.internalError(
      isTr ? 'Google işletme konumları çekilemedi.' : 'Failed to fetch Google business locations.',
    );
  }
}
