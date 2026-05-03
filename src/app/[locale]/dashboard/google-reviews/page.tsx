'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CheckCircle2, Loader2, MessageSquareText, RefreshCw, Send, Sparkles, Star, ExternalLink, Inbox, Unplug } from 'lucide-react';
import { AlertBanner, EmptyState, Field, PageHeader } from '@/components/ui';
import type { Locale } from '@/lib/translations';

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

interface GoogleStatus {
  googleReviewManagementEnabled: boolean;
  googleAiEnabled: boolean;
  placesConfigured: boolean;
  oauthConfigured: boolean;
  connected: boolean;
  selectedLocation: GoogleLocation | null;
  syncedAt: string | null;
}

const STAR_VALUE: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
function starValue(starRating: string | undefined): number {
  return starRating ? STAR_VALUE[starRating] ?? 0 : 0;
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
  return [5, 4, 3, 2, 1].map((rating) => ({ rating, count: counts.get(rating) ?? 0 }));
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
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
  review, locale, value, onChange, onDraft, onSend, drafting, replying, aiEnabled
}: {
  review: GoogleReview; locale: "tr" | "en"; value: string; onChange: (value: string) => void;
  onDraft: () => void; onSend: () => void; drafting: boolean; replying: boolean; aiEnabled: boolean;
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
              <Star key={index} size={13} fill={index < rating ? "#C6F24E" : "transparent"} color={index < rating ? "#0A0A0A" : "#A3A3A3"} />
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
            value={value} onChange={(event) => onChange(event.target.value.slice(0, 4096))}
            placeholder={isTr ? "Bu yorum için herkese açık yanıt..." : "Public reply for this review..."}
          />
        </Field>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {aiEnabled && (
            <button type="button" className="bz-btn-ghost inline-flex w-full items-center justify-center gap-1.5 rounded-full text-[12px] sm:w-auto" onClick={onDraft} disabled={drafting}>
              {drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {isTr ? "AI ile cevap ver" : "Reply with AI"}
            </button>
          )}
          <button type="button" className="bz-btn-primary inline-flex w-full items-center justify-center gap-1.5 rounded-full text-[12px] sm:w-auto" onClick={onSend} disabled={replying || !value.trim()}>
            {replying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {isTr ? "Google'a gönder" : "Send to Google"}
          </button>
        </div>
        {aiEnabled && (
          <p className="mt-2 text-[11px] leading-relaxed text-[#737373]">
            {isTr ? "AI yalnızca taslak hazırlar; herkese açık Google yanıtı, sen Google'a gönder dediğinde yayınlanır." : "AI only prepares a draft; the public Google reply is published only after you send it."}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleReviewsContent({ locale }: { locale: Locale }) {
  const isTr = locale === 'tr';
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [reviewsPayload, setReviewsPayload] = useState<ReviewsPayload | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Record<string, boolean>>({});
  const [drafting, setDrafting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/restaurants?limit=50');
        if (res.ok) {
          const data = await res.json();
          setRestaurants(data.data ?? []);
          if (data.data?.length > 0) {
            setActiveRestaurantId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, []);

  const loadStatusAndReviews = async (restaurantId: string) => {
    setStatusLoading(true);
    setStatus(null);
    setReviewsPayload(null);
    setReviewsError(null);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/google/business/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google durumu alınamadı.");
      setStatus(data);

      if (data.googleReviewManagementEnabled && data.connected && data.selectedLocation) {
        setReviewsLoading(true);
        const revRes = await fetch(`/api/restaurants/${restaurantId}/google/business/reviews`);
        const revData = await revRes.json();
        if (!revRes.ok) throw new Error(revData?.error || "Google yorumları alınamadı.");
        setReviewsPayload(revData);

        const replies: Record<string, string> = {};
        for (const review of (revData.reviews ?? []) as GoogleReview[]) {
          replies[review.name] = review.reviewReply?.comment ?? "";
        }
        setReplyText(replies);
      }
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Durum alınamadı.");
    } finally {
      setStatusLoading(false);
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurantId) {
      void loadStatusAndReviews(activeRestaurantId);
    }
  }, [activeRestaurantId]);

  const draftReply = async (review: GoogleReview) => {
    if (!activeRestaurantId) return;
    setDrafting((prev) => ({ ...prev, [review.name]: true }));
    try {
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/google/business/reviews/draft`, {
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
    if (!activeRestaurantId) return;
    const comment = replyText[review.name]?.trim();
    if (!comment) return;
    setReplying((prev) => ({ ...prev, [review.name]: true }));
    setReviewsError(null);
    try {
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/google/business/reviews/reply`, {
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
            item.name === review.name ? { ...item, reviewReply: data.reply } : item,
          ),
        };
      });
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Yanıt gönderilemedi.");
    } finally {
      setReplying((prev) => ({ ...prev, [review.name]: false }));
    }
  };

  const reviewAnalysis = useMemo(() => {
    const reviews = reviewsPayload?.reviews ?? [];
    const low = reviews.filter((review) => {
      const value = starValue(review.starRating);
      return value > 0 && value <= 3;
    }).length;
    const unanswered = reviews.filter((review) => !review.reviewReply?.comment).length;
    const replied = reviews.length - unanswered;
    return { low, unanswered, replied, breakdown: ratingBreakdown(reviews) };
  }, [reviewsPayload]);

  if (loadingInitial) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="animate-spin text-[#0A0A0A]" size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'GERİ BİLDİRİMLER' : 'FEEDBACKS'}
        title={isTr ? "Google'a Yapılan Yorumlar" : 'Google Reviews'}
        description={
          isTr
            ? 'Müşterilerinizin Google İşletme Profilinize bıraktığı yorumları görüntüleyin, Pulse AI ile yanıt taslağı oluşturun ve doğrudan Google üzerinden yayınlayın.'
            : 'View reviews left on your Google Business Profile, generate AI reply drafts with Pulse AI, and publish them directly to Google.'
        }
      />

      {restaurants.length > 1 && (
        <div className="mb-6">
          <label className="block text-[13px] font-medium text-[#262626] mb-2">
            {isTr ? "İşletme Seçin" : "Select Business"}
          </label>
          <select
            className="bz-input w-full max-w-sm"
            value={activeRestaurantId ?? ''}
            onChange={(e) => setActiveRestaurantId(e.target.value)}
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {statusLoading ? (
        <div className="flex items-center gap-2 text-[13px] text-[#737373] mt-8">
          <Loader2 size={16} className="animate-spin" />
          {isTr ? "Google durumu kontrol ediliyor..." : "Checking Google status..."}
        </div>
      ) : !status?.connected || !status?.selectedLocation ? (
        <div className="mt-6 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
          <Inbox size={40} strokeWidth={1.5} className="mx-auto text-[#A3A3A3] mb-4" />
          <h3 className="text-[18px] font-medium text-[#0A0A0A] mb-2">
            {isTr ? "Google hesabınız bağlı değil" : "Google account is not connected"}
          </h3>
          <p className="text-[14px] text-[#525252] max-w-md mx-auto mb-6">
            {isTr 
              ? "Müşterilerinizin Google'a bıraktığı yorumları bu sayfadan okumak ve yanıtlamak için önce Google Business hesabınızı bağlamanız gerekmektedir." 
              : "To read and reply to reviews your customers left on Google from this page, you first need to connect your Google Business account."}
          </p>
          <button
            onClick={() => router.push(`/${locale}/dashboard/restaurants/${activeRestaurantId}/settings?section=integrations`)}
            className="bz-btn-primary inline-flex items-center gap-2 px-6 rounded-full"
          >
            <ExternalLink size={16} />
            {isTr ? "Google Hesabını Bağla" : "Connect Google Account"}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-[#0A0A0A]">
                {status.selectedLocation.title}
              </p>
              <p className="text-[13px] text-[#737373] mt-0.5">
                {status.selectedLocation.address}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="bz-btn-ghost inline-flex items-center gap-1.5 rounded-full text-[12px] text-red-600 hover:bg-red-50 hover:border-red-100"
                onClick={async () => {
                  if (!confirm(isTr ? 'Google hesap bağlantısı kesilecek. Devam etmek istiyor musunuz?' : 'Google account will be disconnected. Continue?')) return;
                  try {
                    const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' });
                    if (res.ok && activeRestaurantId) {
                      loadStatusAndReviews(activeRestaurantId);
                    }
                  } catch {
                    setReviewsError(isTr ? 'Bağlantı kesilemedi.' : 'Failed to disconnect.');
                  }
                }}
              >
                <Unplug size={13} />
                {isTr ? 'Bağlantıyı Kes' : 'Disconnect'}
              </button>
              <button
                type="button"
                className="bz-btn-primary inline-flex items-center gap-1.5 rounded-full text-[13px]"
                onClick={() => activeRestaurantId && loadStatusAndReviews(activeRestaurantId)}
                disabled={reviewsLoading}
              >
                {reviewsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isTr ? "Yorumları Yenile" : "Refresh Reviews"}
              </button>
            </div>
          </div>

          {reviewsError && <AlertBanner kind="danger">{reviewsError}</AlertBanner>}

          {reviewsPayload && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label={isTr ? "Google puanı" : "Google rating"} value={reviewsPayload.averageRating?.toFixed(1) ?? "-"} />
                <Metric label={isTr ? "Toplam yorum" : "Total reviews"} value={String(reviewsPayload.totalReviewCount)} />
                <Metric label={isTr ? "Yanıtlanan" : "Replied"} value={String(reviewAnalysis.replied)} />
                <Metric label={isTr ? "Yanıtsız" : "Unanswered"} value={String(reviewAnalysis.unanswered)} tone={reviewAnalysis.unanswered ? "warn" : "ok"} />
              </div>
              <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
                <div className="mb-3 text-[13px] font-semibold text-[#262626]">
                  {isTr ? "Son çekilen yorumlarda puan dağılımı" : "Rating breakdown in fetched reviews"}
                </div>
                <div className="space-y-2">
                  {reviewAnalysis.breakdown.map((item) => (
                    <div key={item.rating} className="flex items-center gap-3 text-[13px] text-[#525252]">
                      <span className="w-8">{item.rating}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EDEDED]">
                        <div
                          className="h-full rounded-full bg-[#C6F24E]"
                          style={{
                            width: `${reviewsPayload.reviews.length ? (item.count / reviewsPayload.reviews.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {reviewsPayload.reviews.length === 0 ? (
                  <div className="py-8 text-center text-[#737373] text-[14px]">
                    {isTr ? "Henüz yorum bulunmuyor." : "No reviews found yet."}
                  </div>
                ) : (
                  reviewsPayload.reviews.map((review) => (
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
                      aiEnabled={Boolean(status?.googleAiEnabled)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GoogleReviewsPage({ params }: { params: { locale: Locale } }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="animate-spin text-[#0A0A0A]" size={24} />
        </div>
      }
    >
      <GoogleReviewsContent locale={params.locale} />
    </Suspense>
  );
}
