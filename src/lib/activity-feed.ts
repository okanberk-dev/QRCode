// Phase 8c+ §38.31 — Owner dashboard CANLI AKIŞ timeline helper.
// Tasarım kaynağı: .design-owner-2026/project/page-dashboard.jsx ActivityRow
// line 120-132 (5-row mix: yorum bıraktı / AI yanıt önerisi / sistem rapor).
//
// 4 farklı kaynak union'u — saf fonksiyon, DB çağrısı yok. Caller
// (dashboard server component) Prisma'dan ham row'ları çeker, helper'a geçirir.
// Sort + slice + sentiment derive tek pass.

export type ActivityType = 'feedback' | 'reply' | 'ai_draft' | 'system';
export type ActivitySentiment = 'pos' | 'neu' | 'neg';

export interface ActivityEvent {
  /** Stable key (UI render). */
  id: string;
  type: ActivityType;
  /** Olay zamanı (sort key). */
  timestamp: Date;
  /** "Ayşe D." | "AI Asistan" | "Sistem" | restoran adı. */
  actor: string;
  /** "yorum bıraktı" | "yanıt önerisi hazırladı" | "günlük rapor gönderildi". */
  action: string;
  /** "★★★★★ Google" | "Mehmet T." | "owner@example.com" — sağda mute renk. */
  target: string;
  sentiment: ActivitySentiment;
  /** Opsiyonel deep link (tıklayınca feedback detayı veya benzeri). */
  href?: string;
}

// ---- Input row shapes (Prisma findMany select'lerinden) ----

export interface FeedbackInput {
  id: string;
  name: string | null;
  rating: number | null;
  platform: string | null;
  createdAt: Date;
  restaurantId: string | null;
  /** Restaurant.locale (TR/EN); locale-aware fallback için opsiyonel. */
  restaurant?: { name: string } | null;
  /** §38.32 — KVKK consent flag. false → name expose etmez, "Müşteri" fallback. */
  hasKvkkConsent?: boolean | null;
}

export interface FeedbackReplyInput {
  id: string;
  createdAt: Date;
  /** "manual" | "ai_copilot" | "template_fallback" — AI ile owner ayırt için. */
  source: string | null;
  feedback: {
    id: string;
    name: string | null;
    rating: number | null;
    platform: string | null;
  };
}

export interface FeedbackAiDraftInput {
  id: string;
  generatedAt: Date;
  feedback: {
    id: string;
    name: string | null;
  };
}

export interface SystemEventInput {
  id: string;
  type: string;
  sentAt: Date;
  metadata?: unknown;
}

export interface BuildActivityFeedInput {
  feedbacks: FeedbackInput[];
  replies: FeedbackReplyInput[];
  aiDrafts: FeedbackAiDraftInput[];
  systemEvents: SystemEventInput[];
  /** Default 5. UI render limit. */
  limit?: number;
  isTr?: boolean;
}

// ---- Locale strings ----

const COPY = {
  tr: {
    feedbackAction: 'yorum bıraktı',
    replyManualAction: 'yanıt verdi',
    replyAiAction: 'AI yanıtı gönderdi',
    aiDraftAction: 'yanıt önerisi hazırladı',
    systemActor: 'Sistem',
    qrNotDownloadedAction: 'QR hatırlatma gönderildi',
    firstFeedbackTipsAction: 'ilk yorum ipuçları gönderildi',
    upgradeSuggestionAction: 'plan yükseltme önerisi gönderildi',
    inactiveReactivationAction: 'reaktivasyon e-postası gönderildi',
    welcomeAction: 'hoş geldin e-postası gönderildi',
    trialEndingAction: 'deneme bitiş hatırlatması gönderildi',
    weeklyReportAction: 'haftalık rapor gönderildi',
    genericSystemAction: 'sistem e-postası gönderildi',
    aiActor: 'AI Asistan',
    customerFallback: 'Müşteri',
    targetFor: 'için',
    targetTo: '→',
  },
  en: {
    feedbackAction: 'left a review',
    replyManualAction: 'replied',
    replyAiAction: 'sent AI reply',
    aiDraftAction: 'drafted a reply',
    systemActor: 'System',
    qrNotDownloadedAction: 'QR reminder sent',
    firstFeedbackTipsAction: 'first feedback tips sent',
    upgradeSuggestionAction: 'plan upgrade suggested',
    inactiveReactivationAction: 'reactivation email sent',
    welcomeAction: 'welcome email sent',
    trialEndingAction: 'trial-ending reminder sent',
    weeklyReportAction: 'weekly report sent',
    genericSystemAction: 'system email sent',
    aiActor: 'AI Assistant',
    customerFallback: 'Customer',
    targetFor: 'for',
    targetTo: '→',
  },
} as const;

// ---- Sentiment derivation ----

function ratingToSentiment(rating: number | null | undefined): ActivitySentiment {
  if (rating === null || rating === undefined || rating === 0) return 'neu';
  if (rating >= 4) return 'pos';
  if (rating <= 2) return 'neg';
  return 'neu';
}

// ---- Customer name derivation (KVKK guard) ----

function shortName(raw: string | null | undefined, isTr: boolean): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return COPY[isTr ? 'tr' : 'en'].customerFallback;
  // İsim Soyisim → "İsim S.": ilk kelime full, ikinciden sonrası baş harfle.
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

// ---- Platform target string ----

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

function platformTarget(rating: number | null, platform: string | null): string {
  const stars = rating && rating > 0 ? '★'.repeat(Math.round(rating)) : '';
  const platLabel = platform ? PLATFORM_LABELS[platform] || platform : 'Buaze';
  return stars ? `${stars} ${platLabel}` : platLabel;
}

// ---- System action mapping ----

function systemActionLabel(type: string, isTr: boolean): string {
  const c = COPY[isTr ? 'tr' : 'en'];
  switch (type) {
    case 'qr_not_downloaded':
      return c.qrNotDownloadedAction;
    case 'first_feedback_tips':
      return c.firstFeedbackTipsAction;
    case 'upgrade_suggestion':
      return c.upgradeSuggestionAction;
    case 'inactive_reactivation':
      return c.inactiveReactivationAction;
    case 'welcome':
      return c.welcomeAction;
    case 'trial_ending':
      return c.trialEndingAction;
    case 'weekly_report':
      return c.weeklyReportAction;
    default:
      return c.genericSystemAction;
  }
}

// ---- Public helper ----

export function buildActivityFeed({
  feedbacks,
  replies,
  aiDrafts,
  systemEvents,
  limit = 5,
  isTr = true,
}: BuildActivityFeedInput): ActivityEvent[] {
  const c = COPY[isTr ? 'tr' : 'en'];
  const events: ActivityEvent[] = [];

  for (const f of feedbacks) {
    // §38.32 — KVKK consent check: opsiyonel field; explicit `false` ise
    // name expose etme (anonim feedback). Eski kayıtlarda undefined →
    // legacy davranış (name shortName'e düşer). consent==null → opt-out
    // varsayım olarak fallback.
    const consentGiven = f.hasKvkkConsent !== false && f.hasKvkkConsent !== null;
    events.push({
      id: `feedback:${f.id}`,
      type: 'feedback',
      timestamp: f.createdAt,
      actor: consentGiven ? shortName(f.name, isTr) : c.customerFallback,
      action: c.feedbackAction,
      target: platformTarget(f.rating, f.platform),
      sentiment: ratingToSentiment(f.rating),
      href: `/dashboard/feedbacks?id=${f.id}`,
    });
  }

  for (const r of replies) {
    const isAi = r.source === 'ai_copilot' || r.source === 'template_fallback';
    events.push({
      id: `reply:${r.id}`,
      type: 'reply',
      timestamp: r.createdAt,
      // Manual yanıt: "Sahip yanıt verdi". AI yanıt: "AI Asistan AI yanıtı gönderdi".
      actor: isAi ? c.aiActor : shortName(r.feedback.name, isTr),
      action: isAi ? c.replyAiAction : c.replyManualAction,
      target: platformTarget(r.feedback.rating, r.feedback.platform),
      sentiment: ratingToSentiment(r.feedback.rating),
      href: `/dashboard/feedbacks?id=${r.feedback.id}`,
    });
  }

  for (const d of aiDrafts) {
    events.push({
      id: `ai_draft:${d.id}`,
      type: 'ai_draft',
      timestamp: d.generatedAt,
      actor: c.aiActor,
      action: c.aiDraftAction,
      target: shortName(d.feedback.name, isTr),
      sentiment: 'neu',
      href: `/dashboard/feedbacks?id=${d.feedback.id}`,
    });
  }

  // §38.32 — System event ranking: tüm event'leri pushlamadan önce priority
  // ile filter + slice. weekly_report > trial_ending > critical reminders >
  // generic. Caller take:10 daha geniş örneklem getirir, helper en kritik
  // 3'ünü seçer (timeline kalabalığı önlenir).
  const SYSTEM_TYPE_PRIORITY: Record<string, number> = {
    weekly_report: 1,
    trial_ending: 2,
    upgrade_suggestion: 3,
    inactive_reactivation: 4,
    qr_not_downloaded: 5,
    first_feedback_tips: 6,
    welcome: 7,
  };
  const rankedSystemEvents = [...systemEvents]
    .sort((a, b) => {
      const ra = SYSTEM_TYPE_PRIORITY[a.type] ?? 100;
      const rb = SYSTEM_TYPE_PRIORITY[b.type] ?? 100;
      if (ra !== rb) return ra - rb;
      return b.sentAt.getTime() - a.sentAt.getTime();
    })
    .slice(0, 3);
  for (const s of rankedSystemEvents) {
    events.push({
      id: `system:${s.id}`,
      type: 'system',
      timestamp: s.sentAt,
      actor: c.systemActor,
      action: systemActionLabel(s.type, isTr),
      target: '',
      sentiment: 'neu',
    });
  }

  // Sort newest first, slice limit.
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return events.slice(0, limit);
}
