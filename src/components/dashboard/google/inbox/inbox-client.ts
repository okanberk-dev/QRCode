/**
 * Google review reply inbox — client types, requests and pure state updates
 * (CLAUDE.md §54). No React here, so the state rules are unit-tested.
 */

export type InboxStatus = 'unreplied' | 'replied' | 'all';
export type InboxTextFilter = 'with' | 'without' | 'all';

export interface InboxFilterState {
  status: InboxStatus;
  stars: number[];
  text: InboxTextFilter;
  from: string;
  to: string;
  q: string;
}

export const DEFAULT_FILTER: InboxFilterState = {
  status: 'unreplied',
  stars: [],
  text: 'all',
  from: '',
  to: '',
  q: '',
};

export interface InboxDraft {
  body: string;
  source: string;
  generatedAt: string;
}

export interface InboxReview {
  id: string;
  reviewId: string;
  reviewName: string;
  reviewerName: string | null;
  reviewerPhotoUrl: string | null;
  isAnonymous: boolean;
  rating: number | null;
  originalText: string | null;
  translatedText: string | null;
  language: string | null;
  createTime: string | null;
  updateTime: string | null;
  hasReply: boolean;
  replyComment: string | null;
  replyUpdateTime: string | null;
  draft: InboxDraft | null;
}

export interface InboxSummary {
  averageRating: number | null;
  totalReviewCount: number;
  stored: number;
  unreplied: number;
  replied: number;
  replyRate: number | null;
  fetchedAt: string | null;
  syncing: boolean;
  lastErrorCode: string | null;
  reviewsUrl: string | null;
  needsSync: boolean;
  activeJobId: string | null;
}

export interface InboxPage {
  items: InboxReview[];
  nextCursor: string | null;
  matching: number;
  summary: InboxSummary;
}

export function filterToQuery(filter: InboxFilterState, extra: Record<string, string> = {}): string {
  const sp = new URLSearchParams();
  sp.set('status', filter.status);
  if (filter.stars.length > 0) sp.set('stars', [...filter.stars].sort().join(','));
  if (filter.text !== 'all') sp.set('text', filter.text);
  if (filter.from) sp.set('from', filter.from);
  if (filter.to) sp.set('to', filter.to);
  if (filter.q.trim()) sp.set('q', filter.q.trim());
  for (const [k, v] of Object.entries(extra)) sp.set(k, v);
  return sp.toString();
}

export function isFilterActive(filter: InboxFilterState): boolean {
  return (
    filter.stars.length > 0 || filter.text !== 'all' || Boolean(filter.from) || Boolean(filter.to) || Boolean(filter.q.trim())
  );
}

/** Bulk replies are allowed only for 4–5★ reviews without a reply. */
export function isBulkEligible(review: Pick<InboxReview, 'rating' | 'hasReply'>): boolean {
  return !review.hasReply && (review.rating ?? 0) >= 4;
}

// ─── state after a reply ─────────────────────────────────────────────────

export interface InboxListState {
  items: InboxReview[];
  matching: number;
  summary: InboxSummary;
}

function withCounts(summary: InboxSummary, replied: number): InboxSummary {
  const unreplied = Math.max(0, summary.stored - replied);
  return {
    ...summary,
    replied,
    unreplied,
    replyRate: summary.stored > 0 ? Math.round((replied / summary.stored) * 100) : null,
  };
}

/**
 * A reply was published. The review shows the reply; counters move at once.
 * In the "Yanıtsız" view the review leaves the list (`leaves: true` — the UI
 * animates it out first, then calls `removeReview`).
 */
export function applyReplySent(
  state: InboxListState,
  reviewId: string,
  reply: { comment: string; updateTime: string | null },
  status: InboxStatus,
): InboxListState & { leaves: boolean } {
  const target = state.items.find((r) => r.reviewId === reviewId);
  if (!target) return { ...state, leaves: false };
  const wasReplied = target.hasReply;
  const items = state.items.map((r) =>
    r.reviewId === reviewId
      ? { ...r, hasReply: true, replyComment: reply.comment, replyUpdateTime: reply.updateTime, draft: null }
      : r,
  );
  const summary = wasReplied ? state.summary : withCounts(state.summary, state.summary.replied + 1);
  return { items, matching: state.matching, summary, leaves: status === 'unreplied' };
}

/** The reply was deleted. In the "Yanıtlandı" view the review leaves the list. */
export function applyReplyDeleted(
  state: InboxListState,
  reviewId: string,
  status: InboxStatus,
): InboxListState & { leaves: boolean } {
  const target = state.items.find((r) => r.reviewId === reviewId);
  if (!target || !target.hasReply) return { ...state, leaves: false };
  const items = state.items.map((r) =>
    r.reviewId === reviewId ? { ...r, hasReply: false, replyComment: null, replyUpdateTime: null } : r,
  );
  return {
    items,
    matching: state.matching,
    summary: withCounts(state.summary, Math.max(0, state.summary.replied - 1)),
    leaves: status === 'replied',
  };
}

export function removeReview(state: InboxListState, reviewId: string): InboxListState {
  const items = state.items.filter((r) => r.reviewId !== reviewId);
  return { ...state, items, matching: Math.max(0, state.matching - (items.length < state.items.length ? 1 : 0)) };
}

/** The review to focus after `reviewId` leaves (next one, else the previous). */
export function neighbourAfter(items: InboxReview[], reviewId: string): string | null {
  const i = items.findIndex((r) => r.reviewId === reviewId);
  if (i < 0) return null;
  return items[i + 1]?.reviewId ?? items[i - 1]?.reviewId ?? null;
}

// ─── copy for error codes ────────────────────────────────────────────────

const ERROR_COPY: Record<string, { tr: string; en: string }> = {
  GOOGLE_REAUTH_REQUIRED: {
    tr: 'Google bağlantısı yenilenmeli. "Yeniden bağla" ile tekrar izin ver.',
    en: 'The Google connection needs renewing. Use "Reconnect" to allow access again.',
  },
  GOOGLE_RATE_LIMITED: {
    tr: 'Google şu an yoğun. Biraz sonra tekrar dene.',
    en: 'Google is busy right now. Try again shortly.',
  },
  GOOGLE_SERVER_ERROR: {
    tr: 'Google yanıt vermedi. Biraz sonra tekrar dene.',
    en: "Google didn't respond. Try again shortly.",
  },
  GOOGLE_NETWORK_ERROR: {
    tr: "Google'a ulaşılamadı. Bağlantını kontrol edip tekrar dene.",
    en: "Couldn't reach Google. Check your connection and try again.",
  },
  GOOGLE_NOT_CONNECTED: { tr: 'Google hesabı bağlı değil.', en: 'Google account is not connected.' },
  GOOGLE_LOCATION_NOT_SELECTED: { tr: 'Google konumu seçilmemiş.', en: 'No Google location selected.' },
  GOOGLE_TENANT_NOT_ALLOWED: {
    tr: 'Google yanıtları bu hesap için henüz açık değil.',
    en: 'Google replies are not open for this account yet.',
  },
  BANNED_PHRASE: {
    tr: 'Yanıt, işletme ayarlarındaki yasaklı ifadeleri içeriyor.',
    en: 'The reply contains phrases banned in the business settings.',
  },
  ALREADY_REPLIED: { tr: 'Bu yorum zaten yanıtlanmış.', en: 'This review already has a reply.' },
  ALREADY_QUEUED: { tr: 'Bu yorum zaten gönderim sırasında.', en: 'This review is already being sent.' },
  LOW_RATING_NOT_ALLOWED: {
    tr: '1-3 yıldızlı yorumlar toplu gönderilemez; tek tek yanıtla.',
    en: '1–3 star reviews cannot be sent in bulk; reply one by one.',
  },
  REVIEW_NOT_FOUND: { tr: 'Yorum Google’da bulunamadı.', en: 'Review not found on Google.' },
  QUOTA_DAILY: {
    tr: 'Günlük Google gönderim sınırına ulaşıldı; kalanlar daha sonra gönderilecek.',
    en: 'Daily Google send limit reached; the rest will be sent later.',
  },
  QUOTA_MINUTE: { tr: 'Google sınırı nedeniyle bekliyor.', en: 'Waiting for the Google limit.' },
  RATE_LIMITED: { tr: 'Çok sık denendi. Biraz bekleyip tekrar dene.', en: 'Too many attempts. Wait a bit and try again.' },
  SYNC_THROTTLED: {
    tr: 'Yorumlar az önce yenilendi. Birkaç dakika sonra tekrar dene.',
    en: 'Reviews were just refreshed. Try again in a few minutes.',
  },
  GOOGLE_REVIEW_MANAGEMENT_DISABLED: {
    tr: 'Google yorum yönetimi bu işletme için kapalı.',
    en: 'Google review management is off for this business.',
  },
  PULSE_AI_DISABLED: { tr: 'Pulse AI bu işletme için kapalı.', en: 'Pulse AI is off for this business.' },
};

export function inboxErrorMessage(code: string | null | undefined, locale: 'tr' | 'en'): string {
  const entry = code ? ERROR_COPY[code] : undefined;
  if (entry) return entry[locale];
  return locale === 'tr' ? 'İşlem tamamlanamadı. Tekrar dene.' : "That didn't work. Please try again.";
}

/** Machine code of an API error body (`code` or `error`). */
export function errorCodeOf(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as { code?: unknown; error?: unknown };
  if (typeof b.code === 'string') return b.code;
  if (typeof b.error === 'string' && /^[A-Z_]+$/.test(b.error)) return b.error;
  return null;
}

/** First words of a draft, sent back so the next drafts open differently. */
export function draftOpeningClient(body: string): string {
  return body.split(/\s+/).slice(0, 4).join(' ');
}
