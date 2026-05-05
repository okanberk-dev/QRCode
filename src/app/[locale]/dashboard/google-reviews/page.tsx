'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  ExternalLink,
  Inbox,
  Unplug,
  Flag,
  ArrowUp,
  ArrowDown,
  Edit3,
} from 'lucide-react';
import { AlertBanner, PageHeader } from '@/components/ui';
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

// §38.55 — KPI tile with delta + sub line. Tasarım kaynağı:
// .design-owner-2026/page-google.jsx line 96-115 birebir (label + 28px value
// + delta arrowUp/Down + sub mono).
function KpiTile({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta: { text: string; sign: 1 | 0 | -1 } | null;
  sub: string;
}) {
  const deltaColor =
    delta && delta.sign === 1 ? '#16A34A' : delta && delta.sign === -1 ? '#DC2626' : '#737373';
  const DeltaIcon =
    delta && delta.sign === 1 ? ArrowUp : delta && delta.sign === -1 ? ArrowDown : null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="pulse-eyebrow text-[#737373]">{label}</span>
      <span
        className="bz-h-tight tabular-nums text-[#0A0A0A]"
        style={{ fontSize: 28, lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      <span className="flex items-center gap-2">
        {delta && (
          <span
            className="inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums"
            style={{ color: deltaColor }}
          >
            {DeltaIcon ? <DeltaIcon size={11} /> : null}
            {delta.text}
          </span>
        )}
        <span className="bz-mono text-[10.5px] text-[#A3A3A3]">{sub}</span>
      </span>
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

// §38.55 — ReviewCard tasarım birebir (page-google.jsx line 132-178).
// Avatar lg + sentiment-bg + name + stars + relative time + Pending/Replied
// badge + body + reply preview kartı (yanıtlandı durumda) + action buttons
// row (AI yanıt + Manuel + Bildir / Yanıtı düzenle + Bildir). Composer textarea
// collapse pattern: action click ile açılır.
function ReviewCard({
  review,
  locale,
  value,
  onChange,
  onDraft,
  onSend,
  drafting,
  replying,
  aiEnabled,
  flagged,
  onFlagToggle,
  restaurantName,
  urgent,
}: {
  review: GoogleReview;
  locale: 'tr' | 'en';
  value: string;
  onChange: (value: string) => void;
  onDraft: () => void;
  onSend: () => void;
  drafting: boolean;
  replying: boolean;
  aiEnabled: boolean;
  flagged: boolean;
  onFlagToggle: () => void;
  restaurantName: string;
  urgent?: boolean;
}) {
  const isTr = locale === 'tr';
  const rating = starValue(review.starRating);
  const author = review.reviewer?.isAnonymous
    ? isTr
      ? 'Anonim kullanıcı'
      : 'Anonymous user'
    : review.reviewer?.displayName || (isTr ? 'Google kullanıcısı' : 'Google user');
  const initials = author
    .split(/\s+/)
    .map((t) => t[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const replied = Boolean(review.reviewReply?.comment);
  const positive = rating >= 4;

  // Composer state — tasarım birebir collapse pattern. Action click → açılır.
  // Yanıtlandı durumda "Yanıtı düzenle" → mevcut reply'i value'ya yükle.
  const [composerOpen, setComposerOpen] = useState(false);
  const handleEditReply = () => {
    if (review.reviewReply?.comment && !value.trim()) {
      onChange(review.reviewReply.comment);
    }
    setComposerOpen(true);
  };
  const handleAiClick = () => {
    onDraft();
    setComposerOpen(true);
  };
  const handleManualClick = () => {
    setComposerOpen(true);
  };

  return (
    <div className={`p-5 ${flagged ? 'bg-[#FFFBEB]/40' : ''}`}>
      <div className="flex gap-3.5">
        {/* Avatar lg — sentiment bg (tasarım line 138-141) */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
          style={{
            background: positive ? '#EAF9B8' : '#FEF2F2',
            color: positive ? '#0A0A0A' : '#991B1B',
          }}
          aria-hidden
        >
          {initials || (isTr ? 'B' : 'B')}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header row: name + stars + time + Pending/Replied badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-[#0A0A0A]">{author}</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  fill={i < rating ? '#C6F24E' : 'transparent'}
                  color={i < rating ? '#0A0A0A' : '#A3A3A3'}
                />
              ))}
            </div>
            <span className="bz-mono text-[11px] text-[#A3A3A3]">
              · {formatDate(review.updateTime ?? review.createTime, locale)}
            </span>
            {urgent && (
              <span className="pulse-eyebrow ml-auto inline-flex items-center gap-1 rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-1.5 py-0.5 text-[9px] text-[#991B1B]">
                <span aria-hidden className="bz-pulse-dot" style={{ background: '#DC2626' }} />
                {isTr ? 'Acil yanıt' : 'Urgent'}
              </span>
            )}
            {!urgent && (
              <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] ${
                replied
                  ? 'bg-[#F0FDF4] text-[#166534]'
                  : 'bg-[#FFFBEB] text-[#92400E]'
              }`}>
                {replied ? (
                  <>
                    <CheckCircle2 size={10} />
                    {isTr ? 'Yanıtlandı' : 'Replied'}
                  </>
                ) : (
                  <>
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: '#D97706' }}
                    />
                    {isTr ? 'Bekliyor' : 'Pending'}
                  </>
                )}
              </span>
            )}
          </div>

          {/* Body */}
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.6] text-[#262626]">
            {review.comment || (isTr ? 'Yazılı yorum yok.' : 'No written comment.')}
          </p>

          {/* Reply preview — yanıtlandı durumda (tasarım line 156-167 birebir) */}
          {replied && !composerOpen && (
            <div
              className="mt-3 rounded-r-[10px] bg-[#FAFAFA] p-3 pl-3.5"
              style={{ borderLeft: '3px solid #C6F24E' }}
            >
              <div className="pulse-eyebrow text-[#737373]">
                {restaurantName || (isTr ? 'İşletme' : 'Business')}{' '}
                {isTr ? 'yanıtladı' : 'replied'}
                {review.reviewReply?.updateTime && (
                  <>
                    {' · '}
                    {formatDate(review.reviewReply.updateTime, locale)}
                  </>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-[1.55] text-[#262626]">
                {review.reviewReply?.comment}
              </p>
            </div>
          )}

          {/* Action buttons — composer kapalıyken (tasarım line 169-174) */}
          {!composerOpen && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {!replied && aiEnabled && (
                <button
                  type="button"
                  onClick={handleAiClick}
                  disabled={drafting}
                  className="inline-flex items-center gap-1 rounded-full bg-[#C6F24E] px-3 py-1 text-[11.5px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E] disabled:opacity-60"
                >
                  {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isTr ? 'AI yanıt' : 'AI reply'}
                </button>
              )}
              {!replied && (
                <button
                  type="button"
                  onClick={handleManualClick}
                  className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[11.5px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
                >
                  <Send size={12} />
                  {isTr ? 'Manuel' : 'Manual'}
                </button>
              )}
              {replied && (
                <button
                  type="button"
                  onClick={handleEditReply}
                  className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[11.5px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
                >
                  <Edit3 size={12} />
                  {isTr ? 'Yanıtı düzenle' : 'Edit reply'}
                </button>
              )}
              <button
                type="button"
                onClick={onFlagToggle}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ${
                  flagged
                    ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                    : 'border-[#EDEDED] bg-white text-[#0A0A0A] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={flagged}
              >
                <Flag size={12} />
                {flagged
                  ? (isTr ? 'İşareti kaldır' : 'Unflag')
                  : (isTr ? 'Bildir' : 'Flag')}
              </button>
            </div>
          )}

          {/* Composer — açıkken textarea + Gönder/İptal (collapse pattern) */}
          {composerOpen && (
            <div className="mt-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-3">
              <textarea
                className="bz-input min-h-[88px] resize-y text-[13px]"
                value={value}
                onChange={(event) => onChange(event.target.value.slice(0, 4096))}
                placeholder={
                  isTr
                    ? 'Bu yorum için herkese açık yanıt...'
                    : 'Public reply for this review...'
                }
                aria-label={isTr ? 'Google yanıtı' : 'Google reply'}
              />
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[11.5px] font-medium text-[#525252] hover:bg-[#FAFAFA]"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                {aiEnabled && (
                  <button
                    type="button"
                    onClick={onDraft}
                    disabled={drafting}
                    className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-3 py-1 text-[11.5px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-60"
                  >
                    {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {isTr ? 'AI taslağı' : 'AI draft'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSend}
                  disabled={replying || !value.trim()}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0A0A0A] px-3 py-1 text-[11.5px] font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-60"
                >
                  {replying ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  {isTr ? "Google'a gönder" : 'Send to Google'}
                </button>
              </div>
              {aiEnabled && (
                <p className="mt-1.5 text-[10.5px] leading-[1.5] text-[#A3A3A3]">
                  {isTr
                    ? 'AI yalnızca taslak hazırlar; herkese açık Google yanıtı sen "Google\'a gönder" dediğinde yayınlanır.'
                    : 'AI only prepares a draft; the public Google reply is published only after you send it.'}
                </p>
              )}
            </div>
          )}
        </div>
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
  // §38.55 — 3-tab filter (tasarım birebir page-google.jsx line 125-129).
  // Sort dropdown silindi (default newest first). Flag state korunur — action
  // button "Bildir" toggleFlag ile çalışır (More dropdown UI silindi, ama
  // localStorage flag persistence + action button kalır).
  const [activeTab, setActiveTab] = useState<'all' | 'unreplied' | 'low'>('all');
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  // Restoran değişiminde localStorage'dan flag set'ini yükle.
  useEffect(() => {
    if (!activeRestaurantId || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(`bz_google_review_flags:${activeRestaurantId}`);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        setFlaggedIds(new Set(Array.isArray(arr) ? arr : []));
      } else {
        setFlaggedIds(new Set());
      }
    } catch {
      setFlaggedIds(new Set());
    }
  }, [activeRestaurantId]);

  const toggleFlag = (reviewName: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reviewName)) next.delete(reviewName);
      else next.add(reviewName);
      if (activeRestaurantId && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            `bz_google_review_flags:${activeRestaurantId}`,
            JSON.stringify(Array.from(next)),
          );
        } catch {
          /* localStorage quota / unavailable */
        }
      }
      return next;
    });
  };

  // §38.55 — reviewExternalUrl + openReviewInGoogle + copyReviewUrl helper'ları
  // SİLİNDİ. More menu UI tasarım birebir uyum için kaldırıldı (page-google.jsx
  // line 119-179'da Reviews stream header'da sadece 3-tab; per-row "Open in
  // Google" / "Copy URL" yok). Future scope: tasarım line 169-174 action
  // buttons'a entegre edilebilir.

  // §38.55 — Filtered reviews (3-tab tasarım birebir paterni). Sort sil
  // (kullanıcı kararı tasarım birebir — page-google.jsx line 125-129'da sort
  // dropdown yok). Default order: newest first (tasarım line 132 GOOGLE_REVIEWS
  // kronolojik en yeni başta).
  const filteredReviews = useMemo<GoogleReview[]>(() => {
    if (!reviewsPayload?.reviews) return [];
    let arr = [...reviewsPayload.reviews];

    // 3-tab filter (Tümü / Yanıtsız / Düşük puan) — tasarım birebir
    if (activeTab === 'unreplied') {
      arr = arr.filter((r) => !r.reviewReply?.comment);
    } else if (activeTab === 'low') {
      arr = arr.filter((r) => {
        const v = starValue(r.starRating);
        return v > 0 && v <= 3;
      });
    }

    // Default sort: newest first (latest createTime/updateTime üstte)
    arr.sort((a, b) => {
      const aTime = new Date(a.updateTime ?? a.createTime ?? 0).getTime();
      const bTime = new Date(b.updateTime ?? b.createTime ?? 0).getTime();
      return bTime - aTime;
    });
    return arr;
  }, [reviewsPayload, activeTab]);

  // Tab counts (filter independent) — 3-tab parity
  const tabCounts = useMemo(() => {
    const all = reviewsPayload?.reviews ?? [];
    return {
      all: all.length,
      unreplied: all.filter((r) => !r.reviewReply?.comment).length,
      low: all.filter((r) => {
        const v = starValue(r.starRating);
        return v > 0 && v <= 3;
      }).length,
    };
  }, [reviewsPayload]);

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

    // §38.33 — Avg response time. Google review reply timestamp ile
    // review createTime farkı (tüm fetch'lenmiş yorumlar üzerinden).
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

    // §38.55 — KPI delta + sub line backend extension. Tasarım birebir
    // (page-google.jsx line 96-115): Toplam yorum (+184 son 30 gün) /
    // Yanıtlanan 92% (+8% sektör ort. 64%) / Ort. yanıt süresi (-22% AI ile)
    // / Bu ay yeni 142 (+12% haftalık 32). Mevcut data'dan derive — son 30g
    // window vs prev 30g (>30d <60d) compare.
    const now = Date.now();
    const thirtyDaysAgoMs = now - 30 * 86400000;
    const sixtyDaysAgoMs = now - 60 * 86400000;

    const newThisMonth = reviews.filter((r) => {
      if (!r.createTime) return false;
      return new Date(r.createTime).getTime() >= thirtyDaysAgoMs;
    }).length;

    const prevPeriodNew = reviews.filter((r) => {
      if (!r.createTime) return false;
      const ms = new Date(r.createTime).getTime();
      return ms >= sixtyDaysAgoMs && ms < thirtyDaysAgoMs;
    }).length;

    const repliedThisMonth = reviews.filter((r) => {
      if (!r.reviewReply?.updateTime) return false;
      return new Date(r.reviewReply.updateTime).getTime() >= thirtyDaysAgoMs;
    }).length;

    const prevPeriodReplied = reviews.filter((r) => {
      if (!r.reviewReply?.updateTime) return false;
      const ms = new Date(r.reviewReply.updateTime).getTime();
      return ms >= sixtyDaysAgoMs && ms < thirtyDaysAgoMs;
    }).length;

    // Ort. yanıt süresi prev period — aynı yapı, prev 30g window
    let prevTotalReplyMs = 0;
    let prevReplyCount = 0;
    for (const r of reviews) {
      if (!r.reviewReply?.updateTime || !r.createTime) continue;
      const replyMs = new Date(r.reviewReply.updateTime).getTime();
      if (replyMs < sixtyDaysAgoMs || replyMs >= thirtyDaysAgoMs) continue;
      const createMs = new Date(r.createTime).getTime();
      const diff = replyMs - createMs;
      if (diff > 0) {
        prevTotalReplyMs += diff;
        prevReplyCount += 1;
      }
    }
    const prevAvgResponseHours =
      prevReplyCount > 0 ? prevTotalReplyMs / prevReplyCount / 3600000 : null;

    // Delta % helpers — fail-safe (pre/curr 0 değerlerde "—" döner)
    const pctDelta = (curr: number, prev: number): { value: number; sign: 1 | 0 | -1 } | null => {
      if (prev === 0) return curr > 0 ? { value: 100, sign: 1 } : null;
      const pct = ((curr - prev) / prev) * 100;
      const sign: 1 | 0 | -1 = pct > 0 ? 1 : pct < 0 ? -1 : 0;
      return { value: Math.round(Math.abs(pct)), sign };
    };

    // §38.55 — Total reviews delta (mutlak fark — tasarım "+184" abs val)
    const totalDelta = newThisMonth - prevPeriodNew;

    // Replied % delta (current vs prev replied rate)
    const currRepliedPct = reviews.length > 0 ? (replied / reviews.length) * 100 : 0;
    const repliedRateDelta =
      reviews.length > 0 && prevPeriodNew > 0
        ? pctDelta(repliedThisMonth, prevPeriodReplied)
        : null;

    // Avg response time delta — prev 30d ile current 30d kıyas
    // (Daha düşük süre = iyi → "-" pozitif gösterilir, sign 1 sayılır)
    const avgResponseDelta =
      avgResponseHours !== null && prevAvgResponseHours !== null && prevAvgResponseHours > 0
        ? pctDelta(avgResponseHours, prevAvgResponseHours)
        : null;

    // New this month delta vs prev period
    const newDelta = pctDelta(newThisMonth, prevPeriodNew);
    const weeklyAvg = Math.max(1, Math.round(newThisMonth / 4));

    return {
      low,
      unanswered,
      replied,
      avgResponseHours,
      newThisMonth,
      breakdown: ratingBreakdown(reviews),
      // §38.55 — KPI delta + sub line metrics (UI tasarım birebir)
      totalDelta, // abs +N (e.g. +184)
      currRepliedPct, // 0-100
      repliedRateDelta, // {value, sign} — "Yanıtlanan" KPI delta
      avgResponseDelta, // {value, sign} — "Ort. yanıt süresi" KPI delta
      newDelta, // {value, sign} — "Bu ay yeni" KPI delta
      weeklyAvg, // newThisMonth / 4 (heuristic — sub line "haftalık X")
    };
  }, [reviewsPayload]);

  const statusIsReady = Boolean(
    activeRestaurantId && checkedRestaurantId === activeRestaurantId && status,
  );
  const shouldShowStatusLoading = loadingInitial || statusLoading || Boolean(activeRestaurantId && !statusIsReady && !reviewsError);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'GOOGLE YORUMLARI' : 'GOOGLE REVIEWS'}
        title={isTr ? 'Google Yorumları' : 'Google Reviews'}
        description={
          isTr
            ? 'Google\'a bırakılan yorumları oku, Pulse AI taslağıyla yanıt yaz ve doğrudan yayınla.'
            : 'Read Google reviews, draft replies with Pulse AI, and publish straight from here.'
        }
        actions={
          // §38.57 — Tasarım a/page-google.jsx topbar 2 action button birebir.
          // "Profili görüntüle" backend gerek (profileUrl status'ta exposed
          // değil, gelecek scope). Senkronize et + Yanıt sırası (unreplied
          // count) implement edilir.
          activeRestaurantId && reviewsPayload ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadStatusAndReviews(activeRestaurantId)}
                disabled={reviewsLoading}
                className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12.5px]"
                title={isTr ? 'Google yorumlarını yeniden çek' : 'Refresh Google reviews'}
              >
                {reviewsLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} strokeWidth={2} />
                )}
                {isTr ? 'Senkronize et' : 'Sync'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unreplied')}
                className="bz-btn-primary inline-flex items-center gap-1.5 text-[12.5px]"
                title={isTr ? 'Yanıtlanmamış yorumlara odaklan' : 'Focus on unanswered reviews'}
              >
                <Send size={13} strokeWidth={2} />
                {isTr ? 'Yanıt sırası' : 'Reply queue'} ({reviewAnalysis.unanswered})
              </button>
            </div>
          ) : null
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
            <div className="space-y-4">
              {/* §38.55 — Üst 2-col: Hero + KPI 4-card yan yana (tasarım
                  page-google.jsx line 47 — `1fr 1fr` grid). Mobile/tablet'te
                  stack (lg:grid-cols-2). */}
              <div className="grid gap-3 lg:grid-cols-2">
                {/* SOL: Dark hero rating card + 5-row distribution.
                    Tasarım line 49-94 birebir paritesi. */}
                <section className="relative overflow-hidden rounded-[18px] bg-[#0A0A0A] p-6 sm:p-7 text-white">
                  {/* Lime corner accent (tasarım line 58-65) */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-5 top-5 inline-flex items-center gap-1.5 text-[#C6F24E]"
                  >
                    <Star size={12} fill="#C6F24E" stroke="#C6F24E" />
                    <span className="bz-mono text-[10px] uppercase tracking-[0.16em]">
                      {isTr ? 'GOOGLE' : 'GOOGLE'}
                    </span>
                  </span>
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
                    <div>
                      <div
                        className="bz-h-tight tabular-nums text-[#C6F24E]"
                        style={{ fontSize: 80, lineHeight: 0.9, letterSpacing: '-0.04em', fontWeight: 500 }}
                      >
                        {reviewsPayload.averageRating != null
                          ? reviewsPayload.averageRating.toFixed(1)
                          : '—'}
                      </div>
                      <div className="mt-2 flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            fill={i < Math.round(reviewsPayload.averageRating ?? 0) ? '#C6F24E' : 'transparent'}
                            stroke={i < Math.round(reviewsPayload.averageRating ?? 0) ? '#C6F24E' : '#262626'}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Inline 5-row distribution (tasarım line 80-92) */}
                    <div className="flex-1">
                      <div className="pulse-eyebrow text-white/55 mb-2">
                        {isTr ? 'SON 12 AY' : 'LAST 12 MONTHS'}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {reviewAnalysis.breakdown.map((d) => {
                          const pct = reviewsPayload.reviews.length
                            ? (d.count / reviewsPayload.reviews.length) * 100
                            : 0;
                          const barColor = d.rating >= 4 ? '#C6F24E' : d.rating === 3 ? '#A3A3A3' : '#7F1D1D';
                          return (
                            <div key={d.rating} className="flex items-center gap-2.5">
                              <span className="bz-mono w-4 text-[11px] text-white/55 tabular-nums">
                                {d.rating}★
                              </span>
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#262626]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: barColor }}
                                />
                              </div>
                              <span className="bz-mono w-10 text-right text-[11px] text-white/55 tabular-nums">
                                {d.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SAĞ: KPI 4-card grid (tasarım line 96-115 — 2x2 bz-card).
                    §38.55 — delta + sub line her KPI'da. */}
                <div className="bz-card grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:p-6">
                  {/* TOPLAM YORUM */}
                  <KpiTile
                    label={isTr ? 'TOPLAM YORUM' : 'TOTAL REVIEWS'}
                    value={reviewsPayload.totalReviewCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                    delta={
                      reviewAnalysis.totalDelta !== 0
                        ? {
                            text: `${reviewAnalysis.totalDelta > 0 ? '+' : ''}${reviewAnalysis.totalDelta}`,
                            sign: reviewAnalysis.totalDelta > 0 ? 1 : -1,
                          }
                        : null
                    }
                    sub={isTr ? 'son 30 gün' : 'last 30 days'}
                  />
                  {/* YANITLANAN */}
                  <KpiTile
                    label={isTr ? 'YANITLANAN' : 'REPLIED'}
                    value={
                      reviewsPayload.reviews.length > 0
                        ? `%${Math.round(reviewAnalysis.currRepliedPct)}`
                        : '—'
                    }
                    delta={
                      reviewAnalysis.repliedRateDelta
                        ? {
                            text: `${reviewAnalysis.repliedRateDelta.sign >= 0 ? '+' : '-'}%${reviewAnalysis.repliedRateDelta.value}`,
                            sign: reviewAnalysis.repliedRateDelta.sign,
                          }
                        : null
                    }
                    sub={isTr ? 'sektör ort. %64' : 'sector avg 64%'}
                  />
                  {/* ORT. YANIT SÜRESİ */}
                  <KpiTile
                    label={isTr ? 'ORT. YANIT SÜRESİ' : 'AVG RESPONSE TIME'}
                    value={
                      reviewAnalysis.avgResponseHours !== null
                        ? reviewAnalysis.avgResponseHours < 1
                          ? `${Math.round(reviewAnalysis.avgResponseHours * 60)} ${isTr ? 'dk' : 'm'}`
                          : `${reviewAnalysis.avgResponseHours.toFixed(1)} ${isTr ? 'sa' : 'h'}`
                        : '—'
                    }
                    delta={
                      reviewAnalysis.avgResponseDelta
                        ? {
                            // Daha kısa süre = iyi → "-X%" pozitif gösterilir (sign -1 ama lime).
                            text: `${reviewAnalysis.avgResponseDelta.sign === -1 ? '-' : '+'}%${reviewAnalysis.avgResponseDelta.value}`,
                            // Improvement: avg lower → positive direction
                            sign: reviewAnalysis.avgResponseDelta.sign === -1 ? 1 : -1,
                          }
                        : null
                    }
                    sub={isTr ? 'AI ile' : 'with AI'}
                  />
                  {/* BU AY YENİ */}
                  <KpiTile
                    label={isTr ? 'BU AY YENİ' : 'NEW THIS MONTH'}
                    value={String(reviewAnalysis.newThisMonth)}
                    delta={
                      reviewAnalysis.newDelta
                        ? {
                            text: `${reviewAnalysis.newDelta.sign >= 0 ? '+' : '-'}%${reviewAnalysis.newDelta.value}`,
                            sign: reviewAnalysis.newDelta.sign,
                          }
                        : null
                    }
                    sub={`${isTr ? 'haftalık' : 'weekly'} ${reviewAnalysis.weeklyAvg}`}
                  />
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
                // §38.55 — PROFİL SAĞLIĞI checklist 4 item (tasarım birebir
                // page-google.jsx line 191-209). Heuristic placeholder
                // pattern: Profil tamlığı + Yanıt oranı (mevcut data) /
                // Fotoğraf sayısı + Q&A bölümü (Google Business Profile API
                // genişletme gerek — backend gap, "yakında" hint).
                const profileComplete = Boolean(
                  status?.connected && status?.selectedLocation?.title,
                );
                const checklist: Array<{
                  label: string;
                  value: string;
                  ok: boolean;
                }> = [
                  {
                    label: isTr ? 'Profil tamlığı' : 'Profile completeness',
                    value: profileComplete ? '%100' : '%50',
                    ok: profileComplete,
                  },
                  {
                    label: isTr ? 'Yanıt oranı' : 'Response rate',
                    value: `%${responseRate}`,
                    ok: responseRate >= 75,
                  },
                  {
                    label: isTr ? 'Fotoğraf sayısı' : 'Photo count',
                    // Backend gap: Google Business Profile media.list API extension gerek (§38.55 backlog)
                    value: isTr ? '— yakında' : '— soon',
                    ok: false,
                  },
                  {
                    label: isTr ? 'Q&A bölümü' : 'Q&A section',
                    // Backend gap: Google Business Profile questions API extension gerek (§38.55 backlog)
                    value: isTr ? '— yakında' : '— soon',
                    ok: false,
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
                  <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    {/* §38.55 — SOL: Reviews stream (tasarım page-google.jsx
                        line 119-179 birebir). bz-card + header (h3 + count
                        badge + 3-tab inline) + divide-y card list. */}
                    <section className="bz-card overflow-hidden p-0">
                      {/* Header */}
                      <div className="flex flex-col gap-3 border-b border-[#EDEDED] px-5 py-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2.5">
                          <h3 className="bz-h-tight text-[15px]">
                            {isTr ? 'Son Google yorumları' : 'Latest Google reviews'}
                          </h3>
                          <span className="inline-flex items-center justify-center rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#525252] tabular-nums">
                            {filteredReviews.length}
                          </span>
                        </div>
                        <div className="flex-1" />
                        <div
                          role="tablist"
                          aria-label={isTr ? 'Yorum filtreleri' : 'Review filters'}
                          className="flex flex-wrap items-center gap-0.5 sm:gap-1"
                        >
                          {(
                            [
                              { id: 'all', tr: 'Tümü', en: 'All', count: tabCounts.all },
                              { id: 'unreplied', tr: 'Yanıtsız', en: 'Unanswered', count: tabCounts.unreplied },
                              { id: 'low', tr: 'Düşük puan', en: 'Low rating', count: tabCounts.low },
                            ] as const
                          ).map((tab) => {
                            const active = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors ${
                                  active
                                    ? 'bg-[#0A0A0A] text-white'
                                    : 'text-[#525252] hover:bg-[#FAFAFA]'
                                }`}
                              >
                                {isTr ? tab.tr : tab.en}
                                {tab.count > 0 && (
                                  <span
                                    className={`bz-mono tabular-nums text-[10px] ${
                                      active ? 'text-white/70' : 'text-[#A3A3A3]'
                                    }`}
                                  >
                                    {tab.count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card list */}
                      <div className="divide-y divide-[#EDEDED]">
                        {filteredReviews.length === 0 ? (
                          <div className="px-5 py-12 text-center text-[13px] text-[#737373]">
                            {activeTab === 'all'
                              ? isTr
                                ? 'Henüz yorum bulunmuyor.'
                                : 'No reviews found yet.'
                              : isTr
                                ? 'Bu filtreyle eşleşen yorum yok.'
                                : 'No reviews match this filter.'}
                          </div>
                        ) : (
                          filteredReviews.map((review) => (
                            <ReviewCard
                              key={review.name}
                              review={review}
                              locale={locale}
                              value={replyText[review.name] ?? ''}
                              onChange={(value) =>
                                setReplyText((prev) => ({ ...prev, [review.name]: value }))
                              }
                              onDraft={() => draftReply(review)}
                              onSend={() => sendReply(review)}
                              drafting={Boolean(drafting[review.name])}
                              replying={Boolean(replying[review.name])}
                              aiEnabled={Boolean(status?.googleAiEnabled)}
                              flagged={flaggedIds.has(review.name)}
                              onFlagToggle={() => toggleFlag(review.name)}
                              restaurantName={
                                restaurants.find((r) => r.id === activeRestaurantId)?.name ?? ''
                              }
                              urgent={
                                starValue(review.starRating) <= 2 &&
                                !review.reviewReply?.comment
                              }
                            />
                          ))
                        )}
                      </div>
                    </section>

                    {/* §38.55 — SAĞ: Right rail (tasarım page-google.jsx line 181-253).
                        Dikey stack: PROFİL SAĞLIĞI + SIK GEÇEN KELİMELER + HIZLI YANIT. */}
                    <aside className="flex flex-col gap-3">
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
                    </aside>
                  </div>
                );
              })()}

              {/* §38.55 — Tab strip + sort dropdown bz-card SİLİNDİ (tasarım
                  birebir, page-google.jsx line 119-179'da Reviews stream
                  bz-card header'ında inline 3-tab; sort dropdown yok).
                  Reviews list de SİLİNDİ — yukarıdaki 1fr 320px grid'in sol
                  kolonu içinde Reviews stream bz-card altında render olur. */}
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
