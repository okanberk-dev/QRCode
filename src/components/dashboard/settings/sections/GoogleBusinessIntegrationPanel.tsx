"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
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

interface GoogleReview {
  name: string;
  reviewId: string;
  reviewer?: {
    displayName?: string;
    profilePhotoUrl?: string;
    isAnonymous?: boolean;
  };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: {
    comment?: string;
    updateTime?: string;
    reviewReplyState?: string;
  };
}

interface ReviewsPayload {
  reviews: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number;
  nextPageToken?: string;
  location: GoogleLocation;
}

const STAR_VALUE: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function starValue(starRating: string | undefined): number {
  return starRating ? STAR_VALUE[starRating] ?? 0 : 0;
}

function defaultQuery(restaurant: RestaurantData): string {
  return [restaurant.name, restaurant.address, restaurant.city]
    .filter((item): item is string => Boolean(item && item.trim()))
    .join(" ");
}

function formatDate(value: string | undefined, locale: "tr" | "en"): string {
  if (!value) return locale === "tr" ? "Tarih yok" : "No date";
  try {
    return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ratingBreakdown(reviews: GoogleReview[]) {
  const counts = new Map<number, number>();
  for (const review of reviews) {
    const value = starValue(review.starRating);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: counts.get(rating) ?? 0,
  }));
}

export function GoogleBusinessIntegrationPanel({
  restaurant,
  locale,
  dirty,
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
  const [reviewsPayload, setReviewsPayload] = useState<ReviewsPayload | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Record<string, boolean>>({});
  const [drafting, setDrafting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setQuery(defaultQuery(restaurant));
  }, [restaurant.id, restaurant.name, restaurant.address, restaurant.city]);

  const selectedLocation = status?.selectedLocation ?? reviewsPayload?.location ?? null;
  const reviewManagementEnabled = status?.googleReviewManagementEnabled === true;

  const reviewAnalysis = useMemo(() => {
    const reviews = reviewsPayload?.reviews ?? [];
    const low = reviews.filter((review) => {
      const value = starValue(review.starRating);
      return value > 0 && value <= 3;
    }).length;
    const unanswered = reviews.filter((review) => !review.reviewReply?.comment).length;
    const replied = reviews.length - unanswered;
    return {
      low,
      unanswered,
      replied,
      breakdown: ratingBreakdown(reviews),
    };
  }, [reviewsPayload]);

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
    const returnTo = `/${locale}/dashboard/restaurants/${restaurant.id}/settings?section=integrations`;
    const res = await fetch("/api/integrations/google/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnTo }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setLocationsError(data?.message || data?.error || "Google OAuth başlatılamadı.");
      return;
    }
    window.location.href = data.url;
  };

  const loadLocations = async () => {
    setLocationsLoading(true);
    setLocationsError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/business/locations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google konumları alınamadı.");
      setLocations(data.locations ?? []);
      setStatus((prev) => ({
        googleReviewManagementEnabled: prev?.googleReviewManagementEnabled ?? true,
        placesConfigured: prev?.placesConfigured ?? true,
        oauthConfigured: prev?.oauthConfigured ?? true,
        connected: true,
        selectedLocation: data.selectedLocation ?? prev?.selectedLocation ?? null,
        syncedAt: data.syncedAt ?? prev?.syncedAt ?? null,
      }));
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : "Google konumları alınamadı.");
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
      await loadReviews();
    } catch (err) {
      setLocationsError(err instanceof Error ? err.message : "Google konumu kaydedilemedi.");
    }
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/business/reviews`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google yorumları alınamadı.");
      setReviewsPayload(data);
      const replies: Record<string, string> = {};
      for (const review of (data.reviews ?? []) as GoogleReview[]) {
        replies[review.name] = review.reviewReply?.comment ?? "";
      }
      setReplyText(replies);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Google yorumları alınamadı.");
    } finally {
      setReviewsLoading(false);
    }
  };

  const draftReply = async (review: GoogleReview) => {
    setDrafting((prev) => ({ ...prev, [review.name]: true }));
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/business/reviews/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: review.reviewer?.displayName ?? null,
          rating: starValue(review.starRating) || 5,
          comment: review.comment ?? null,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Taslak oluşturulamadı.");
      setReplyText((prev) => ({ ...prev, [review.name]: data.suggestion ?? "" }));
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Taslak oluşturulamadı.");
    } finally {
      setDrafting((prev) => ({ ...prev, [review.name]: false }));
    }
  };

  const sendReply = async (review: GoogleReview) => {
    const comment = replyText[review.name]?.trim();
    if (!comment) return;
    setReplying((prev) => ({ ...prev, [review.name]: true }));
    setReviewsError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/google/business/reviews/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewName: review.name, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Yanıt gönderilemedi.");
      setReviewsPayload((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reviews: prev.reviews.map((item) =>
            item.name === review.name
              ? { ...item, reviewReply: data.reply }
              : item,
          ),
        };
      });
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Yanıt gönderilemedi.");
    } finally {
      setReplying((prev) => ({ ...prev, [review.name]: false }));
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
                <button
                  type="button"
                  className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 rounded-full text-[13px]"
                  onClick={loadLocations}
                  disabled={locationsLoading}
                >
                  {locationsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {isTr ? "Konumları yenile" : "Refresh locations"}
                </button>
              </div>

              {locationsError && <AlertBanner kind="danger">{locationsError}</AlertBanner>}

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
                  <button
                    type="button"
                    className="bz-btn-primary inline-flex items-center gap-1.5 rounded-full text-[13px]"
                    onClick={loadReviews}
                    disabled={reviewsLoading}
                  >
                    {reviewsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isTr ? "Google yorumlarını getir" : "Fetch Google reviews"}
                  </button>
                  {reviewsError && <AlertBanner kind="danger">{reviewsError}</AlertBanner>}
                  {reviewsPayload && (
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-4">
                        <Metric label={isTr ? "Google puanı" : "Google rating"} value={reviewsPayload.averageRating?.toFixed(1) ?? "-"} />
                        <Metric label={isTr ? "Toplam yorum" : "Total reviews"} value={String(reviewsPayload.totalReviewCount)} />
                        <Metric label={isTr ? "Yanıtlanan" : "Replied"} value={String(reviewAnalysis.replied)} />
                        <Metric label={isTr ? "Yanıtsız" : "Unanswered"} value={String(reviewAnalysis.unanswered)} tone={reviewAnalysis.unanswered ? "warn" : "ok"} />
                      </div>
                      <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
                        <div className="mb-2 text-[12px] font-semibold text-[#262626]">
                          {isTr ? "Son çekilen yorumlarda puan dağılımı" : "Rating breakdown in fetched reviews"}
                        </div>
                        <div className="space-y-1.5">
                          {reviewAnalysis.breakdown.map((item) => (
                            <div key={item.rating} className="flex items-center gap-2 text-[12px] text-[#525252]">
                              <span className="w-8">{item.rating}★</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EDEDED]">
                                <div
                                  className="h-full rounded-full bg-[#C6F24E]"
                                  style={{
                                    width: `${reviewsPayload.reviews.length ? (item.count / reviewsPayload.reviews.length) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                              <span className="w-6 text-right">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {reviewsPayload.reviews.map((review) => (
                          <ReviewCard
                            key={review.name}
                            review={review}
                            locale={locale}
                            value={replyText[review.name] ?? ""}
                            onChange={(value) => setReplyText((prev) => ({ ...prev, [review.name]: value }))}
                            onDraft={() => draftReply(review)}
                            onSend={() => sendReply(review)}
                            drafting={Boolean(drafting[review.name])}
                            replying={Boolean(replying[review.name])}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-3">
      <div className="text-[11px] text-[#737373]">{label}</div>
      <div
        className="bz-h-tight mt-1 text-[20px]"
        style={{ color: tone === "warn" ? "#92400E" : tone === "ok" ? "#166534" : "#0A0A0A" }}
      >
        {value}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  locale,
  value,
  onChange,
  onDraft,
  onSend,
  drafting,
  replying,
}: {
  review: GoogleReview;
  locale: "tr" | "en";
  value: string;
  onChange: (value: string) => void;
  onDraft: () => void;
  onSend: () => void;
  drafting: boolean;
  replying: boolean;
}) {
  const isTr = locale === "tr";
  const rating = starValue(review.starRating);
  const author = review.reviewer?.isAnonymous
    ? isTr ? "Anonim kullanıcı" : "Anonymous user"
    : review.reviewer?.displayName || (isTr ? "Google kullanıcısı" : "Google user");

  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="bz-h-tight text-[14px]">{author}</div>
          <div className="mt-1 flex items-center gap-1 text-[12px] text-[#737373]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                size={13}
                fill={index < rating ? "#C6F24E" : "transparent"}
                color={index < rating ? "#0A0A0A" : "#A3A3A3"}
              />
            ))}
            <span className="ml-1">{formatDate(review.updateTime ?? review.createTime, locale)}</span>
          </div>
        </div>
        {review.reviewReply?.comment && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[11px] text-[#166534]">
            <CheckCircle2 size={12} />
            {isTr ? "Yanıt var" : "Replied"}
          </span>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#404040]">
        {review.comment || (isTr ? "Yazılı yorum yok." : "No written comment.")}
      </p>
      <div className="mt-4">
        <Field label={isTr ? "Google yanıtı" : "Google reply"}>
          <textarea
            className="bz-input min-h-[96px] resize-y text-[13px]"
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, 4096))}
            placeholder={isTr ? "Bu yorum için herkese açık yanıt..." : "Public reply for this review..."}
          />
        </Field>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="bz-btn-ghost inline-flex w-full items-center justify-center gap-1.5 rounded-full text-[12px] sm:w-auto"
            onClick={onDraft}
            disabled={drafting}
          >
            {drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {isTr ? "AI ile cevap ver" : "Reply with AI"}
          </button>
          <button
            type="button"
            className="bz-btn-primary inline-flex w-full items-center justify-center gap-1.5 rounded-full text-[12px] sm:w-auto"
            onClick={onSend}
            disabled={replying || !value.trim()}
          >
            {replying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {isTr ? "Google'a gönder" : "Send to Google"}
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#737373]">
          {isTr
            ? "AI yalnızca taslak hazırlar; herkese açık Google yanıtı, sen Google'a gönder dediğinde yayınlanır."
            : "AI only prepares a draft; the public Google reply is published only after you send it."}
        </p>
      </div>
    </div>
  );
}

export default GoogleBusinessIntegrationPanel;
