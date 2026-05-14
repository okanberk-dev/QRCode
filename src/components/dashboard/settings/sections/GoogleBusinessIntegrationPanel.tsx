"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
} from "lucide-react";
import { AlertBanner, Field } from "@/components/ui";
import { SettingsCard } from "../SettingsCard";

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

interface GooglePlace {
  placeId: string;
  displayName: string;
  formattedAddress: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
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

function defaultQuery(restaurant: RestaurantData): string {
  return [restaurant.name, restaurant.address, restaurant.city]
    .filter((item): item is string => Boolean(item && item.trim()))
    .join(" ");
}

export function GoogleBusinessIntegrationPanel({
  restaurant,
  locale,
  dirty,
  returnTo,
  onGoogleLinkSelected,
}: GoogleBusinessIntegrationPanelProps) {
  const isTr = locale === "tr";
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [query, setQuery] = useState(() => defaultQuery(restaurant));
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  // 429 GOOGLE_RATE_LIMITED durumunda backend stale cache + warning döner;
  // bu durumda error değil sarı uyarı + retry-after countdown göster.
  const [locationsNotice, setLocationsNotice] = useState<string | null>(null);
  const [locationsRetryAfter, setLocationsRetryAfter] = useState<number | null>(null);
  // Backend cache mı yoksa fresh Google API mı? Owner'a sync rozet ile
  // göster (CLAUDE.md §5.1 quota strategy — kullanıcı kaybolan kontrol
  // hissini "Son sync: 2 dk önce" rozetiyle geri kazansın).
  const [locationsSource, setLocationsSource] = useState<LocationSource | null>(null);
  // Auto-retry guard: backend "X saniye sonra" diyince countdown 0'a
  // gelince tek seferlik otomatik refresh tetiklensin. Sonsuz loop'tan
  // korunmak için tek-seferlik flag tutulur.
  const autoRetryFiredRef = useRef(false);

  useEffect(() => {
    setQuery(defaultQuery(restaurant));
    // We intentionally read individual restaurant fields rather than the whole
    // object — this avoids re-running on unrelated restaurant prop mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id, restaurant.name, restaurant.address, restaurant.city]);

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
          // Auto-retry once: countdown sıfıra inerken, sarı banner görünen
          // bir kullanıcı için butona basmadan tek otomatik tazeleme.
          // autoRetryFiredRef sonsuz loop'tan korur.
          if (!autoRetryFiredRef.current && status?.connected) {
            autoRetryFiredRef.current = true;
            void loadLocations(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // loadLocations stable closure; status.connected sadece read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsRetryAfter]);

  const selectedLocation = status?.selectedLocation ?? null;
  const reviewManagementEnabled = status?.googleReviewManagementEnabled === true;

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/business/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google durumu alınamadı.");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
    // loadStatus is a stable closure capturing restaurant.id; restaurant.id
    // change is the only intentional re-fetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const searchPlaces = async () => {
    if (dirty) {
      setPlacesError(isTr ? "Önce alttaki değişiklikleri kaydet." : "Save changes first.");
      return;
    }
    setPlacesLoading(true);
    setPlacesError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/places/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google işletme araması başarısız.");
      setPlaces(data.places ?? []);
    } catch (err) {
      setPlacesError(err instanceof Error ? err.message : "Google işletme araması başarısız.");
    } finally {
      setPlacesLoading(false);
    }
  };

  const selectPlace = async (place: GooglePlace) => {
    if (dirty) {
      setPlacesError(isTr ? "Önce alttaki değişiklikleri kaydet." : "Save changes first.");
      return;
    }
    setPlacesError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/places/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: place.placeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google işletmesi kaydedilemedi.");
      onGoogleLinkSelected({
        googlePlaceId: data.restaurant?.googlePlaceId ?? place.placeId,
        googleReviewUrl: data.restaurant?.googleReviewUrl ?? null,
        googleEnabled: true,
      });
      setPlaces([]);
    } catch (err) {
      setPlacesError(err instanceof Error ? err.message : "Google işletmesi kaydedilemedi.");
    }
  };

  const connectGoogle = async () => {
    const callbackTarget = returnTo ?? `/${locale}/dashboard/platforms?restaurantId=${restaurant.id}`;
    const res = await fetch("/api/integrations/google/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnTo: callbackTarget }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setLocationsError(data?.message || data?.error || "Google OAuth başlatılamadı.");
      return;
    }
    window.location.href = data.url;
  };

  // `force=true` sadece kullanıcı bilinçli "Konumları yenile" butonuna
  // basınca gönderilir. İlk mount + status remount cache'i kullanır →
  // proje-geneli Google quota'sı korunur (CLAUDE.md §5.1).
  const loadLocations = async (force = false) => {
    setLocationsLoading(true);
    setLocationsError(null);
    setLocationsNotice(null);
    setLocationsRetryAfter(null);
    autoRetryFiredRef.current = false;
    try {
      const url = `/api/restaurants/${restaurant.id}/google/business/locations${
        force ? '?force=true' : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      // 429 / throttle fallback path: backend status 200 + stale cache +
      // warning döner. UI sarı banner + countdown + auto-retry gösterir.
      if (res.ok && (data?.warning === 'GOOGLE_RATE_LIMITED' || data?.warning === 'CLIENT_THROTTLED')) {
        setLocations(data.locations ?? []);
        setLocationsSource(data.source ?? null);
        setLocationsNotice(
          data.message ||
            (isTr
              ? 'Google API kotası doldu. Son güncel veriler gösteriliyor; birkaç dakika sonra yenileyin.'
              : 'Google API quota exhausted. Showing last synced data; try again in a few minutes.'),
        );
        const retryAfter = typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
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
          setLocationsError(
            data?.error ||
              (retryAfter
                ? (isTr
                    ? `Google API kotası doldu. ${retryAfter} saniye sonra tekrar deneyin.`
                    : `Google API quota exhausted. Try again in ${retryAfter}s.`)
                : (isTr
                    ? 'Google API kotası doldu. Birkaç dakika sonra tekrar deneyin.'
                    : 'Google API quota exhausted. Try again in a few minutes.')),
          );
          setLocationsRetryAfter(Number.isFinite(retryAfter) ? retryAfter : null);
          return;
        }
        throw new Error(data?.error || (isTr ? 'Google konumları alınamadı.' : 'Failed to load locations.'));
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
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : (isTr ? "Google konumları alınamadı." : "Failed to load locations."));
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
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google konumu kaydedilemedi.");
      setStatus((prev) => ({
        googleReviewManagementEnabled: prev?.googleReviewManagementEnabled ?? true,
        placesConfigured: prev?.placesConfigured ?? true,
        oauthConfigured: prev?.oauthConfigured ?? true,
        connected: true,
        selectedLocation: data.selectedLocation,
        syncedAt: prev?.syncedAt ?? null,
      }));
      onGoogleLinkSelected({
        googlePlaceId: data.restaurant?.googlePlaceId ?? location.placeId,
        googleReviewUrl: data.restaurant?.googleReviewUrl ?? location.newReviewUri,
        googleEnabled: true,
      });
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : "Google konumu kaydedilemedi.");
    }
  };



  const disconnectGoogle = async () => {
    setLocationsError(null);
    try {
      const res = await fetch(`/api/integrations/google/disconnect`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Bağlantı kesilemedi.");
      setStatus((prev) => prev ? ({
        ...prev,
        connected: false,
        selectedLocation: null,
      }) : null);
      setLocations([]);
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : "Bağlantı kesilemedi.");
    }
  };

  return (
    <SettingsCard
      icon={<MessageSquareText size={18} />}
      title={isTr ? "Google işletme bağlantısı" : "Google Business connection"}
      description={
        isTr
          ? "İşletmeyi Google'da bul, yorum linkini otomatik üret ve Business Profile bağlıysa gelen Google yorumlarını yönet."
          : "Find the business on Google, generate the review link, and manage Google reviews when Business Profile is connected."
      }
    >
      <div className="space-y-5">
        {statusLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#737373]">
            <Loader2 size={14} className="animate-spin" />
            {isTr ? "Google durumu kontrol ediliyor..." : "Checking Google status..."}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <Field
              label={isTr ? "Google'da işletme ara" : "Search business on Google"}
              hint={
                status?.placesConfigured
                  ? isTr
                    ? "Ad + adres ile ara; doğru sonucu seçince yorum linki otomatik kaydedilir."
                    : "Search by name + address; selecting a result saves the review link."
                  : "GOOGLE_MAPS_API_KEY missing"
              }
            >
              <input
                className="bz-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isTr ? "Restoran adı, şehir, adres" : "Restaurant name, city, address"}
                disabled={!status?.placesConfigured}
              />
            </Field>
            <button
              type="button"
              className="bz-btn-primary inline-flex items-center justify-center gap-1.5 rounded-full text-[13px]"
              style={{ minHeight: 42 }}
              onClick={searchPlaces}
              disabled={!status?.placesConfigured || placesLoading || query.trim().length < 2 || dirty}
            >
              {placesLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {isTr ? "Ara" : "Search"}
            </button>
          </div>
          {dirty && (
            <p className="mt-2 text-[12px] text-[#92400E]">
              {isTr ? "Google seçimi yapmadan önce alttaki değişiklikleri kaydet." : "Save the changes below before selecting a Google result."}
            </p>
          )}
          {placesError && <div className="mt-3"><AlertBanner kind="danger">{placesError}</AlertBanner></div>}
          {places.length > 0 && (
            <div className="mt-4 space-y-2">
              {places.map((place) => (
                <div
                  key={place.placeId}
                  className="flex flex-col gap-3 rounded-xl border border-[#EDEDED] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="bz-h-tight text-[14px]">{place.displayName}</div>
                    <div className="mt-1 text-[12px] text-[#737373]">{place.formattedAddress}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {place.googleMapsUri && (
                      <a
                        href={place.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bz-btn-ghost inline-flex items-center gap-1.5 rounded-full text-[12px]"
                      >
                        <ExternalLink size={13} />
                        Maps
                      </a>
                    )}
                    <button
                      type="button"
                      className="bz-btn-primary inline-flex items-center gap-1.5 rounded-full text-[12px]"
                      onClick={() => selectPlace(place)}
                    >
                      <CheckCircle2 size={13} />
                      {isTr ? "Seç" : "Select"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="bz-h-tight text-[15px]">
                {isTr ? "Google Business Profile yorumları" : "Google Business Profile reviews"}
              </div>
              <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-[#525252]">
                {isTr
                  ? "Yorumları çekmek ve cevap yazmak için işletmenin Google hesabıyla bağlanması gerekir. Hesap, ilgili Google Business konumunda sahip veya yönetici olmalı."
                  : "Fetching and replying to reviews requires connecting the business Google account. The account must be an owner or manager of the selected Business Profile location."}
              </p>
            </div>
            {reviewManagementEnabled && status?.connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-[12px] text-[#166534]">
                <CheckCircle2 size={13} />
                {isTr ? "Bağlı" : "Connected"}
              </span>
            ) : null}
          </div>

          {status && !reviewManagementEnabled && (
            <div className="mt-4">
              <AlertBanner kind="warn">
                {isTr
                  ? "Bu işletme için Google yorum yönetimi admin panelinden kapalı. Places araması ve yorum linki çalışır; Google yorumlarını çekme, AI ile cevap verme ve Google'a gönderme açılana kadar pasif kalır."
                  : "Google review management is disabled for this business in the admin panel. Places search and review links still work; fetching reviews, AI replies, and Google reply publishing remain inactive until enabled."}
              </AlertBanner>
            </div>
          )}

          {reviewManagementEnabled && !status?.oauthConfigured && (
            <div className="mt-4">
              <AlertBanner kind="warn">
                {isTr
                  ? "Yorumları yönetmek için Vercel'e GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve GOOGLE_REDIRECT_URI eklenmeli."
                  : "To manage reviews, add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to Vercel."}
              </AlertBanner>
            </div>
          )}

          {reviewManagementEnabled && status?.oauthConfigured && !status.connected && (
            <button
              type="button"
              className="bz-btn-primary mt-4 inline-flex items-center gap-1.5 rounded-full text-[13px]"
              onClick={connectGoogle}
            >
              <ExternalLink size={14} />
              {isTr ? "Google hesabını bağla" : "Connect Google account"}
            </button>
          )}

          {reviewManagementEnabled && status?.connected && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[13px] text-[#525252]">
                  {selectedLocation
                    ? `${isTr ? "Seçili konum:" : "Selected location:"} ${selectedLocation.title}`
                    : isTr
                      ? "Henüz Google Business konumu seçilmedi."
                      : "No Google Business location selected yet."}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="bz-btn-danger text-[13px]"
                    onClick={disconnectGoogle}
                  >
                    {isTr ? "Bağlantıyı kes" : "Disconnect"}
                  </button>
                  <button
                    type="button"
                    className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 rounded-full text-[13px]"
                    onClick={() => loadLocations(true)}
                    disabled={locationsLoading || (locationsRetryAfter !== null && locationsRetryAfter > 0)}
                    title={
                      status?.syncedAt
                        ? `${isTr ? 'Son senkron' : 'Last sync'}: ${formatRelativeTime(status.syncedAt, isTr)}`
                        : undefined
                    }
                  >
                    {locationsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
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
                <AlertBanner kind="warn" onDismiss={() => setLocationsNotice(null)}>
                  {locationsNotice}
                </AlertBanner>
              )}

              {locations.length > 0 && status?.syncedAt && (
                <div className="text-[11px] text-[#737373]">
                  {isTr ? 'Son senkron' : 'Last sync'}: {formatRelativeTime(status.syncedAt, isTr)}
                  {locationsSource === 'cache' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] text-[#525252]">
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
                      className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3 text-left transition hover:border-[#D4D4D4] hover:bg-white"
                    >
                      <div className="bz-h-tight text-[14px]">{location.title}</div>
                      <div className="mt-1 text-[12px] text-[#737373]">{location.address}</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedLocation && (
                <div className="space-y-3">
                  <a
                    href={`/${locale}/dashboard/google-reviews?restaurantId=${restaurant.id}`}
                    className="bz-btn-primary inline-flex items-center gap-1.5 rounded-full text-[13px]"
                  >
                    <ExternalLink size={14} />
                    {isTr ? "Google Yorumlarına Git" : "Go to Google Reviews"}
                  </a>
                  <p className="text-[12px] text-[#737373] max-w-[600px] mt-1">
                    {isTr
                      ? "Google Business Profile hesabınızdaki yorumları okumak, AI ile yanıt taslağı oluşturmak ve doğrudan Google üzerinden yanıtlamak için yeni Google Yorumları sayfasına gidebilirsiniz."
                      : "You can go to the new Google Reviews page to read reviews, generate AI reply drafts, and publish replies directly to Google."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}

export default GoogleBusinessIntegrationPanel;
