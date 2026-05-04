'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, RefreshCw, Send, Sparkles, Star, ExternalLink, Inbox, Unplug } from 'lucide-react';
import { AlertBanner, Field, PageHeader } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import QuickReplyTemplates from '@/components/dashboard/google-reviews/QuickReplyTemplates';
import { getQuickReplyTemplate } from '@/lib/quick-reply-templates';

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

// PROFİL SAĞLIĞI score (HIGH 5 sub-item) — tasarım .design-pulse-2026/.../page-google.jsx
// 92/100 paterni. 3 sinyal ağırlıklı toplama, 0-100 normalize:
// - Rating: avg/5 × 70 (en kritik signal — müşteri memnuniyeti)
// - Response rate: replied/total × 25 (operasyonel disiplin)
// - Volume: min(1, total/50) × 5 (mevcudiyet bonus)
// 4.7 + 92% + 100 yorum → ~94 (tasarımdaki 92/100 hedefi)
function computeHealthScore(opts: {
  avgRating: number | null;
  total: number;
  replied: number;
}): number {
  const rating = Math.max(0, Math.min(5, opts.avgRating ?? 0));
  const responseRate = opts.total > 0 ? Math.min(1, opts.replied / opts.total) : 0;
  const volume = Math.min(1, opts.total / 50);
  const score = (rating / 5) * 70 + responseRate * 25 + volume * 5;
  return Math.round(Math.max(0, Math.min(100, score)));
}

// SIK GEÇEN KELİMELER — client-side word frequency analiz. AI maliyet yok,
// deterministik, instant. Stopwords TR + EN minimal liste; 3+ harf, top N.
// Sentiment: keyword'in göründüğü review'ların avg rating → pos/neu/neg.
const STOPWORDS = new Set([
  // TR
  'bir', 've', 'ile', 'için', 'gibi', 'ama', 'fakat', 'çok', 'daha', 'kadar',
  'bu', 'şu', 'ben', 'sen', 'biz', 'siz', 'onlar', 'var', 'yok', 'çünkü',
  'yani', 'üzere', 'böyle', 'şey', 'kişi', 'gün', 'sonra', 'önce', 'her',
  'hep', 'hiç', 'ise', 'ya', 'ne', 'da', 'de', 'ki', 'mı', 'mi', 'mu', 'mü',
  'olan', 'oldu', 'olur', 'olduk', 'olduğu', 'oldukça', 'idi', 'değil',
  'ama', 'tam', 'göre', 'kez', 'yer', 'yere', 'bile', 'sadece', 'falan',
  // EN
  'the', 'and', 'with', 'for', 'like', 'but', 'very', 'more', 'most', 'just',
  'this', 'that', 'was', 'are', 'were', 'have', 'had', 'has', 'will', 'would',
  'could', 'should', 'from', 'they', 'them', 'their', 'there', 'here', 'when',
  'what', 'which', 'who', 'how', 'all', 'any', 'some', 'one', 'two', 'too',
  'also', 'into', 'over', 'than', 'then', 'been', 'being', 'about',
]);

interface KeywordItem {
  word: string;
  mentions: number;
  sentiment: 'pos' | 'neu' | 'neg';
}

function extractKeywords(reviews: GoogleReview[], topN = 8): KeywordItem[] {
  const wordStats = new Map<string, { count: number; ratingSum: number }>();
  for (const review of reviews) {
    if (!review.comment) continue;
    const value = starValue(review.starRating);
    const tokens = review.comment
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    const seen = new Set<string>();
    for (const token of tokens) {
      if (seen.has(token)) continue; // bir review'da kelime 2x sayılmaz (mention count)
      seen.add(token);
      const entry = wordStats.get(token) ?? { count: 0, ratingSum: 0 };
      entry.count += 1;
      entry.ratingSum += value || 3;
      wordStats.set(token, entry);
    }
  }
  const sorted = Array.from(wordStats.entries())
    .filter(([, s]) => s.count >= 2) // tek geçen kelimeler gürültü
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN);
  return sorted.map(([word, s]) => {
    const avgRating = s.ratingSum / s.count;
    const sentiment: KeywordItem['sentiment'] =
      avgRating >= 4 ? 'pos' : avgRating <= 2.5 ? 'neg' : 'neu';
    return { word, mentions: s.count, sentiment };
  });
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

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-8">
      <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-[#737373]">
        <Loader2 size={16} className="animate-spin" />
        {label}
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
  const [checkedRestaurantId, setCheckedRestaurantId] = useState<string | null>(null);
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
    setCheckedRestaurantId(null);
    setReviewsPayload(null);
    setReviewsError(null);

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/google/business/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google durumu alınamadı.");
      setStatus(data);
      setCheckedRestaurantId(restaurantId);

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
    // §38.33 — Avg response time KPI (tasarım line 96-115). On-the-fly
    // aggregate; Google review reply timestamp ile review createTime farkı.
    let totalReplyMs = 0;
    let replyCount = 0;
    for (const r of reviews) {
      if (!r.reviewReply?.updateTime || !r.createTime) continue;
      const replyMs = new Date(r.reviewReply.updateTime).getTime();
      const createMs = new Date(r.createTime).getTime();
      const diff = replyMs - createMs;
      if (diff > 0) {
        totalReplyMs += diff;
        replyCount += 1;
      }
    }
    const avgResponseMs = replyCount > 0 ? totalReplyMs / replyCount : null;
    const avgResponseHours = avgResponseMs !== null ? avgResponseMs / 3600000 : null;
    // §38.33 — Bu ay yeni: createTime son 30 gün içinde olanlar.
    const thirtyDaysAgoMs = Date.now() - 30 * 86400000;
    const newThisMonth = reviews.filter((r) => {
      if (!r.createTime) return false;
      return new Date(r.createTime).getTime() >= thirtyDaysAgoMs;
    }).length;
    return {
      low,
      unanswered,
      replied,
      avgResponseHours,
      newThisMonth,
      breakdown: ratingBreakdown(reviews),
    };
  }, [reviewsPayload]);

  const statusIsReady = Boolean(
    activeRestaurantId && checkedRestaurantId === activeRestaurantId && status,
  );
  const shouldShowStatusLoading = loadingInitial || statusLoading || Boolean(activeRestaurantId && !statusIsReady && !reviewsError);

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

      {shouldShowStatusLoading ? (
        <LoadingPanel label={isTr ? "Google yorumları hazırlanıyor..." : "Preparing Google reviews..."} />
      ) : restaurants.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
          <Inbox size={40} strokeWidth={1.5} className="mx-auto text-[#A3A3A3] mb-4" />
          <h3 className="text-[18px] font-medium text-[#0A0A0A] mb-2">
            {isTr ? "Henüz işletme yok" : "No business yet"}
          </h3>
          <p className="text-[14px] text-[#525252] max-w-md mx-auto">
            {isTr
              ? "Google yorumlarını yönetmek için önce panelden bir işletme oluşturmanız gerekiyor."
              : "Create a business first before managing Google reviews."}
          </p>
        </div>
      ) : reviewsError && !statusIsReady ? (
        <div className="mt-6 space-y-4">
          <AlertBanner kind="danger">{reviewsError}</AlertBanner>
          <button
            type="button"
            className="bz-btn-ghost inline-flex items-center gap-1.5 rounded-full text-[12px]"
            onClick={() => activeRestaurantId && loadStatusAndReviews(activeRestaurantId)}
          >
            <RefreshCw size={13} />
            {isTr ? "Tekrar dene" : "Try again"}
          </button>
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
                className="bz-btn-ghost inline-flex items-center gap-1.5 rounded-full text-[12px] text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FECACA]"
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
              {/* Dark hero rating card — tasarım .design-pulse-2026/.../page-google.jsx
                  paterni: koyu zemin + lime accent rating + lime corner + summary
                  metrikleri. Mevcut 4-tile metric + breakdown chart aşağıda
                  korunur (detaylı analiz için). */}
              <section className="relative overflow-hidden rounded-2xl bg-[#0A0A0A] p-6 sm:p-8 text-white">
                {/* Lime corner accent (Pulse signature) */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#C6F24E]/10 blur-2xl"
                />
                <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-end">
                  <div>
                    <span className="pulse-eyebrow text-[#C6F24E]">
                      {isTr ? 'GOOGLE PUAN ÖZETİ' : 'GOOGLE RATING SUMMARY'}
                    </span>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="bz-h-tight-2 text-[56px] sm:text-[68px] leading-[0.9] text-[#C6F24E] tabular-nums">
                        {reviewsPayload.averageRating != null
                          ? reviewsPayload.averageRating.toFixed(1)
                          : '—'}
                      </span>
                      <span className="text-[14px] text-white/60">/ 5</span>
                    </div>
                    <p className="mt-2 text-[13px] text-white/70">
                      {reviewsPayload.totalReviewCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
                      {isTr ? 'Google yorumu' : 'Google reviews'}
                    </p>
                  </div>
                  {/* Inline mini distribution */}
                  <div className="space-y-1.5 lg:max-w-[420px] lg:ml-auto w-full">
                    {reviewAnalysis.breakdown.map((item) => {
                      const pct = reviewsPayload.reviews.length
                        ? (item.count / reviewsPayload.reviews.length) * 100
                        : 0;
                      return (
                        <div key={item.rating} className="flex items-center gap-2.5 text-[11.5px]">
                          <span className="w-5 text-white/60 tabular-nums">{item.rating}★</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#C6F24E] transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-white/70 tabular-nums">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* §38.33 — KPI 4-card grid tasarım .design-owner-2026/page-google.jsx
                  line 96-115 paterni: Toplam yorum / Yanıtlanan % / Ort yanıt süresi
                  / Bu ay yeni. Eski "Google puanı" KPI hero card'da büyük (4.7)
                  zaten görünüyor — duplicate; "Yanıtsız" implicit (toplam −
                  yanıtlanan). 4 yeni KPI tasarım uyumlu. */}
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric
                  label={isTr ? 'Toplam yorum' : 'Total reviews'}
                  value={String(reviewsPayload.totalReviewCount)}
                />
                <Metric
                  label={isTr ? 'Yanıtlanan' : 'Replied'}
                  value={
                    reviewsPayload.reviews.length > 0
                      ? `%${Math.round(
                          (reviewAnalysis.replied / reviewsPayload.reviews.length) * 100,
                        )}`
                      : '—'
                  }
                  tone={reviewAnalysis.unanswered === 0 ? 'ok' : undefined}
                />
                <Metric
                  label={isTr ? 'Ort. yanıt süresi' : 'Avg response time'}
                  value={
                    reviewAnalysis.avgResponseHours !== null
                      ? reviewAnalysis.avgResponseHours < 1
                        ? `${Math.round(reviewAnalysis.avgResponseHours * 60)} ${isTr ? 'dk' : 'm'}`
                        : `${reviewAnalysis.avgResponseHours.toFixed(1)} ${isTr ? 'sa' : 'h'}`
                      : '—'
                  }
                />
                <Metric
                  label={isTr ? 'Bu ay yeni' : 'New this month'}
                  value={String(reviewAnalysis.newThisMonth)}
                />
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

              {/* PROFİL SAĞLIĞI + SIK GEÇEN KELİMELER — tasarım
                  .design-pulse-2026/.../page-google.jsx sağ rail paterni.
                  Mevcut max-w-[1000px] 1-col layout'a sığdırmak için 2-col
                  responsive grid (sm+ side-by-side, mobile stack). */}
              {(() => {
                const score = computeHealthScore({
                  avgRating: reviewsPayload.averageRating,
                  total: reviewsPayload.totalReviewCount,
                  replied: reviewAnalysis.replied,
                });
                const tier =
                  score >= 85
                    ? { label: isTr ? 'Mükemmel' : 'Excellent', kind: 'lime' as const }
                    : score >= 60
                      ? { label: isTr ? 'İyi' : 'Good', kind: 'warn' as const }
                      : { label: isTr ? 'Geliştir' : 'Improve', kind: 'danger' as const };
                const responseRate =
                  reviewsPayload.totalReviewCount > 0
                    ? Math.round(
                        (reviewAnalysis.replied / reviewsPayload.totalReviewCount) * 100,
                      )
                    : 0;
                const last30Days = reviewsPayload.reviews.filter((r) => {
                  if (!r.createTime) return false;
                  const ageMs = Date.now() - new Date(r.createTime).getTime();
                  return ageMs <= 30 * 86400000;
                }).length;
                const checklist: Array<{
                  label: string;
                  value: string;
                  ok: boolean;
                }> = [
                  {
                    label: isTr ? 'Ortalama puan' : 'Avg rating',
                    value:
                      reviewsPayload.averageRating != null
                        ? `${reviewsPayload.averageRating.toFixed(1)} / 5`
                        : '—',
                    ok: (reviewsPayload.averageRating ?? 0) >= 4,
                  },
                  {
                    label: isTr ? 'Yanıt oranı' : 'Response rate',
                    value: `%${responseRate}`,
                    ok: responseRate >= 75,
                  },
                  {
                    label: isTr ? 'Toplam yorum' : 'Total reviews',
                    value: reviewsPayload.totalReviewCount.toLocaleString(
                      isTr ? 'tr-TR' : 'en-US',
                    ),
                    ok: reviewsPayload.totalReviewCount >= 50,
                  },
                  {
                    label: isTr ? 'Son 30 gün hacmi' : 'Last 30d volume',
                    value: `${last30Days} ${isTr ? 'yorum' : 'reviews'}`,
                    ok: last30Days >= 5,
                  },
                ];
                const keywords = extractKeywords(reviewsPayload.reviews, 8);
                const maxMentions = keywords[0]?.mentions ?? 1;
                const tierBadgeClass =
                  tier.kind === 'lime'
                    ? 'bg-[#EAF9B8] text-[#0A0A0A] border border-[#C6F24E]'
                    : tier.kind === 'warn'
                      ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                      : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]';
                const arcRadius = 38;
                const arcCircumference = 2 * Math.PI * arcRadius;
                const arcOffset = arcCircumference * (1 - score / 100);

                return (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* PROFİL SAĞLIĞI */}
                    <div className="bz-card p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <span className="pulse-eyebrow text-[#737373]">
                            {isTr ? 'PROFİL SAĞLIĞI' : 'PROFILE HEALTH'}
                          </span>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="bz-h-tight-2 text-[32px] tabular-nums text-[#0A0A0A]">
                              {score}
                            </span>
                            <span className="text-[15px] text-[#A3A3A3]">/100</span>
                          </div>
                          <span
                            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tierBadgeClass}`}
                          >
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                background:
                                  tier.kind === 'lime'
                                    ? '#16A34A'
                                    : tier.kind === 'warn'
                                      ? '#D97706'
                                      : '#DC2626',
                              }}
                            />
                            {tier.label}
                          </span>
                        </div>
                        {/* Mini gauge — SVG arc */}
                        <svg
                          viewBox="0 0 100 100"
                          className="h-20 w-20 shrink-0 -rotate-90"
                          aria-hidden
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r={arcRadius}
                            fill="none"
                            stroke="#EDEDED"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r={arcRadius}
                            fill="none"
                            stroke={
                              tier.kind === 'lime'
                                ? '#C6F24E'
                                : tier.kind === 'warn'
                                  ? '#D97706'
                                  : '#DC2626'
                            }
                            strokeWidth="8"
                            strokeDasharray={arcCircumference}
                            strokeDashoffset={arcOffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 600ms ease' }}
                          />
                        </svg>
                      </div>
                      <ul className="space-y-2 border-t border-[#EDEDED] pt-3">
                        {checklist.map((item) => (
                          <li
                            key={item.label}
                            className="flex items-center gap-2 text-[12.5px]"
                          >
                            <span
                              aria-hidden
                              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px]"
                              style={{
                                background: item.ok ? '#EAF9B8' : '#FEF3C7',
                                color: item.ok ? '#4D5C00' : '#92400E',
                              }}
                            >
                              {item.ok ? '✓' : '!'}
                            </span>
                            <span className="text-[#525252]">{item.label}</span>
                            <span className="bz-mono ml-auto text-[11px] font-semibold tabular-nums text-[#0A0A0A]">
                              {item.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* SIK GEÇEN KELİMELER */}
                    <div className="bz-card p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="pulse-eyebrow text-[#737373]">
                          {isTr ? 'SIK GEÇEN KELİMELER' : 'TOP KEYWORDS'}
                        </span>
                        <span className="bz-mono text-[10px] text-[#A3A3A3] uppercase tracking-wider">
                          NLP
                        </span>
                      </div>
                      {keywords.length === 0 ? (
                        <div className="py-8 text-center text-[12.5px] text-[#737373]">
                          {isTr
                            ? 'Yeterli yorum metni yok.'
                            : 'Not enough review text yet.'}
                        </div>
                      ) : (
                        <ul className="space-y-2.5">
                          {keywords.map((k) => {
                            const barColor =
                              k.sentiment === 'pos'
                                ? '#A8D62E'
                                : k.sentiment === 'neg'
                                  ? '#DC2626'
                                  : '#A3A3A3';
                            const pct = (k.mentions / maxMentions) * 100;
                            return (
                              <li
                                key={k.word}
                                className="flex items-center gap-2.5 text-[12.5px]"
                              >
                                <span className="w-[80px] truncate font-medium text-[#0A0A0A]">
                                  {k.word}
                                </span>
                                <div className="h-1.5 flex-1 rounded-full bg-[#F5F5F5] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.max(8, pct)}%`,
                                      background: barColor,
                                    }}
                                  />
                                </div>
                                <span className="bz-mono w-7 text-right text-[11px] tabular-nums text-[#737373]">
                                  {k.mentions}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <p className="mt-4 text-[10.5px] text-[#A3A3A3] leading-[1.5]">
                        {isTr
                          ? 'Kelimeler çekilen yorumlardan analiz edilir; renk müşteri puanına göre sentiment.'
                          : 'Keywords analyzed from fetched reviews; color reflects sentiment by rating.'}
                      </p>
                    </div>

                    {/* §38.33 — HIZLI YANIT ŞABLONLARI. Tasarım kaynağı:
                        .design-owner-2026/page-google.jsx line 235-252 (4
                        template list). Static (kullanıcı kararı, CLAUDE.md
                        §38.33). Click → ileride composer prefill (mevcut
                        composer'a wire scope dışı; UI parity şimdilik). */}
                    <QuickReplyTemplates
                      onSelect={(key) => {
                        // Future scope: composer textarea'ya prefill.
                        // Şimdilik clipboard'a kopyala, owner manuel paste eder.
                        const body = getQuickReplyTemplate(key, isTr ? 'tr' : 'en', {
                          customerName: null,
                          restaurantName:
                            restaurants.find((r) => r.id === activeRestaurantId)?.name ?? null,
                        });
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(body).catch(() => {
                            /* clipboard API yoksa silent fail */
                          });
                        }
                      }}
                      isTr={isTr}
                    />
                  </div>
                );
              })()}

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
