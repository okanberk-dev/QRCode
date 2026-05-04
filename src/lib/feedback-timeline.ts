// Phase 8c+ §38.33 — Yorumlar detay panelinde ZAMAN ÇİZELGESİ timeline
// helper. Tasarım kaynağı: .design-owner-2026/project/page-reviews.jsx
// line 223-243 (3-event minimum: Yorum alındı / Notification gönderildi /
// AI taslak hazırlandı). Saf fonksiyon — DB çağrısı yok, caller helper'a
// 4 source row'unu geçirir; helper kronolojik sıraya dizer + locale label.
//
// Kullanıcı kararı (CLAUDE.md §38.33): Yeni FeedbackAuditLog tablosu YOK
// (mevcut data derive yeterli). Backend genişletme: Feedback +
// FeedbackAiDraft + FeedbackReply + LifecycleEmailLog union.

export type TimelineEventType = 'received' | 'notification' | 'ai_draft' | 'replied';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: Date;
  /** "Yorum alındı" | "Bildirim gönderildi" | "AI taslak hazırlandı" | "Yanıt gönderildi". */
  title: string;
  /** "Google üzerinden" | "1.4s" | "Müşteri e-postası" | undefined — sağda mute renk. */
  meta?: string;
}

// ---- Input shapes (Prisma findUnique/findMany select'lerinden) ----

export interface TimelineFeedbackInput {
  id: string;
  createdAt: Date;
  /** "google" | "yemeksepeti" | "trendyol_go" | null — meta için locale-aware. */
  platform: string | null;
}

export interface TimelineAiDraftInput {
  id: string;
  generatedAt: Date;
  /** Latency in ms (örn. 1400 → "1.4s" meta string). null fallback "GPT-4o". */
  latencyMs: number | null;
}

export interface TimelineReplyInput {
  id: string;
  createdAt: Date;
  /** "manual" | "ai_copilot" | "template_fallback" — locale-aware label seçimi. */
  source: string | null;
  /** "internal" | "email" — meta için "müşteri e-postası" vs "dahili kayıt". */
  channel: string | null;
}

export interface TimelineSystemEventInput {
  id: string;
  type: string;
  sentAt: Date;
}

export interface BuildFeedbackTimelineInput {
  feedback: TimelineFeedbackInput;
  aiDraft?: TimelineAiDraftInput | null;
  replies?: TimelineReplyInput[];
  systemEvents?: TimelineSystemEventInput[];
  isTr?: boolean;
}

// ---- Locale strings ----

const COPY = {
  tr: {
    received: (platform: string | null) =>
      platform ? `${PLATFORM_LABELS[platform] ?? platform} üzerinden` : 'QR kod ile',
    receivedTitle: 'Yorum alındı',
    notificationTitle: 'Bildirim gönderildi',
    notificationMeta: 'E-posta · operasyon ekibi',
    aiDraftTitle: 'AI taslak hazırlandı',
    aiDraftMetaWithLatency: (s: string) => `${s} · GPT-4o`,
    aiDraftMetaNoLatency: 'GPT-4o',
    repliedManualTitle: 'Yanıt gönderildi',
    repliedAiTitle: 'AI yanıtı gönderildi',
    repliedTemplateTitle: 'Şablon yanıt gönderildi',
    repliedMetaEmail: 'müşteri e-postası',
    repliedMetaInternal: 'dahili kayıt',
  },
  en: {
    received: (platform: string | null) =>
      platform ? `via ${PLATFORM_LABELS[platform] ?? platform}` : 'via QR code',
    receivedTitle: 'Review received',
    notificationTitle: 'Notification sent',
    notificationMeta: 'Email · ops team',
    aiDraftTitle: 'AI draft prepared',
    aiDraftMetaWithLatency: (s: string) => `${s} · GPT-4o`,
    aiDraftMetaNoLatency: 'GPT-4o',
    repliedManualTitle: 'Reply sent',
    repliedAiTitle: 'AI reply sent',
    repliedTemplateTitle: 'Template reply sent',
    repliedMetaEmail: 'customer email',
    repliedMetaInternal: 'internal record',
  },
} as const;

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  zomato: 'Zomato',
};

// ---- Latency formatter ----

function formatLatency(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---- System event filter — sadece feedback'e ilgili türler ----

const FEEDBACK_RELATED_SYSTEM_TYPES = new Set([
  // Bu feedback için tetiklenen mail event'leri (alarm/notification semantic)
  'low_rating_alert',
  'reply_notification',
  'feedback_received',
]);

// ---- Public helper ----

export function buildFeedbackTimeline({
  feedback,
  aiDraft = null,
  replies = [],
  systemEvents = [],
  isTr = true,
}: BuildFeedbackTimelineInput): TimelineEvent[] {
  const c = COPY[isTr ? 'tr' : 'en'];
  const events: TimelineEvent[] = [];

  // 1. Received event — Feedback.createdAt
  events.push({
    id: `received:${feedback.id}`,
    type: 'received',
    timestamp: feedback.createdAt,
    title: c.receivedTitle,
    meta: c.received(feedback.platform),
  });

  // 2. AI Draft event — FeedbackAiDraft.generatedAt (varsa)
  if (aiDraft) {
    const latencyStr = formatLatency(aiDraft.latencyMs);
    events.push({
      id: `ai_draft:${aiDraft.id}`,
      type: 'ai_draft',
      timestamp: aiDraft.generatedAt,
      title: c.aiDraftTitle,
      meta: latencyStr ? c.aiDraftMetaWithLatency(latencyStr) : c.aiDraftMetaNoLatency,
    });
  }

  // 3. System events — sadece feedback-related types (LifecycleEmailLog yorum
  // notification olarak rol oynayabilir; generic "weekly_report" gibi yorum
  // bağlamsız event'ler atlandı).
  for (const s of systemEvents) {
    if (!FEEDBACK_RELATED_SYSTEM_TYPES.has(s.type)) continue;
    events.push({
      id: `system:${s.id}`,
      type: 'notification',
      timestamp: s.sentAt,
      title: c.notificationTitle,
      meta: c.notificationMeta,
    });
  }

  // 4. Reply events — FeedbackReply.createdAt (her bir reply ayrı satır)
  for (const r of replies) {
    let title: string = c.repliedManualTitle;
    if (r.source === 'ai_copilot') title = c.repliedAiTitle;
    else if (r.source === 'template_fallback') title = c.repliedTemplateTitle;
    events.push({
      id: `reply:${r.id}`,
      type: 'replied',
      timestamp: r.createdAt,
      title,
      meta: r.channel === 'email' ? c.repliedMetaEmail : c.repliedMetaInternal,
    });
  }

  // Sort kronolojik (eski → yeni). Tasarımda timeline alttan üste: en eski
  // event üstte (Yorum alındı 14 dk önce → Notification → AI taslak), final
  // sort asc. Caller UI'da reverse edebilir veya direkt render eder.
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return events;
}
