import type { PlatformId } from '@/components/ui';

// Feedback shape returned by /api/feedback (subset of what we use).
// Backend kontratı dokunulmadı (CLAUDE.md plan §Backend).
export interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  platform: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  aspects?: { service?: number; food?: number; price?: number; atmosphere?: number } | null;
  isReplied?: boolean;
  isFlagged?: boolean;
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

export type ActiveTab = 'all' | 'low' | 'high' | 'redirected';
export type AiTone = 'warm' | 'formal' | 'apologetic';
export type AiSource = 'openai' | 'template' | 'template-fallback' | null;
export type ReplyTone = 'success' | 'error' | 'info';

export type PlatformFilter = 'all' | PlatformId;
export type HasReplyFilter = 'all' | 'pending';
