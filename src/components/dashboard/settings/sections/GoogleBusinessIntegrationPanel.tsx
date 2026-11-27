"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import { AlertBanner } from "@/components/ui";
import { GoogleConnectFlashBanner } from "@/components/dashboard/google/GoogleConnectFlashBanner";
import { PlacesBusinessPicker } from "@/components/dashboard/google/PlacesBusinessPicker";
import { ownerBodyMessage, type PlacesPickerRestaurant } from "@/components/dashboard/google/places-client";
import { ownerGoogleMessage } from "@/lib/google-owner-copy";
import { resolveRestaurantPlaceId } from "@/lib/google-places";
import { PlatformCard } from "@/components/dashboard/platforms/PlatformCard";

interface RestaurantData {
  id: string;
  name?: string;
  category?: string;
  address?: string | null;
  city?: string | null;
  googlePlaceId?: string | null;
  googleReviewUrl?: string | null;
}

interface GoogleBusinessIntegrationPanelProps {
  restaurant: RestaurantData;
  locale: "tr" | "en";
  dirty: boolean;
  returnTo?: string;
  /**
   * Owner panels pass the Google Reviews page here: once the business is
   * matched, a link points to its rating / profile check. Omitted by the admin
   * hub (an owner URL means nothing there).
   */
  profileHref?: string | null;
  onGoogleLinkSelected: (next: {
    googlePlaceId: string | null;
    googleReviewUrl: string | null;
    googleEnabled: boolean;
  }) => void;
}

interface GoogleStatus {
  googleReviewManagementEnabled: boolean;
  placesConfigured: boolean;
  oauthConfigured: boolean;
  connected: boolean;
  selectedLocation: GoogleLocation | null;
  syncedAt: string | null;
}

// Locations endpoint'inin döndürdüğü cache metadata. Backend
// "source: cache | google | empty" + cacheAgeSeconds + warning ile
// nereden geldiğini bildirir; UI bu bilgiye göre rozet (cached) ve
// auto-retry davranışı uygular (CLAUDE.md §5.1 quota strategy).
type LocationSource = 'cache' | 'google' | 'empty';

function formatRelativeTime(syncedAt: string | null, isTr: boolean): string | null {
  if (!syncedAt) return null;
  const ts = Date.parse(syncedAt);
  if (!Number.isFinite(ts)) return null;
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return isTr ? 'az önce' : 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return isTr ? `${min} dk önce` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isTr ? `${hr} sa önce` : `${hr} h ago`;
  const days = Math.floor(hr / 24);
  return isTr ? `${days} gün önce` : `${days}d ago`;
}

interface GoogleLocation {
  accountName: string;
  accountId: string;
  locationName: string;
  locationId: string;
  title: string;
  address: string | null;
  placeId: string | null;
  mapsUri: string | null;
  newReviewUri: string | null;
}

export function GoogleBusinessIntegrationPanel({
  restaurant,
  locale,
  dirty,
  returnTo,
  profileHref = null,
  onGoogleLinkSelected,
}: GoogleBusinessIntegrationPanelProps) {
  const isTr = locale === "tr";
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  // 429 GOOGLE_RATE_LIMITED durumunda backend stale cache + warning döner;
  // bu durumda error değil sarı uyarı + retry-after countdown göster.
  const [locationsNotice, setLocationsNotice] = useState<string | null>(null);
  const [locationsRetryAfter, setLocationsRetryAfter] = useState<number | null>(null);
  // §38.238 — Google Cloud kotası 0 (API provision edilmemiş). Geçici
  // rate-limit'ten ayrı tutulur: kalıcı, owner tarafında yapılacak bir şey yok.
  const [apiNotProvisioned, setApiNotProvisioned] = useState(false);
  // Backend cache mı yoksa fresh Google API mı? Owner'a sync rozet ile
  // göster (CLAUDE.md §5.1 quota strategy — kullanıcı kaybolan kontrol
  // hissini "Son sync: 2 dk önce" rozetiyle geri kazansın).
  const [locationsSource, setLocationsSource] = useState<LocationSource | null>(null);
  // Auto-retry guard: backend "X saniye sonra" diyince countdown 0'a
  // gelince tek seferlik otomatik refresh tetiklensin. Sonsuz loop'tan
  // korunmak için tek-seferlik flag tutulur.

  // 429 retry-after countdown: backend "X saniye sonra yenile" diyince
  // butonu disabled tut + her saniye azaltarak görsel feedback ver.
  // Countdown 0'a ulaşınca tek-seferlik auto-retry tetikle (kullanıcı
  // sayfada bekliyorsa elle tekrar tıklamasın). CLAUDE.md §5.1.
  useEffect(() => {
    if (locationsRetryAfter === null || locationsRetryAfter <= 0) return;
    const interval = setInterval(() => {
      setLocationsRetryAfter((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          // §38.238 — NO auto-retry here. This countdown is a UI cooldown for
          // the "Konumları yenile" button only.
          //
          // The previous version fired `loadLocations(true)` when the counter
          // hit zero, guarded by a one-shot ref — but `loadLocations` itself
          // reset that ref on entry, so the retry re-armed the guard it was
          // supposed to consume: quota fail → 60s countdown → forced refresh →
          // quota still full → countdown → forever. A settings tab left open
          // became a self-driving force-refresh poller against Google's
          // PROJECT-WIDE quota (1 accounts.list/min shared by every Buaze
          // user), so one idle tab could starve everyone else.
          //
          // Same anti-pattern, same resolution as CLAUDE.md §38.211 on the
          // google-reviews page: on a shared quota, retries are cooperative
          // only in theory — manual intervention only.
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locationsRetryAfter]);

  const pickerRestaurant = useMemo<PlacesPickerRestaurant>(
    () => ({
      id: restaurant.id,
      name: restaurant.name ?? "",
      city: restaurant.city ?? null,
      address: restaurant.address ?? null,
      googlePlaceId: restaurant.googlePlaceId ?? null,
      googleReviewUrl: restaurant.googleReviewUrl ?? null,
    }),
    [
      restaurant.id,
      restaurant.name,
      restaurant.city,
      restaurant.address,
      restaurant.googlePlaceId,
      restaurant.googleReviewUrl,
    ],
  );
  const linked = resolveRestaurantPlaceId(pickerRestaurant) !== null;

  const selectedLocation = status?.selectedLocation ?? null;
  const reviewManagementEnabled = status?.googleReviewManagementEnabled === true;

  const loadStatus = async () => {
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/business/status`);
      const data = await res.json();
      if (!res.ok) throw new Error("status");
      setStatus(data);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    void loadStatus();
    // loadStatus is a stable closure capturing restaurant.id; restaurant.id
    // change is the only intentional re-fetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const connectGoogle = async () => {
    const callbackTarget = returnTo ?? `/${locale}/dashboard/platforms?restaurantId=${restaurant.id}`;
    try {
      const res = await fetch("/api/integrations/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: callbackTarget }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        // The route's `message` is operator wording (it used to name the
        // missing configuration); the owner only ever sees mapped copy.
        setLocationsError(ownerBodyMessage(data, locale, "token-error"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setLocationsError(ownerGoogleMessage("token-error", locale));
    }
  };

  // `force=true` sadece kullanıcı bilinçli "Konumları yenile" butonuna
  // basınca gönderilir. İlk mount + status remount cache'i kullanır →
  // proje-geneli Google quota'sı korunur (CLAUDE.md §5.1).
  const loadLocations = async (force = false) => {
    setLocationsLoading(true);
    setLocationsError(null);
    setLocationsNotice(null);
    setLocationsRetryAfter(null);
    setApiNotProvisioned(false);
    try {
      const url = `/api/restaurants/${restaurant.id}/google/business/locations${
        force ? '?force=true' : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      // 429 / throttle fallback path: backend status 200 + stale cache +
      // warning döner. UI sarı banner gösterir (auto-retry YOK, §38.238).
      //
      // §38.238 — `GOOGLE_API_NOT_PROVISIONED` buraya eklendi. Stage 151
      // (§38.231) bu warning'i backend'e ve google-reviews sayfasına
      // eklemişti ama Platform Bağlantıları paneli yalnız RATE_LIMITED /
      // CLIENT_THROTTLED kontrol ediyordu. Sonuç: Google Cloud projesinde
      // "My Business Account Management API" kotası 0 olduğunda (API henüz
      // provision edilmemiş) backend 200 + boş accounts + bu warning
      // dönüyor, panel ise generic başarı dalına düşüp AÇIKLAMASIZ BOŞ bir
      // konum listesi çiziyordu. Owner "Google'a bağlandım ama işletmem
      // çıkmıyor" diyordu — tam olarak kullanıcının bildirdiği durum.
      if (
        res.ok &&
        (data?.warning === 'GOOGLE_RATE_LIMITED' ||
          data?.warning === 'GOOGLE_API_NOT_PROVISIONED' ||
          data?.warning === 'CLIENT_THROTTLED')
      ) {
        // quota=0 KALICI bir durum: beklemek düzeltmez, farklı hesap da
        // düzeltmez (kota proje-geneli). Geri sayım göstermek yanlış sinyal.
        const notProvisioned = data.warning === 'GOOGLE_API_NOT_PROVISIONED';
        setApiNotProvisioned(notProvisioned);
        setLocations(data.locations ?? []);
        setLocationsSource(data.source ?? null);
        // Mapped by the machine `warning`: the route's own `message` is never shown.
        setLocationsNotice(ownerGoogleMessage(data.warning, locale));
        const retryAfter = notProvisioned
          ? null
          : typeof data.retryAfterSeconds === 'number'
            ? data.retryAfterSeconds
            : null;
        setLocationsRetryAfter(retryAfter);
        setStatus((prev) => ({
          googleReviewManagementEnabled: prev?.googleReviewManagementEnabled ?? true,
          placesConfigured: prev?.placesConfigured ?? true,
          oauthConfigured: prev?.oauthConfigured ?? true,
          connected: true,
          selectedLocation: data.selectedLocation ?? prev?.selectedLocation ?? null,
          syncedAt: data.syncedAt ?? prev?.syncedAt ?? null,
        }));
        return;
      }
      if (!res.ok) {
        // 429 ama cache de yok → backend gerçek 429 döner; retry-after parse et.
        if (res.status === 429) {
          const retryHeader = res.headers.get('retry-after');
          const retryAfter = retryHeader ? Number(retryHeader) : null;
          setLocationsError(ownerBodyMessage(data, locale, 'CLIENT_THROTTLED'));
          setLocationsRetryAfter(retryAfter !== null && Number.isFinite(retryAfter) ? retryAfter : null);
          return;
        }
        setLocationsError(
          ownerBodyMessage(
            data,
            locale,
            res.status >= 500 ? 'GOOGLE_API_ERROR' : undefined,
          ),
        );
        return;
      }
      setLocations(data.locations ?? []);
      setLocationsSource(data.source ?? null);
      setStatus((prev) => ({
        googleReviewManagementEnabled: prev?.googleReviewManagementEnabled ?? true,
        placesConfigured: prev?.placesConfigured ?? true,
        oauthConfigured: prev?.oauthConfigured ?? true,
        connected: true,
        selectedLocation: data.selectedLocation ?? prev?.selectedLocation ?? null,
        syncedAt: data.syncedAt ?? prev?.syncedAt ?? null,
      }));
    } catch {
      setLocationsError(ownerGoogleMessage('GOOGLE_NETWORK_ERROR', locale));
    } finally {
      setLocationsLoading(false);
    }
  };

  const selectLocation = async (location: GoogleLocation) => {
    setLocationsError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/business/locations/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: location.accountName,
          locationName: location.locationName,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLocationsError(ownerBodyMessage(data, locale));
        return;
      }
      setStatus((prev) => ({
        googleReviewManagementEnabled: prev?.googleReviewManagementEnabled ?? true,
        placesConfigured: prev?.placesConfigured ?? true,
        oauthConfigured: prev?.oauthConfigured ?? true,
        connected: true,
        selectedLocation: data?.selectedLocation ?? null,
        syncedAt: prev?.syncedAt ?? null,
      }));
      onGoogleLinkSelected({
        googlePlaceId: data?.restaurant?.googlePlaceId ?? location.placeId,
        googleReviewUrl: data?.restaurant?.googleReviewUrl ?? location.newReviewUri,
        googleEnabled: true,
      });
    } catch {
      setLocationsError(ownerGoogleMessage(null, locale));
    }
  };



  const disconnectGoogle = async () => {
    setLocationsError(null);
    try {
      const res = await fetch(`/api/integrations/google/disconnect`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLocationsError(ownerBodyMessage(data, locale));
        return;
      }
      setStatus((prev) => prev ? ({
        ...prev,
        connected: false,
        selectedLocation: null,
      }) : null);
      setLocations([]);
    } catch {
      setLocationsError(ownerGoogleMessage(null, locale));
    }
  };

  return (
    <PlatformCard
      titleId={`google-business-${restaurant.id}`}
      icon={<MessageSquareText size={18} />}
      title={isTr ? "Google işletme bağlantısı" : "Google Business connection"}
      description={
        isTr
          ? "İşletmeyi Google'da bul, yorum linkini otomatik üret ve Google İşletme Profili bağlıysa gelen Google yorumlarını yönet."
          : "Find the business on Google, generate the review link, and manage Google reviews when Business Profile is connected."
      }
    >
      <div className="space-y-5">
        {/* §38 audit Fix #1 — Platform Bağlantıları sekmesi de callback
            returnTo'su; callback success/failure'i burada da görünür. */}
        <GoogleConnectFlashBanner locale={locale} />

        <div>
          <PlacesBusinessPicker
            restaurant={pickerRestaurant}
            restaurants={[pickerRestaurant]}
            locale={locale}
            dirty={dirty}
            // Settings / platform / admin pages never start a billed search on
            // their own — only the Google Reviews page does.
            autoSearch={false}
            onSelected={(placeId, _name, result) =>
              onGoogleLinkSelected({
                googlePlaceId: result.restaurant?.googlePlaceId ?? placeId,
                googleReviewUrl: result.restaurant?.googleReviewUrl ?? null,
                googleEnabled: true,
              })
            }
          />
          {profileHref && linked && (
            <Link
              href={profileHref}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full text-[14px] font-medium text-pn-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
            >
              {isTr ? "Puanını ve profil eksiklerini gör" : "See your rating and profile gaps"}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className="border-t border-pn-line pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[16px] font-medium leading-6 text-pn-ink">
                {isTr ? "Google İşletme Profili yorumları" : "Google Business Profile reviews"}
              </div>
              <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-[#737373]">
                {isTr
                  ? "Yorumları çekmek ve cevap yazmak için işletmenin Google hesabıyla bağlanması gerekir. Hesap, ilgili Google İşletme Profili konumunda sahip veya yönetici olmalı."
                  : "Fetching and replying to reviews requires connecting the business Google account. The account must be an owner or manager of the selected Business Profile location."}
              </p>
            </div>
            {reviewManagementEnabled && status?.connected ? (
              <span className="inline-flex h-7 shrink-0 items-center gap-1.5 self-start rounded-full bg-[#E6F7EA] px-3 text-[12px] font-medium text-[#1F7A35]">
                <CheckCircle2 size={13} aria-hidden="true" />
                {isTr ? "Bağlı" : "Connected"}
              </span>
            ) : null}
          </div>

          {status && !reviewManagementEnabled && (
            <div className="mt-4">
              <AlertBanner kind="warn">
                {isTr
                  ? `${ownerGoogleMessage("reply_plan_off", locale)} İşletmeni Google'da bulma ve yorum linki çalışmaya devam eder; yorumları okuma, Pulse AI ile yanıt hazırlama ve Google'a yanıt gönderme açılana kadar pasif kalır.`
                  : `${ownerGoogleMessage("reply_plan_off", locale)} Finding your business on Google and the review link keep working; reading reviews, Pulse AI drafts and sending replies to Google stay inactive until it is enabled.`}
              </AlertBanner>
            </div>
          )}

          {reviewManagementEnabled && !status?.oauthConfigured && (
            <div className="mt-4">
              <AlertBanner kind="warn">
                {ownerGoogleMessage("reply_feature_off", locale)}
              </AlertBanner>
            </div>
          )}

          {reviewManagementEnabled && status?.oauthConfigured && !status.connected && (
            <button
              type="button"
              className="bz-btn-primary mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[14px] sm:w-auto"
              onClick={connectGoogle}
            >
              <ExternalLink size={15} />
              {isTr ? "Google hesabını bağla" : "Connect Google account"}
            </button>
          )}

          {reviewManagementEnabled && status?.connected && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 rounded-[18px] bg-pn-canvas p-3 pl-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink max-sm:bg-[#F6F6F6]"
                  >
                    <MapPin size={17} />
                  </span>
                  <div className="min-w-0 text-[14px] text-[#525252]">
                    {selectedLocation
                      ? `${isTr ? "Seçili konum:" : "Selected location:"} ${selectedLocation.title}`
                      : isTr
                        ? "Henüz Google İşletme Profili konumu seçilmedi."
                        : "No Google Business location selected yet."}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="bz-btn-danger inline-flex min-h-[44px] items-center justify-center text-[14px]"
                    onClick={disconnectGoogle}
                  >
                    {isTr ? "Bağlantıyı kes" : "Disconnect"}
                  </button>
                  <button
                    type="button"
                    // White on the grey strip (desktop), grey on the white one (phones).
                    className="bz-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-1.5 bg-white text-[14px] hover:bg-[#EDEDED] max-sm:bg-[#F6F6F6]!"
                    onClick={() => loadLocations(true)}
                    disabled={locationsLoading || (locationsRetryAfter !== null && locationsRetryAfter > 0)}
                    title={
                      status?.syncedAt
                        ? `${isTr ? 'Son senkron' : 'Last sync'}: ${formatRelativeTime(status.syncedAt, isTr)}`
                        : undefined
                    }
                  >
                    {locationsLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    {locationsRetryAfter !== null && locationsRetryAfter > 0
                      ? `${locationsRetryAfter}s`
                      : isTr
                        ? "Konumları yenile"
                        : "Refresh locations"}
                  </button>
                </div>
              </div>

              {locationsError && <AlertBanner kind="danger">{locationsError}</AlertBanner>}
              {locationsNotice && !locationsError && (
                // §38.238 — quota=0 kalıcı bir yapılandırma durumu, owner'ın
                // düzeltebileceği bir uyarı değil: sarı "warn" yerine nötr
                // "info" ton. Geçici kota/throttle warn olarak kalır.
                <AlertBanner
                  kind={apiNotProvisioned ? 'info' : 'warn'}
                  onDismiss={() => setLocationsNotice(null)}
                >
                  {locationsNotice}
                </AlertBanner>
              )}

              {/* §38.238 — boş konum listesi için açık bir empty state.
                  Önceden hem sync satırı hem grid `locations.length > 0`
                  koşuluna bağlıydı ve 0 konumda hiçbir şey render
                  edilmiyordu: owner Google'a bağlanıyor, ekranda hiçbir
                  şey görmüyor ve neden olduğunu anlayamıyordu. */}
              {!locationsLoading && locations.length === 0 && !locationsError && (
                <div className="rounded-[18px] bg-pn-canvas px-4 py-6 text-center">
                  <p className="text-[15px] font-medium text-pn-ink">
                    {isTr ? 'Konum bulunamadı' : 'No locations found'}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-[460px] text-[13px] leading-[1.6] text-[#737373]">
                    {apiNotProvisioned
                      ? ownerGoogleMessage('reply_connected_not_provisioned', locale)
                      : isTr
                        ? 'Bu Google hesabında yönettiğin bir İşletme Profili görünmüyor. İşletmen farklı bir Google hesabında olabilir; o hesapla bağlanmayı dene.'
                        : "We can't see a Business Profile you manage on this Google account. Your business may live on a different Google account; try connecting with that one."}
                  </p>
                </div>
              )}

              {locations.length > 0 && status?.syncedAt && (
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#737373]">
                  {isTr ? 'Son senkron' : 'Last sync'}: {formatRelativeTime(status.syncedAt, isTr)}
                  {locationsSource === 'cache' && (
                    <span className="inline-flex h-6 items-center rounded-full bg-pn-canvas px-2.5 text-[12px] font-medium text-[#525252]">
                      {isTr ? 'Önbellek' : 'Cached'}
                    </span>
                  )}
                </div>
              )}

              {locations.length > 0 && (
                <div className="grid gap-2">
                  {locations.map((location) => (
                    <button
                      type="button"
                      key={`${location.accountName}:${location.locationName}`}
                      onClick={() => selectLocation(location)}
                      className="group flex min-h-[60px] items-center gap-3 rounded-[16px] bg-pn-canvas p-3 text-left transition-colors duration-200 hover:bg-[#EDEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink max-sm:bg-[#F6F6F6]"
                      >
                        <MapPin size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-pn-ink">{location.title}</span>
                        {location.address && (
                          <span className="mt-0.5 block text-[13px] text-[#666666]">{location.address}</span>
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink transition-colors group-hover:bg-pn-accent group-hover:text-white max-sm:bg-[#F6F6F6]"
                      >
                        <ArrowUpRight size={17} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedLocation && (
                <div className="flex flex-col gap-3 rounded-[18px] bg-pn-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-[600px] text-[13px] leading-[1.55] text-[#000000]">
                    {isTr
                      ? "Google Business Profile hesabınızdaki yorumları okumak, AI ile yanıt taslağı oluşturmak ve doğrudan Google üzerinden yanıtlamak için yeni Google Yorumları sayfasına gidebilirsiniz."
                      : "You can go to the new Google Reviews page to read reviews, generate AI reply drafts, and publish replies directly to Google."}
                  </p>
                  <a
                    href={`/${locale}/dashboard/google-reviews?restaurantId=${restaurant.id}`}
                    className="bz-btn-primary inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 text-[14px]"
                  >
                    <ExternalLink size={15} />
                    {isTr ? "Google Yorumlarına Git" : "Go to Google Reviews"}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PlatformCard>
  );
}

export default GoogleBusinessIntegrationPanel;
