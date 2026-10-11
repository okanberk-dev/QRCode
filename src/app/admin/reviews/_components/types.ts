import type { PlatformId } from '@/components/ui';

// Admin-scope FeedbackRow — owner ile çoğunlukla aynı, ek alanlar:
//  - isAssigned + assigneeId (admin atama feature'ı)
// Backend kontratı dokunulmadı.
export interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  platform: string | null;
  customerName: string | null;
  customerEmail: string | null;
  isReplied?: boolean;
  isFlagged?: boolean;
  isAssigned?: boolean;
  assigneeId?: string | null;
  // Owner-side state the list endpoint already returns (§38.56 / §38.58).
  // The admin rows show them read-only: unread dot, "Beklemede" and
  // "AI taslağı hazır" chips. Old rows may omit them.
  isRead?: boolean;
  isPending?: boolean;
  hasPendingAiDraft?: boolean;
  restaurantId?: string | null;
  restaurant?: { name: string; slug?: string } | null;
}

// §38.237 — Gönderilen yanıt thread'i. Owner paneli bunu zaten
// `GET /api/feedback/[id]/reply` üzerinden gösteriyordu; admin panelinde
// yalnız "Yanıtlandı" rozeti vardı, yanıt metni görünmüyordu. Aynı
// endpoint (requireFeedbackAccess IDOR'lu) admin tarafında da tüketilir.
export interface SentReply {
  id: string;
  body: string;
  channel: string | null;
  status: string | null;
  createdAt: string;
}

// `/api/feedback/counts` response — admin'in kullandığı endpoint
// (owner client-side derive ediyor; admin bu endpoint'i tüketmeye devam).
export interface CountsResp {
  all: number;
  new: number;
  attention: number;
  replied: number;
}

export interface DegradedMeta {
  joins: boolean;
  tags: boolean;
  aiDraft?: boolean;
  joinFilters?: boolean;
}

export type AdminTab = 'all' | 'new' | 'attention' | 'replied';
export type AiTone = 'warm' | 'formal' | 'apologetic';
export type AiSource = 'openai' | 'template' | 'template-fallback' | null;
export type ReplyTone = 'success' | 'info' | 'error';

// Storage ids (`trendyol_go`, …) plus `buaze_qr` (platform IS NULL) — the
// API already handles both (§0.6 / §0.9 of the inbox redesign).
export type PlatformFilter = 'all' | 'buaze_qr' | PlatformId;
export type HasReplyFilter = 'all' | 'pending';
