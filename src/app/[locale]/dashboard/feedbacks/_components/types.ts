import type { PlatformId } from '@/components/ui';

// Feedback shape returned by /api/feedback (subset of what we use).
// Backend kontratı dokunulmadı (CLAUDE.md plan §Backend).
export interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  platform: string | null;
  /** §58 high-rating redirect event (no text). */
  redirected?: boolean;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  // Optional 1–5 aspect ratings the public form can collect (Feedback
  // foodRating / serviceRating / atmosphereRating). The list endpoint returns
  // every Feedback column, so these arrive as-is; null when not asked.
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
  isReplied?: boolean;
  isFlagged?: boolean;
  // §38.56 — Yorumlar Inbox tab kategorileri (Okunmamış / Beklemede).
  // Backend Feedback.isRead + isPending field'ları (migration 20260505230000)
  // ile eşlenir. API response'tan alınır; eski feedback'ler default false.
  isRead?: boolean;
  isPending?: boolean;
  hasPendingAiDraft?: boolean;
  aiAutoDraftEnabled?: boolean;
  aiDraftTone?: 'warm' | 'formal' | 'apologetic' | null;
  restaurant?: { name: string; slug?: string } | null;
}

export interface SentReply {
  id: string;
  body: string;
  channel: string | null;
  status: string | null;
  createdAt: string;
}

export interface DegradedMeta {
  joins: boolean;
  tags: boolean;
  aiDraft?: boolean;
  joinFilters?: boolean;
}

// §38.56 — Tasarım a/page-reviews.jsx 5-tab birebir parity:
// Tümü / Okunmamış (isRead=false) / Düşük puan (rating ≤3) /
// Yanıtlandı (isReplied) / Beklemede (isPending). Eski 'high' / 'redirected'
// / 'today' / 'ai_ready' literal'ları backwards-compat type'da kalır
// (mevcut filter wiring + URL state breaking olmasın); UI'da yeni 5-tab
// FeedbackList'te yer alır, eski 4-tab fallback olarak hâlâ filter logic'i
// destekler (deeplink-friendly).
export type ActiveTab = 'all' | 'unread' | 'low' | 'replied' | 'pending' | 'high' | 'redirected' | 'unreplied' | 'today' | 'ai_ready';
export type AiTone = 'warm' | 'formal' | 'apologetic';
export type AiSource = 'openai' | 'template' | 'template-fallback' | null;
export type ReplyTone = 'success' | 'error' | 'info';

// §38.35 — Tasarım .design-owner-2026/page-reviews.jsx PLATFORM section
// "Buaze QR" pill ekleme. Buaze QR feedback'ler (platform = null + rating)
// UI runtime label fallback paterni (CLAUDE.md §38.34). Filter logic:
// platform === null. Eski PlatformId enum'u korunur (taxonomy değişmez,
// CLAUDE.md §19.4 disiplini).
export type PlatformFilter = 'all' | 'buaze_qr' | PlatformId;
export type HasReplyFilter = 'all' | 'pending';
