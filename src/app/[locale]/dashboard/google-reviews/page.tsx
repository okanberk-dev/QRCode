'use client';

import { use, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
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
  Plug,
} from 'lucide-react';
import { AlertBanner, PageHeader, PulseSelect } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import QuickReplyTemplates from '@/components/dashboard/google-reviews/QuickReplyTemplates';
import { ReputationHealthCard } from '@/components/dashboard/google-reviews/ReputationHealthCard';
import { GoogleConnectFlashBanner } from '@/components/dashboard/google/GoogleConnectFlashBanner';
import { getQuickReplyTemplate } from '@/lib/quick-reply-templates';
import { ACTIVE_BUSINESS_STORAGE_KEY, resolveActiveRestaurantId } from '@/lib/active-business';

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

interface GoogleBusinessAccountLite {
  name: string;
  accountName: string | null;
  type: string | null;
  role: string | null;
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

// Stage 10 — PROFİL SAĞLIĞI gauge data (CLAUDE.md §38.80, §38.55 backlog
// kapanışı). Endpoint: /api/restaurants/[id]/google/business/profile-stats.
// Soft failures degrade individual fields to `null` (UI shows "— yakında"
// placeholder) without taking the gauge offline.
interface ProfileStats {
  profileComplete: boolean;
  mediaCount: number | null;
  totalQuestions: number | null;
  unansweredQuestions: number | null;
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
                  className="bz-btn-lime bz-btn-sm disabled:opacity-60"
                >
                  {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isTr ? 'AI yanıt' : 'AI reply'}
                </button>
              )}
              {!replied && (
                <button
                  type="button"
                  onClick={handleManualClick}
                  className="bz-btn bz-btn-sm"
                >
                  <Send size={12} />
                  {isTr ? 'Manuel' : 'Manual'}
                </button>
              )}
              {replied && (
                <button
                  type="button"
                  onClick={handleEditReply}
                  className="bz-btn bz-btn-sm"
                >
                  <Edit3 size={12} />
                  {isTr ? 'Yanıtı düzenle' : 'Edit reply'}
                </button>
              )}
              <button
                type="button"
                onClick={onFlagToggle}
                className={`${flagged ? 'bz-btn-warn' : 'bz-btn'} bz-btn-sm`}
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
                  className="bz-btn bz-btn-sm"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                {aiEnabled && (
                  <button
                    type="button"
                    onClick={onDraft}
                    disabled={drafting}
                    className="bz-btn bz-btn-sm disabled:opacity-60"
                  >
                    {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {isTr ? 'AI taslağı' : 'AI draft'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSend}
                  disabled={replying || !value.trim()}
                  className="bz-btn-primary bz-btn-sm text-[11.5px] disabled:opacity-60"
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
  const searchParams = useSearchParams();

  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  // §38.B Stage 122 — workspace fetch silent fail bug. Previously
  // `/api/restaurants?limit=50` 4xx/5xx left `restaurants=[]` +
  // `activeRestaurantId=null` without any UI signal — the page stuck
  // on a spinner with no recovery path. Surface the fetch failure as
  // an AlertBanner with retry CTA so owners can act instead of staring
  // at an empty page.
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [reloadWorkspaceKey, setReloadWorkspaceKey] = useState(0);

  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [checkedRestaurantId, setCheckedRestaurantId] = useState<string | null>(null);
  const [reviewsPayload, setReviewsPayload] = useState<ReviewsPayload | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  // Stage 10 — PROFİL SAĞLIĞI real data (CLAUDE.md §38.80). Best-effort
  // fetch alongside reviews; null fields render "— yakında" placeholder
  // instead of failing the gauge.
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Record<string, boolean>>({});
  const [drafting, setDrafting] = useState<Record<string, boolean>>({});
  // §38.55 — 3-tab filter (tasarım birebir page-google.jsx line 125-129).
  // Sort dropdown silindi (default newest first). Flag state korunur — action
  // button "Bildir" toggleFlag ile çalışır (More dropdown UI silindi, ama
  // localStorage flag persistence + action button kalır).
  const [activeTab, setActiveTab] = useState<'all' | 'unreplied' | 'low'>('all');
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  // Inline OAuth + location selection — Platform Bağlantıları sayfasına
  // yönlendirmek yerine kullanıcı bu sayfadan direkt bağlanır + konum seçer.
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Google Business Profile hesabı (account) listesi — kullanıcının "Business
  // Profile" sahibi olup olmadığını UI'da ayırt etmek için. Boş array =
  // Google ile login oldu ama henüz işletme profili açmamış demektir.
  const [inlineAccounts, setInlineAccounts] = useState<GoogleBusinessAccountLite[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [inlineLocations, setInlineLocations] = useState<GoogleLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationRetryAfter, setLocationRetryAfter] = useState<number | null>(null);
  // Backend `source: 'cache' | 'google' | 'empty'` döner — UI rozet
  // (Önbellek) ve "Son senkron" zamanı için kullanılır (CLAUDE.md §5.1).
  const [inlineLocationsSource, setInlineLocationsSource] = useState<'cache' | 'google' | 'empty' | null>(null);
  const [inlineLocationsSyncedAt, setInlineLocationsSyncedAt] = useState<string | null>(null);
  // §38.231 — Google projesinde Business Profile API quota=0 (henüz
  // provision edilmemiş) ise backend `warning: 'GOOGLE_API_NOT_PROVISIONED'`
  // döner. Bu KALICI durum: owner farklı hesap denese de çözülmez (quota
  // proje-geneli). UI "farklı hesapla bağlan" yanıltıcı CTA'sını gizler,
  // owner'a doğru bağlı olduğunu + ek işlem gerekmediğini söyler.
  const [apiNotProvisioned, setApiNotProvisioned] = useState(false);
  // §38.211 — Auto-retry tamamen kaldırıldı (shared API quota
  // anti-pattern). Eski state'ler (autoRetryFiredRef, autoRetryAttemptRef,
  // MAX_AUTO_RETRY_ATTEMPTS, hasAutoRetried) silindi — quota fail
  // durumunda owner sandwich card (§38.208) ile direkt manuel
  // intervention seçenekleri görüyor. Countdown UI sadece "Yenile" buton
  // disable amaçlı (locationRetryAfter state korunur, tick decrement
  // yapar ama retry tetiği yok).
  // §38.206 — Smart "Bu hesapla devam et" akışı. Kullanıcı empty state'te
  // "Bu Google hesabıyla devam et" tıkladıysa flag set edilir; loadInlineLocations
  // force=true ile fresh accounts fetch atılır. Hâlâ accounts boş dönerse
  // "Bu hesapta gerçekten Business Profile yok" mesajı + buton disabled olur
  // ve user "Farklı hesapla bağlan" akışına yönlendirilir. State sayfa
  // unmount / restoran değişikliğinde sıfırlanır (sonraki restoran için
  // fresh state).
  const [hasAttemptedSameAccount, setHasAttemptedSameAccount] = useState(false);
  const [savingLocation, setSavingLocation] = useState<string | null>(null);
  // Refresh token revoke / expired durumlarda "Yeniden Bağla" CTA flag'i.
  // setLocationError ile birlikte set edilir; AlertBanner altında buton görünür.
  const [needsReconnect, setNeedsReconnect] = useState(false);

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
      setWorkspaceError(null);
      try {
        const res = await fetch('/api/restaurants?limit=50');
        if (!res.ok) {
          // §38.B Stage 122 — surface non-2xx instead of silently leaving
          // `restaurants=[]` + `activeRestaurantId=null`. Previously the
          // page sat on the spinner with no recovery path.
          const errData = await res.json().catch(() => ({}));
          setWorkspaceError(
            errData?.error ||
              (isTr
                ? `İşletme listesi alınamadı (HTTP ${res.status}).`
                : `Failed to load businesses (HTTP ${res.status}).`),
          );
          return;
        }
        const data = await res.json();
        const list = data.data ?? [];
        if (!list.length) {
          // §38.B Stage 122 — owner workspace gerçekten boş (yeni hesap,
          // henüz restaurant eklenmedi). Spinner çekilince empty state
          // görünür; aşağıdaki "no business" branch tetiklenir.
          setRestaurants([]);
          setActiveRestaurantId(null);
          return;
        }
        const requested = searchParams.get('restaurantId') ?? searchParams.get('restaurant');
        const stored =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY)
            : null;
        const resolved = resolveActiveRestaurantId({
          restaurants: list,
          queryRestaurantId: requested,
          storedRestaurantId: stored,
        });
        setRestaurants(list);
        setActiveRestaurantId(resolved ?? list[0]?.id ?? null);
      } catch (err) {
        console.error('[google-reviews] workspace fetch failed', {
          message: err instanceof Error ? err.message : 'unknown',
        });
        setWorkspaceError(
          isTr
            ? 'İşletme listesi alınamadı. Bağlantını kontrol edip tekrar dene.'
            : 'Failed to load businesses. Check your connection and try again.',
        );
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [searchParams, isTr, reloadWorkspaceKey]);

  const selectRestaurant = (restaurantId: string) => {
    setActiveRestaurantId(restaurantId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('restaurant');
    params.set('restaurantId', restaurantId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const loadStatusAndReviews = async (restaurantId: string) => {
    setStatusLoading(true);
    setStatus(null);
    setCheckedRestaurantId(null);
    setReviewsPayload(null);
    setReviewsError(null);
    setProfileStats(null);

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

        // Reply text seed sırası:
        //   1. Var olan reviewReply.comment (owner zaten yanıtladıysa)
        //   2. Pre-loaded AI draft (revData.drafts[reviewName].body) — cron
        //      taraması yapılmışsa owner taslakla karşılaşır
        //   3. Boş string (manuel "Taslak Öner" ile veya elle yazılır)
        const drafts = (revData.drafts ?? {}) as Record<string, { body: string; tone: string; source: string }>;
        const replies: Record<string, string> = {};
        for (const review of (revData.reviews ?? []) as GoogleReview[]) {
          if (review.reviewReply?.comment) {
            replies[review.name] = review.reviewReply.comment;
          } else if (drafts[review.name]?.body) {
            replies[review.name] = drafts[review.name].body;
          } else {
            replies[review.name] = '';
          }
        }
        setReplyText(replies);

        // Stage 10 — PROFİL SAĞLIĞI gauge real data (CLAUDE.md §38.80).
        // Fire-and-forget: reviews UI is the primary signal, profile stats
        // is a bonus sub-card. Endpoint already degrades soft on Google API
        // failures (mediaCount / unansweredQuestions → null), and any 4xx
        // here just means the gauge keeps rendering placeholder text — no
        // need to surface a banner.
        try {
          const statsRes = await fetch(
            `/api/restaurants/${restaurantId}/google/business/profile-stats`,
          );
          if (statsRes.ok) {
            const statsData = (await statsRes.json()) as ProfileStats;
            setProfileStats(statsData);
          }
        } catch {
          // soft-fail — gauge keeps "— yakında" placeholder for null fields
        }
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
    // §38.206 — Restoran değişikliğinde "Bu hesapla devam et" denemesi
    // sıfırlanır; sonraki restoran için kullanıcı tekrar smart fallback
    // alabilsin (force refresh flag stale kalmasın).
    setHasAttemptedSameAccount(false);
    // §38.211 — Auto-retry state'leri kaldırıldı; restoran change'de
    // ek reset yok. locationRetryAfter zaten setLoadingLocations true
    // sırasında setLocationRetryAfter(null) ile temizleniyor.
  }, [activeRestaurantId]);

  // OAuth start — Google'a yönlendirir, callback sonrası bu sayfaya geri
  // döner (Platform Bağlantıları'na atmıyor). returnTo URL'inde aktif
  // restaurant ID korunur — kullanıcı bağlandıktan sonra aynı işletme
  // scope'unda kalır.
  const connectGoogleInline = async () => {
    if (!activeRestaurantId || connecting) return;
    setConnecting(true);
    setConnectError(null);
    // Reauth flow'unda eski location error/notice/needsReconnect state'lerini
    // de temizle — OAuth redirect başarılı olunca callback geri dönecek,
    // taze state ile başlasın.
    setLocationError(null);
    setLocationNotice(null);
    setNeedsReconnect(false);
    setLocationRetryAfter(null);
    try {
      const returnTo = `/${locale}/dashboard/google-reviews?restaurantId=${activeRestaurantId}`;
      const res = await fetch('/api/integrations/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setConnectError(data?.message || data?.error || (isTr ? 'Google OAuth başlatılamadı.' : 'Failed to start Google OAuth.'));
        return;
      }
      window.location.href = data.url;
    } catch {
      setConnectError(isTr ? 'Bağlantı hatası.' : 'Network error.');
    } finally {
      setConnecting(false);
    }
  };

  // Google Business Profile location'larını çek. 429 stale cache fallback'i
  // mevcut backend tarafında (CLAUDE.md §40.1 graceful degrade) — UI sarı
  // banner + retry-after countdown gösterir. `force=true` sadece kullanıcı
  // bilinçli "Konumları yenile" butonuna basınca gönderilir; otomatik
  // mount fetch'i cache'i kullanır (CLAUDE.md §5.1 quota strategy).
  const loadInlineLocations = async (force = false, _opts: { resetAutoRetry?: boolean } = {}) => {
    if (!activeRestaurantId) return;
    setLoadingLocations(true);
    setLocationError(null);
    setLocationNotice(null);
    setLocationRetryAfter(null);
    setNeedsReconnect(false);
    setApiNotProvisioned(false);
    // §38.211 — Auto-retry KALDIRILDI (shared API quota anti-pattern,
    // §40.4). resetAutoRetry opt is no-op (signature korunuyor backwards-
    // compat için, ileride state geri eklenirse caller'lar değişmesin).
    // `force` parametresi yine manuel button click vs otomatik
    // remount ayırt eder — backend cache TTL strategy buna güveniyor.
    try {
      const url = `/api/restaurants/${activeRestaurantId}/google/business/locations${
        force ? '?force=true' : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (
        res.ok &&
        (data?.warning === 'GOOGLE_RATE_LIMITED' ||
          data?.warning === 'GOOGLE_API_NOT_PROVISIONED' ||
          data?.warning === 'CLIENT_THROTTLED')
      ) {
        // §38.231 — quota=0 (provision edilmemiş) KALICI durum. "Farklı
        // hesap" yanıltıcı + "60s sonra dene" countdown yanlış sinyal
        // (kalıcı, bekleyince düzelmez). Geçici quota/throttle'dan ayır.
        const notProvisioned = data.warning === 'GOOGLE_API_NOT_PROVISIONED';
        setApiNotProvisioned(notProvisioned);
        setInlineLocations(data.locations ?? []);
        setInlineAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setAccountsLoaded(true);
        setInlineLocationsSource(data.source ?? null);
        setInlineLocationsSyncedAt(typeof data.syncedAt === 'string' ? data.syncedAt : null);
        setLocationNotice(
          data.message ||
            (isTr
              ? 'Google API kotası şu an dolu (tüm Buaze kullanıcıları aynı kotayı paylaşır). Birkaç dakika bekleyin veya farklı bir Google hesabıyla bağlanmayı deneyin.'
              : 'Google API quota currently exhausted (shared across all Buaze users). Wait a few minutes or try connecting with a different Google account.'),
        );
        // §38.211 — UI-side cooldown only (auto-retry kaldırıldı).
        // Backend artık `retryAfterSeconds` göndermiyor (§38.211 backend
        // fix). Frontend manuel "Yenile" mash önleyici için 60s countdown
        // başlatır — bu sadece buton disable + display amaçlı, hiçbir
        // retry tetiği YOK. Sandwich card (§38.208) owner'a "Farklı
        // hesapla bağlan" alternatifini hemen sunuyor.
        // §38.231 — not-provisioned ise countdown YOK (kalıcı durum).
        if (!notProvisioned) setLocationRetryAfter(60);
        return;
      }
      if (!res.ok) {
        if (res.status === 429) {
          // §38.211 — Hard 429 sadece rate-limit (CLIENT_THROTTLED) için
          // tetiklenir; Google quota fail (§38.211 backend fix) artık
          // 200 + warning paterniyle dönüyor (yukarıdaki branch).
          // Backend rate-limit retry-after header gönderir ama auto-retry
          // YOK — owner manuel "Yenile" cooldown'unu bekler. setLocationRetryAfter
          // çağrılmaz → countdown UI tetiklenmez.
          setLocationError(
            data?.error ||
              (isTr
                ? 'Çok sık yenileme. Birkaç dakika sonra tekrar deneyin.'
                : 'Too many refresh requests. Try again in a few minutes.'),
          );
          return;
        }
        if (res.status === 401 || data?.code === 'GOOGLE_REAUTH_REQUIRED' || data?.requiresReauth) {
          // Refresh token süresi doldu / Google revoke etti. Owner için
          // net mesaj + Yeniden Bağla CTA.
          setLocationError(
            isTr
              ? 'Google bağlantınızın süresi doldu. "Yeniden bağla" diyerek izin verin.'
              : 'Your Google connection expired. Click "Reconnect" to grant access again.',
          );
          setNeedsReconnect(true);
          return;
        }
        if (data?.code === 'GOOGLE_NOT_CONNECTED') {
          // İlk OAuth henüz yapılmamış / disconnect olmuş.
          setLocationError(
            isTr
              ? 'Google hesabı bağlı değil. "Google Hesabını Bağla" ile bağlayın.'
              : 'Google account not connected. Click "Connect Google Account".',
          );
          return;
        }
        throw new Error(data?.error || (isTr ? 'Konumlar alınamadı.' : 'Failed to load locations.'));
      }
      setInlineLocations(data.locations ?? []);
      setInlineAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setAccountsLoaded(true);
      setInlineLocationsSource(data.source ?? null);
      setInlineLocationsSyncedAt(typeof data.syncedAt === 'string' ? data.syncedAt : null);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : (isTr ? 'Konumlar alınamadı.' : 'Failed to load locations.'));
    } finally {
      setLoadingLocations(false);
    }
  };

  // Location seç → backend `googlePlaceId` + `googleReviewUrl` kaydeder,
  // status reload eder, otomatik review listesi gelir.
  const selectInlineLocation = async (location: GoogleLocation) => {
    if (!activeRestaurantId || savingLocation) return;
    setSavingLocation(`${location.accountName}:${location.locationName}`);
    setLocationError(null);
    try {
      const res = await fetch(`/api/restaurants/${activeRestaurantId}/google/business/locations/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: location.accountName,
          locationName: location.locationName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || (isTr ? 'Konum kaydedilemedi.' : 'Failed to save location.'));
      // Status + reviews otomatik yüklensin
      void loadStatusAndReviews(activeRestaurantId);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : (isTr ? 'Konum kaydedilemedi.' : 'Failed to save location.'));
    } finally {
      setSavingLocation(null);
    }
  };

  // Connected ama location seçilmedi → otomatik locations çek.
  useEffect(() => {
    if (
      status?.connected &&
      !status.selectedLocation &&
      activeRestaurantId &&
      inlineLocations.length === 0 &&
      !loadingLocations
    ) {
      // §38.207 — Restaurant change / status update = fresh context,
      // auto-retry flag'i resetlenebilir (yeni quota window olabilir).
      void loadInlineLocations(false, { resetAutoRetry: true });
    }
    // Deliberately not depending on loadInlineLocations / loadingLocations
    // to avoid re-run loop after fetch completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.selectedLocation, activeRestaurantId]);

  // §38.211 — Auto-retry KALDIRILDI (anti-pattern for shared API quota).
  // Google quota proje-geneli (1 req/min/proje, §5.1.1): TÜM Buaze
  // kullanıcıları aynı kotayı paylaşır. Eski auto-retry her client'ın
  // retry'ı quota'yı tekrar tüketiyordu → hep birlikte 429 alırlardı →
  // sonsuz döngü. §38.207 auto-retry self-loop fix + §38.209 exponential
  // backoff yumuşatıcıydı ama temel sorunu çözmüyordu çünkü farklı
  // client'lar aynı window içinde retry tetikliyordu.
  //
  // Yeni paterni — manuel intervention only:
  //   - Countdown UI sadece "Yenile" buton disable + display amaçlı
  //   - Tick'ler decrement yapar; 0'a ulaştığında HİÇBİR retry tetiği yok
  //   - Owner sandwich card (§38.208) ile "Farklı hesapla bağlan"
  //     alternatifini direkt görür, veya 60s cooldown sonrası manuel
  //     "Yenile" tıklayabilir
  //
  // Eski auto-retry state'leri (autoRetryFiredRef, autoRetryAttemptRef,
  // MAX_AUTO_RETRY_ATTEMPTS, hasAutoRetried) tamamen silindi — drift
  // kaynağıydı.
  useEffect(() => {
    if (locationRetryAfter === null || locationRetryAfter <= 0) return;
    const interval = setInterval(() => {
      setLocationRetryAfter((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locationRetryAfter]);

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

    // Avg response time delta — prev 30d ile current 30d kıyas.
    // pctDelta(curr, prev) burada sign=-1 döner çünkü süre İYİLEŞİNCE
    // (curr < prev) fark negatiftir. Render tarafı bu sign=-1'i lime/pozitif
    // rozete çevirir ("daha düşük süre = iyi") — aşağıdaki avgResponseDelta
    // render bloğundaki telafi edici ters çevirmeye bakın. Argüman sırasını
    // değiştirmeyin: render'daki inversion'la birlikte sonuç zaten doğru.
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

  // Stage 28 §38.104 Fix O3-partial — health score memoize.
  // PROFİL SAĞLIĞI gauge inline IIFE'inde (line ~1194) `computeHealthScore`
  // her render'da yeniden çalışıyordu. 50+ review'lı dashboard'larda
  // dependency array değişmediğinde re-render skip kazandırır.
  // `extractKeywords` zaten reviewAnalysis useMemo içinde — dokunulmadı.
  const healthScore = useMemo(() => {
    if (!reviewsPayload) return null;
    return computeHealthScore({
      avgRating: reviewsPayload.averageRating,
      total: reviewsPayload.totalReviewCount,
      replied: reviewAnalysis.replied,
    });
  }, [reviewsPayload, reviewAnalysis.replied]);

  const statusIsReady = Boolean(
    activeRestaurantId && checkedRestaurantId === activeRestaurantId && status,
  );
  const shouldShowStatusLoading = loadingInitial || statusLoading || Boolean(activeRestaurantId && !statusIsReady && !reviewsError);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      {/* §38 audit Fix #1 — connect button returnTo bu sayfa, callback
          ?google=connected|state-*|token-* status'lerini yakalar. */}
      <GoogleConnectFlashBanner locale={isTr ? 'tr' : 'en'} />
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
          <PulseSelect
            value={activeRestaurantId ?? ''}
            onChange={selectRestaurant}
            options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
            ariaLabel={isTr ? 'İşletme seç' : 'Select business'}
            className="w-full max-w-sm"
          />
        </div>
      )}

      {/* §38.72 — Workspace cross-link hint. Owner için Google Yorumları
          tek-platform; tüm platform durumu için /dashboard/platforms
          workspace overview'a link. Audit Agent #2 #1 (CLAUDE.md §38.72). */}
      <div className="mb-5 flex items-center gap-2 text-[12px] text-[#525252]">
        <Plug size={12} strokeWidth={2} className="shrink-0" />
        <span>
          {isTr ? 'Diğer platformları da yönetmek için ' : 'Manage other platforms in '}
          <Link
            href={`/${locale}/dashboard/platforms`}
            className="font-medium text-[#0A0A0A] underline-offset-2 hover:underline"
          >
            {isTr ? 'Platform Bağlantıları' : 'Platform Links'}
          </Link>
          {isTr ? ' sayfasına git.' : '.'}
        </span>
      </div>

      {workspaceError ? (
        // §38.B Stage 122 — `/api/restaurants?limit=50` fail. Previously
        // silent (spinner stuck forever); now surfaces with retry CTA so
        // the owner can recover without reloading the whole page.
        <div className="mt-6 space-y-4">
          <AlertBanner kind="danger">{workspaceError}</AlertBanner>
          <button
            type="button"
            className="bz-btn-ghost inline-flex items-center gap-1.5 rounded-full text-[12px]"
            onClick={() => setReloadWorkspaceKey((n) => n + 1)}
          >
            <RefreshCw size={13} />
            {isTr ? 'Tekrar dene' : 'Try again'}
          </button>
        </div>
      ) : shouldShowStatusLoading ? (
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
      ) : !status?.connected ? (
        // STEP 1 — Google bağlı değil. Inline Connect butonu.
        <div className="mt-6 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
          <Plug size={40} strokeWidth={1.5} className="mx-auto text-[#A3A3A3] mb-4" />
          <h3 className="text-[18px] font-medium text-[#0A0A0A] mb-2">
            {isTr ? "Google hesabınız bağlı değil" : "Google account is not connected"}
          </h3>
          <p className="text-[14px] text-[#525252] max-w-md mx-auto mb-6">
            {isTr
              ? "Müşterilerinizin Google'a bıraktığı yorumları bu sayfadan okumak ve yanıtlamak için Google Business hesabınızı bağlayın."
              : "Connect your Google Business account to read and reply to reviews your customers left on Google."}
          </p>
          {connectError && (
            <div className="max-w-md mx-auto mb-4">
              <AlertBanner kind="danger" onDismiss={() => setConnectError(null)}>
                {connectError}
              </AlertBanner>
            </div>
          )}
          <button
            onClick={connectGoogleInline}
            disabled={connecting}
            className="bz-btn-primary inline-flex items-center gap-2 px-6 rounded-full"
          >
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
            {isTr ? "Google Hesabını Bağla" : "Connect Google Account"}
          </button>
          <p className="text-[12px] text-[#737373] mt-3">
            {isTr
              ? 'Google ile güvenli giriş yapacaksınız. Bu sayfaya geri döneceksiniz.'
              : 'You will be redirected to Google for secure sign-in. You will return here.'}
          </p>
        </div>
      ) : !status?.selectedLocation ? (
        // STEP 2 — Google bağlı ama location seçilmedi. Inline location list.
        <div className="mt-6 rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF9B8]">
              <MapPin size={20} strokeWidth={2} className="text-[#0A0A0A]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-medium text-[#0A0A0A]">
                {isTr ? 'Konumunuzu seçin' : 'Select your location'}
              </h3>
              <p className="text-[13px] text-[#525252] mt-1 leading-relaxed">
                {isTr
                  ? 'Google hesabınız bağlandı. Yorumları çekmek istediğiniz Business Profile konumunu seçin.'
                  : 'Your Google account is connected. Pick the Business Profile location to load reviews from.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadInlineLocations(true, { resetAutoRetry: true })}
              disabled={loadingLocations || (locationRetryAfter !== null && locationRetryAfter > 0)}
              className="bz-btn-ghost shrink-0 inline-flex items-center gap-1.5 rounded-full text-[12.5px]"
              aria-label={isTr ? 'Konumları yenile' : 'Refresh locations'}
              title={
                inlineLocationsSyncedAt
                  ? `${isTr ? 'Son senkron' : 'Last sync'}: ${(() => {
                      const ts = Date.parse(inlineLocationsSyncedAt);
                      if (!Number.isFinite(ts)) return inlineLocationsSyncedAt;
                      const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
                      if (diffSec < 60) return isTr ? 'az önce' : 'just now';
                      const min = Math.floor(diffSec / 60);
                      if (min < 60) return isTr ? `${min} dk önce` : `${min} min ago`;
                      const hr = Math.floor(min / 60);
                      if (hr < 24) return isTr ? `${hr} sa önce` : `${hr} h ago`;
                      return isTr ? `${Math.floor(hr / 24)} gün önce` : `${Math.floor(hr / 24)}d ago`;
                    })()}`
                  : undefined
              }
            >
              {loadingLocations ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {locationRetryAfter !== null && locationRetryAfter > 0
                ? `${locationRetryAfter}s`
                : isTr
                  ? 'Yenile'
                  : 'Refresh'}
            </button>
          </div>

          {locationError && (
            <div className="space-y-2">
              <AlertBanner kind="danger" onDismiss={() => setLocationError(null)}>
                {locationError}
              </AlertBanner>
              {needsReconnect && (
                <button
                  type="button"
                  onClick={connectGoogleInline}
                  disabled={connecting}
                  className="bz-btn-primary inline-flex items-center gap-2 rounded-full text-[13px]"
                >
                  {connecting ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                  {isTr ? 'Yeniden bağla' : 'Reconnect'}
                </button>
              )}
            </div>
          )}
          {locationNotice && !locationError && (
            <div className="space-y-2">
              <AlertBanner kind="warn" onDismiss={() => setLocationNotice(null)}>
                {locationNotice}
              </AlertBanner>
              {/* §38.208 — Sarı banner görünüyor + accounts boş ise direkt
                  sandwich hint kart. Eski koşul `hasAutoRetried` kullanıcıyı
                  60 sn countdown beklemeye zorluyordu — sayfa yeni açıldı
                  ve sarı banner var ise henüz auto-retry tetiklenmedi →
                  sandwich kart görünmüyordu. Şimdi: sarı banner görünür
                  görmez "Farklı hesapla bağlan" alternatif aksiyon kartı
                  beraberinde görünür. Owner countdown'u beklemek zorunda
                  değil. (CLAUDE.md §5.1.1 quota proje-geneli, 1 req/dk,
                  tüm Buaze kullanıcıları paylaşır — bekleme bazen yetmez,
                  alternative hesap önerisi her durumda anlamlı.)

                  §38.231 — quota=0 (provision edilmemiş) KALICI durumda
                  bu "farklı hesapla bağlan" kartı GİZLENİR: quota
                  proje-geneli olduğu için hesap değiştirmek çözmez,
                  owner'ı boşuna uğraştırır. Backend'in net sarı banner
                  mesajı (apiNotProvisioned) yeterli. */}
              {inlineAccounts.length === 0 && !apiNotProvisioned && (
                <div className="rounded-xl bg-white border border-[#FDE68A] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Sparkles size={14} className="shrink-0 text-[#92400E] mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-[#0A0A0A] leading-relaxed">
                        {isTr
                          ? 'Beklemek istemiyorsanız farklı bir Google hesabıyla bağlanmayı deneyebilirsiniz. Business Profile genelde Buaze\'ye kayıt olduğunuz Google hesabından farklı bir hesapta olur — doğru hesabı seçmek quota\'yı bypass edebilir.'
                          : 'Instead of waiting, you can try a different Google account. Your Google Business Profile is usually under a different Google account than the one you signed up with — picking the right account may bypass the quota.'}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await fetch('/api/integrations/google/disconnect', { method: 'POST' });
                          } catch {
                            // best-effort
                          }
                          // §38.211 — Auto-retry state'leri kaldırıldı.
                          setHasAttemptedSameAccount(false);
                          await connectGoogleInline();
                        }}
                        disabled={connecting}
                        className="bz-btn-primary inline-flex items-center gap-1.5 text-[12.5px] rounded-full mt-2"
                      >
                        {connecting ? <Loader2 size={13} className="animate-spin" /> : <Unplug size={13} />}
                        {isTr ? 'Farklı Google hesabıyla bağlan' : 'Switch Google account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingLocations && inlineLocations.length === 0 ? (
            <div className="py-8 text-center">
              <Loader2 size={24} className="animate-spin text-[#A3A3A3] mx-auto" />
              <p className="text-[12.5px] text-[#737373] mt-2">
                {isTr ? 'Konumlar yükleniyor…' : 'Loading locations…'}
              </p>
            </div>
          ) : !loadingLocations && !locationError && accountsLoaded && inlineAccounts.length === 0 && inlineLocationsSource !== 'empty' && (locationRetryAfter === null || locationRetryAfter === 0) ? (
            // No-account state — Google ile login oldu ama Business Profile yok.
            //
            // §38.205 — `inlineLocationsSource !== 'empty'` + countdown=0 guard
            // false-positive'ı önler (quota dolu + cache empty → mesaj gösterme).
            //
            // §38.206 — Gerçek dünya gözlemi (CLAUDE.md §38.206 closure log):
            // kullanıcılar Buaze'ye kişisel Google ile kayıt oluyor ama
            // Google Business Profile **farklı** Google hesabında. CTA
            // hierarchy bu gözleme göre kurgulandı:
            //
            //   1. PRIMARY (lime, default vurgu): "Farklı Google hesabıyla
            //      bağlan" — owner gerçek niyeti (Business Profile başka
            //      hesapta).
            //   2. SECONDARY (ghost, smart fallback): "Bu hesapla devam et"
            //      — owner emin ise force refresh dener; hâlâ boş ise
            //      `hasAttemptedSameAccount` flag set + buton disabled
            //      + warning text + Primary CTA'ya yönlendirir.
            //   3. TERTIARY (ghost, son çare): "Yeni profil oluştur" —
            //      gerçekten Business Profile yoksa Google'a yönlendirir.
            <div className="py-6 px-4 rounded-2xl bg-[#EAF9B8]/40 border border-[#C6F24E]/50">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] shadow-sm">
                  <Building2 size={20} strokeWidth={2} className="text-[#0A0A0A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="bz-h-tight text-[15px] text-[#0A0A0A]">
                    {isTr
                      ? 'Google Business hesabınız muhtemelen farklı bir Google hesabında'
                      : 'Your Google Business account is likely under a different Google account'}
                  </p>
                  <p className="text-[13px] text-[#525252] mt-1.5 leading-relaxed">
                    {isTr
                      ? 'Genelde Buaze\'ye kayıt olduğunuz Google hesabı (kişisel e-postanız) ile Google Business Profile\'ın bağlı olduğu Google hesabı farklı olur. İşletmenizin Google yorumlarını yönetmek için doğru hesabı seçin.'
                      : 'Most people sign up to Buaze with their personal Google account, but their Google Business Profile is linked to a different Google account (often a business email). To manage your Google reviews, please pick the right account.'}
                  </p>
                  {hasAttemptedSameAccount && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-white border border-[#FDE68A] px-3 py-2.5">
                      <Sparkles size={13} className="shrink-0 text-[#92400E] mt-0.5" />
                      <p className="text-[12px] text-[#92400E] leading-relaxed">
                        {isTr
                          ? 'Bu Google hesabında gerçekten Business Profile yok. Lütfen "Farklı hesapla bağlan" diyerek doğru hesabı seçin veya yeni bir profil oluşturun.'
                          : 'This Google account really has no Business Profile. Please pick the right account via "Switch Google account" or create a new profile.'}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={async () => {
                        // PRIMARY — Disconnect mevcut Google integration + fresh OAuth.
                        // `prompt=consent select_account` (§38.205 + connect/route.ts)
                        // Google account picker'ını her seferinde tetikler →
                        // owner Business Profile sahibi olduğu hesabı seçer.
                        try {
                          await fetch('/api/integrations/google/disconnect', { method: 'POST' });
                        } catch {
                          // best-effort — connect yine yapılır
                        }
                        setHasAttemptedSameAccount(false);
                        await connectGoogleInline();
                      }}
                      disabled={connecting}
                      className="bz-btn-primary inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      {connecting ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                      {isTr ? 'Farklı Google hesabıyla bağlan' : 'Connect with a different Google account'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // SECONDARY — Owner "Hayır, kayıt olduğum hesap doğru"
                        // diyorsa force refresh ile Google API'den fresh
                        // accounts fetch dener. Cache bypass. Manuel trigger
                        // → auto-retry flag'i resetlenir (§38.207).
                        setHasAttemptedSameAccount(true);
                        await loadInlineLocations(true, { resetAutoRetry: true });
                      }}
                      disabled={
                        loadingLocations ||
                        (locationRetryAfter !== null && locationRetryAfter > 0) ||
                        hasAttemptedSameAccount
                      }
                      className="bz-btn-ghost inline-flex items-center gap-1.5 text-[13px] rounded-full"
                      title={
                        hasAttemptedSameAccount
                          ? isTr
                            ? 'Bu hesap denendi, Business Profile bulunamadı'
                            : 'This account was tried, no Business Profile found'
                          : undefined
                      }
                    >
                      {loadingLocations && hasAttemptedSameAccount ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {hasAttemptedSameAccount
                        ? (isTr ? 'Denendi — Business Profile yok' : 'Tried — no Business Profile')
                        : (isTr ? 'Bu hesapla devam et' : 'Continue with this account')}
                    </button>
                    <a
                      href="https://business.google.com/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bz-btn-ghost inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      <ExternalLink size={13} />
                      {isTr ? 'Yeni profil oluştur' : 'Create new profile'}
                    </a>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#C6F24E]/30 flex items-start gap-2">
                    <Sparkles size={12} className="shrink-0 text-[#525252] mt-0.5" />
                    <p className="text-[11.5px] text-[#525252] leading-relaxed">
                      {isTr
                        ? 'İpucu: Google Business Profile sahibiyseniz, "Farklı hesapla bağlan"a tıklayın ve işletmenizin kayıtlı olduğu Google hesabını seçin. Eğer hiç profil açmadıysanız "Yeni profil oluştur" ile başlayın; Google posta/telefon/video doğrulama bekleyebilir.'
                        : 'Tip: If you own a Google Business Profile, click "Connect with a different Google account" and pick the Google account it\'s registered under. If you haven\'t created one yet, start with "Create new profile"; Google may require verification (postcard, phone, or video).'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !loadingLocations && !locationError && accountsLoaded && inlineLocations.length === 0 && inlineLocationsSource !== 'empty' ? (
            // Account exists but no location — owner Business Profile açtı ama
            // henüz konum eklemedi. Distinct mesaj. Pulse lime UX.
            <div className="py-6 px-4 rounded-2xl bg-[#EAF9B8]/40 border border-[#C6F24E]/50">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] shadow-sm">
                  <MapPin size={20} strokeWidth={2} className="text-[#0A0A0A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="bz-h-tight text-[15px] text-[#0A0A0A]">
                    {isTr
                      ? 'Profilinizde henüz konum yok'
                      : 'No location in your profile yet'}
                  </p>
                  <p className="text-[13px] text-[#525252] mt-1.5 leading-relaxed">
                    {isTr
                      ? `${inlineAccounts.length} Business Profile hesabınız bağlı, fakat henüz hiç konum (lokasyon) eklenmemiş. Google'da işletme konumu açıp doğruladıktan sonra burada görünecek.`
                      : `${inlineAccounts.length} Business Profile account connected, but no location has been added yet. Add and verify a location on Google to see it here.`}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <a
                      href="https://business.google.com/locations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bz-btn-primary inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      <ExternalLink size={13} />
                      {isTr ? 'Google\'da konum ekle' : 'Add location on Google'}
                    </a>
                    <button
                      type="button"
                      onClick={() => loadInlineLocations(true, { resetAutoRetry: true })}
                      disabled={loadingLocations || (locationRetryAfter !== null && locationRetryAfter > 0)}
                      className="bz-btn-ghost inline-flex items-center gap-1.5 text-[13px] rounded-full"
                    >
                      <RefreshCw size={13} />
                      {isTr ? 'Yenile' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {inlineLocationsSyncedAt && (
                <div className="mt-4 text-[11px] text-[#737373]">
                  {isTr ? 'Son senkron' : 'Last sync'}: {(() => {
                    const ts = Date.parse(inlineLocationsSyncedAt);
                    if (!Number.isFinite(ts)) return inlineLocationsSyncedAt;
                    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
                    if (diffSec < 60) return isTr ? 'az önce' : 'just now';
                    const min = Math.floor(diffSec / 60);
                    if (min < 60) return isTr ? `${min} dk önce` : `${min} min ago`;
                    const hr = Math.floor(min / 60);
                    if (hr < 24) return isTr ? `${hr} sa önce` : `${hr} h ago`;
                    return isTr ? `${Math.floor(hr / 24)} gün önce` : `${Math.floor(hr / 24)}d ago`;
                  })()}
                  {inlineLocationsSource === 'cache' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] text-[#525252]">
                      {isTr ? 'Önbellek' : 'Cached'}
                    </span>
                  )}
                </div>
              )}
              <div className="grid gap-2 mt-2">
                {inlineLocations.map((location) => {
                  const key = `${location.accountName}:${location.locationName}`;
                  const saving = savingLocation === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => selectInlineLocation(location)}
                      disabled={Boolean(savingLocation)}
                      className="group rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3.5 text-left transition hover:border-[#0A0A0A] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-3"
                    >
                      <MapPin size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-[#737373] group-hover:text-[#0A0A0A]" />
                      <div className="flex-1 min-w-0">
                        <div className="bz-h-tight text-[14px] truncate">{location.title}</div>
                        {location.address && (
                          <div className="text-[12px] text-[#737373] mt-0.5 truncate">
                            {location.address}
                          </div>
                        )}
                      </div>
                      {saving && <Loader2 size={14} className="animate-spin text-[#0A0A0A] shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
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
                className="bz-btn-danger text-[12px]"
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

          {/* Reputation OS Suite — health score + recommendations card.
              Üstte yer alır, owner ilk göz attığında bugün/baseline/öneri
              özetini görür. CLAUDE.md §X. */}
          {activeRestaurantId && status?.connected && status?.selectedLocation && (
            <ReputationHealthCard restaurantId={activeRestaurantId} locale={locale} />
          )}

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
                // Stage 28 §38.104 Fix O3-partial — memoized score reuse.
                // healthScore useMemo (line ~875) `reviewsPayload` truthy
                // guard'ı IIFE öncesi sağlandığı için non-null garanti
                // (parent JSX `reviewsPayload && (...)` line 1042).
                const score = healthScore ?? 0;
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
                // §38.55 + §38.80 — PROFİL SAĞLIĞI checklist 4 item (tasarım
                // birebir page-google.jsx line 191-209). Profil tamlığı + Yanıt
                // oranı mevcut response data'dan; Stage 10 ile Fotoğraf sayısı
                // + Q&A bölümü Google Business Profile API'sinden (media + Q&A
                // helpers — CLAUDE.md §38.80). profileStats null veya tek tek
                // alan null → "— yakında" placeholder (Q&A API operatör Cloud
                // projesinde devre dışı olabilir, gauge'ı offline almaz).
                const profileComplete = Boolean(
                  profileStats?.profileComplete ??
                    (status?.connected && status?.selectedLocation?.title),
                );
                const placeholder = isTr ? '— yakında' : '— soon';
                const photoValue =
                  profileStats && profileStats.mediaCount != null
                    ? profileStats.mediaCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')
                    : placeholder;
                const photoOk =
                  profileStats?.mediaCount != null && profileStats.mediaCount >= 5;
                const unanswered = profileStats?.unansweredQuestions;
                const qaValue =
                  profileStats && unanswered != null
                    ? unanswered === 0
                      ? isTr
                        ? 'Hepsi yanıtlandı'
                        : 'All answered'
                      : isTr
                        ? `${unanswered} yanıt bekliyor`
                        : `${unanswered} pending`
                    : placeholder;
                const qaOk = unanswered != null && unanswered === 0;
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
                    value: photoValue,
                    ok: photoOk,
                  },
                  {
                    label: isTr ? 'Q&A bölümü' : 'Q&A section',
                    value: qaValue,
                    ok: qaOk,
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

export default function GoogleReviewsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="animate-spin text-[#0A0A0A]" size={24} />
        </div>
      }
    >
      <GoogleReviewsContent locale={locale} />
    </Suspense>
  );
}
