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
  googleFailureMessage,
  type GoogleLocationsCache,
} from '@/lib/google-business';
import {
  clearBusinessApiNotProvisioned,
  markBusinessApiNotProvisioned,
} from '@/lib/google-business-availability';
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
//   2. Negative cache (EMPTY_CACHE_FRESH_SECONDS): cache boş (accounts:[])
//      durumunda DA TTL respect et. Aksi halde yeni-connect veya quota
//      fail sonrası "boş cache" sürekli reject edilip her sayfa
//      yenilemede yeni Google çağrısı başlatılıyor → quota burn loop.
//      §38.207 auto-retry self-loop fix'i bunu kısmen kapatıyordu ama
//      restaurant switch / sayfa yenileme flag'i reset edip yeniden
//      başlatıyordu. Negative cache kalıcı olarak kapatır.
//   3. force=true query param: kullanıcı bilinçli "yenile" butonuna basarsa
//      cache'i bypass eder ve Google'ı çağırır.
//   4. Per-restaurant rate limit: 3 force-refresh/dakika — rapid click
//      veya bot ile quota burn'ünü kısıtlar (eski 6/dk yeterli değildi).
//   5. 429 + empty cache: hard 429 yerine 200 + warning + boş array dön —
//      UI sarı banner + auto-retry countdown göstersin (kırmızı error
//      yerine).
//
// Math (§38.209):
//   - Google quota window: 60s (1 req/min/proje)
//   - CACHE_FRESH_SECONDS = 120s: dakikada birden fazla owner cache miss
//     olsa bile bir tanesi başarılı fetch yapıp cache yazar, diğerleri
//     2 dakika boyunca cache hit. Hot path quota maliyeti: %75 azalır.
//   - EMPTY_CACHE_FRESH_SECONDS = 90s: quota fail sonrası boş cache 90s
//     korunur (Google quota window'u + 30s buffer). Owner bu pencerede
//     sayfa yenilese de Google'a tekrar gitmez, mevcut empty state
//     gösterilir. 90s sonra ya cache stale olur ya owner manuel force
//     refresh yapar — her halükarda quota burn döngüsü kırılır.
const CACHE_FRESH_SECONDS = 120;
const EMPTY_CACHE_FRESH_SECONDS = 90;

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

  // (1) TTL fast-path: force=false + cache taze ise Google'a hiç gitme.
  // CLAUDE.md §38.209 — Cache TTL artık 2 katmanlı:
  //   - Positive cache (accounts mevcut): CACHE_FRESH_SECONDS = 120s
  //   - Negative cache (accounts:[] — yeni connect veya quota fail
  //     sonrası empty): EMPTY_CACHE_FRESH_SECONDS = 90s
  // Eski davranışta `accounts.length > 0` ZORUNLU idi → boş cache HİÇ
  // kullanılmıyordu → her sayfa yenileme/restaurant switch Google'a
  // gidiyordu → quota burn loop. Negative cache bu loop'u kırar:
  // owner gerçekten Business Profile yoksa veya quota fail empty
  // döndürdüyse, 90s boyunca sessiz tutulur. 90s sonra ya owner manuel
  // force refresh yapar ya cache stale olur — her halükarda yeni Google
  // çağrısı bilinçli aksiyona bağlanır.
  const hasAccounts = cached.accounts.length > 0;
  const effectiveTtl = hasAccounts ? CACHE_FRESH_SECONDS : EMPTY_CACHE_FRESH_SECONDS;
  const canServeFromCache =
    !force &&
    ageSec !== null &&
    ageSec < effectiveTtl;

  if (canServeFromCache) {
    return NextResponse.json({
      accounts: cached.accounts,
      locations: cached.locations,
      selectedLocation: selectedGoogleLocation(cached, id),
      syncedAt: cached.syncedAt,
      stale: false,
      source: hasAccounts ? 'cache' : 'empty',
      cacheAgeSeconds: ageSec,
    });
  }

  // (2) Rate limit: force refresh kotayı tüketir. Per-restaurant 3/dakika.
  // §38.209 — Eski 6/dk Google'ın 1 req/min/proje quota'sına göre
  // gevşekti. Manuel "Yenile" butonuna 3 kere basabilen yeter; bot/spam
  // koruması için yeterli, gerçek owner intent'ini engellemiyor.
  const rl = await rateLimit(`google-locations:${id}`, 3, 60_000);
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
          ? `Çok sık yenilendi. ${rl.retryAfterSeconds} saniye sonra tekrar dene. Son alınan bilgiler gösteriliyor.`
          : `Refreshed too often. Try again in ${rl.retryAfterSeconds}s. Showing the last synced data.`,
      });
    }
    return ApiErrors.tooManyRequests(
      isTr
        ? `Çok sık yenilendi. ${rl.retryAfterSeconds} saniye sonra tekrar dene.`
        : `Refreshed too often. Try again in ${rl.retryAfterSeconds}s.`,
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

    // A fresh (non-cached) sync that returned at least one account proves the
    // Business Profile API is usable: lift the platform-level "not available
    // yet" stamp. Throttled + best effort inside the helper.
    if (fresh.accounts.length > 0) {
      await clearBusinessApiNotProvisioned(id);
    }

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
      if (error.code === 'GOOGLE_RATE_LIMITED' || error.code === 'GOOGLE_API_NOT_PROVISIONED') {
        // (3) Google API quota tükendi → graceful degrade.
        //
        // §38.211 — Auto-retry KALDIRILDI (anti-pattern for shared quota).
        // Google quota proje-geneli (1 req/min, §5.1.1): TÜM Buaze
        // kullanıcıları aynı kotayı paylaşır. Auto-retry her client'ın
        // retry'ı quota'yı tekrar tüketir → hep birlikte 429 alırlar →
        // sonsuz döngü. §38.209 cache TTL + negative cache + exponential
        // backoff yumuşatıcıydı ama temel sorunu çözmüyordu çünkü:
        //   - Owner ilk connect = cache yok → quota dolu → empty stamp
        //   - 60s sonra auto-retry force=true → cache bypass → Google'a
        //     tekrar git → quota hâlâ dolu (başka client'lar da retry'da)
        //     → 60s countdown tekrar başlar → loop.
        //
        // Manuel intervention only paterni (best practice for shared API
        // quotas): countdown yok, auto-retry yok. Owner sandwich card
        // (§38.208) ile "Farklı hesapla bağlan" alternatifini görür veya
        // manuel "Yenile" butonu (UI side 60s cooldown). Response:
        //   - `retryAfterSeconds` GÖNDERILMEZ → frontend countdown
        //     başlatmaz (eski semantic kırılır, yeni davranış: hiç
        //     countdown yok)
        //   - `warning: 'GOOGLE_RATE_LIMITED'` mevcut (UI sarı banner
        //     informational)
        //   - Mesaj rewrite: "auto-retry" wording çıkarıldı, owner-
        //     actionable: "Birkaç dakika bekleyin veya farklı hesapla
        //     bağlanın"
        //
        // Empty stamp write korunur (§38.209 negative cache 90s pencere
        // intact) — sayfa refresh / restaurant switch'te Google'a
        // gitmemek için.
        // §38.231 — quota=0 (provision edilmemiş) durumu geçici rate
        // limit'ten ayrı işlenir: owner'a "farklı hesap dene" YANILTICI
        // (quota proje-geneli, hesap değiştirmek çözmez).
        const notProvisioned = error.code === 'GOOGLE_API_NOT_PROVISIONED';
        // Platform-level signal: quota 0 hits every owner, so remember
        // it and stop offering the sign-in button until it clears or expires.
        if (notProvisioned) await markBusinessApiNotProvisioned();
        const hasCache = cached.locations.length > 0 || cached.accounts.length > 0;
        if (!hasCache) {
          // İlk quota fail — empty stamp yaz ki sonraki request'ler
          // negative cache hit yapsın. Sadece syncedAt'i refresh et;
          // accounts/locations zaten boş.
          const emptyStampedCache: GoogleLocationsCache = {
            ...cached,
            syncedAt: new Date().toISOString(),
          };
          await prisma.googleIntegration
            .update({
              where: { id: integration.id },
              data: { locationsJson: emptyStampedCache as unknown as Prisma.InputJsonValue },
            })
            .catch(() => {
              // DB write fail Google quota response'unu bloklamasın.
              // Sonraki request yine quota dolu görünürse warning döner.
            });
        }
        return NextResponse.json(
          {
            accounts: cached.accounts,
            locations: cached.locations,
            selectedLocation: selectedGoogleLocation(cached, id),
            syncedAt: hasCache ? cached.syncedAt : new Date().toISOString(),
            stale: true,
            source: hasCache ? 'cache' : 'empty',
            cacheAgeSeconds: hasCache ? ageSec : 0,
            warning: error.code,
            // §38.211 — retryAfterSeconds intentionally omitted; frontend
            // would start a countdown + auto-retry which burns the
            // project-wide quota for everyone.
            // §38.231 — notProvisioned (quota=0) KALICI durum: "farklı
            // hesap dene" yanıltıcı (quota proje-geneli). Owner'a doğru
            // bağlı olduğunu + ek işlem gerekmediğini söyle.
            message: notProvisioned
              ? googleFailureMessage('GOOGLE_API_NOT_PROVISIONED', locale)
              : isTr
              ? (hasCache
                ? 'Google şu an yoğun. Son alınan bilgiler gösteriliyor; birkaç dakika sonra “Yenile”yi dene.'
                : 'Google şu an yoğun. Birkaç dakika sonra tekrar dene.')
              : (hasCache
                ? 'Google is busy right now. Showing the last synced data; try “Refresh” in a few minutes.'
                : 'Google is busy right now. Please try again in a few minutes.'),
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
