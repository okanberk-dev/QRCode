/**
 * One place for panel metric definitions and their pure math (CLAUDE.md §58).
 *
 * Vocabulary (every panel page uses these words for these numbers):
 * - Puan (rating): every QR rating, including high ratings sent to a review
 *   platform. Average rating uses all of them.
 * - Yönlendirme (redirect): a high rating that opened the platform's review
 *   page (`Feedback.redirected`). An event, not a review: no text, never in
 *   the inbox by default, never sent to AI, not counted as a review.
 * - Geri bildirim (feedback): a rating submitted with the private form
 *   (`redirected = false`). These are the inbox rows.
 * - Yanıt bekleyen (pending): 1–3★ feedback with no reply, all time.
 * Pure: no Prisma, no React — tests pin the math (tests/feedback-metrics.test.ts).
 */

/** Prisma `where` fragment for "feedback, not a redirect event". */
export const FEEDBACK_ONLY = { redirected: false } as const;
/** Prisma `where` fragment for redirect events. */
export const REDIRECTS_ONLY = { redirected: true } as const;

/** Reviews older than this when they get their first reply are a backlog reply. */
export const BACKLOG_REPLY_DAYS = 30;

export type MetricKey =
  | 'ratings'
  | 'avgRating'
  | 'feedback'
  | 'redirects'
  | 'pending'
  | 'lowReplyRate'
  | 'replyTime'
  | 'newCustomers'
  | 'googleReviews'
  | 'googleUnreplied'
  | 'googleReplyRate'
  | 'customers'
  | 'segment'
  | 'returning'
  | 'atRisk';

export const METRICS: Record<MetricKey, { tr: string; en: string; infoTr: string; infoEn: string }> = {
  ratings: {
    tr: 'Puan',
    en: 'Ratings',
    infoTr: 'QR ile puan veren müşteri sayısı. Yüksek puanla yorum sayfasına yönlendirilenler dahil.',
    infoEn: 'Customers who rated through the QR, including high ratings sent to a review page.',
  },
  avgRating: {
    tr: 'Ortalama puan',
    en: 'Average rating',
    infoTr: 'Seçili dönemdeki tüm QR puanlarının ortalaması (1–5).',
    infoEn: 'Average of every QR rating in the selected period (1–5).',
  },
  feedback: {
    tr: 'Geri bildirim',
    en: 'Feedback',
    infoTr: 'Özel formdan gelen puanlar. Yorumlar sayfasında listelenir.',
    infoEn: 'Ratings sent through the private form. Listed on the Reviews page.',
  },
  redirects: {
    tr: 'Platforma yönlendirme',
    en: 'Sent to a platform',
    infoTr: 'Yüksek puan verip Google gibi bir platformun yorum sayfasına gönderilen müşteri. Metin içermez, yorum sayılmaz.',
    infoEn: 'Customers who gave a high rating and were sent to a platform review page such as Google. No text; not counted as a review.',
  },
  pending: {
    tr: 'Yanıt bekleyen',
    en: 'Awaiting reply',
    infoTr: 'Henüz yanıt verilmemiş 1–3 yıldızlı geri bildirimler (tüm zamanlar).',
    infoEn: '1–3 star feedback with no reply yet (all time).',
  },
  lowReplyRate: {
    tr: 'Yanıt oranı',
    en: 'Reply rate',
    infoTr: 'Seçili dönemde gelen 1–3 yıldızlı geri bildirimlerden yanıtlananların oranı.',
    infoEn: 'Share of 1–3 star feedback in the selected period that got a reply.',
  },
  replyTime: {
    tr: 'Yanıt süresi',
    en: 'Reply time',
    infoTr: 'Dönemde gelen ve yanıtlanan geri bildirimlerde ilk yanıta kadar geçen sürenin medyanı. 30 günden eski yorumlara sonradan verilen yanıtlar ayrı sayılır.',
    infoEn: 'Median time to the first reply for feedback that arrived in the period. Replies to reviews older than 30 days are counted separately.',
  },
  newCustomers: {
    tr: 'Yeni müşteri',
    en: 'New customers',
    infoTr: 'Dönemde iletişim bilgisi bırakan ve KVKK onayı veren farklı müşteri sayısı.',
    infoEn: 'Distinct customers in the period who left contact details and gave privacy consent.',
  },
  googleReviews: {
    tr: 'Google yorumu',
    en: 'Google reviews',
    infoTr: 'Google’dan son senkronda alınan yorum sayısı.',
    infoEn: 'Reviews received from Google in the last sync.',
  },
  googleUnreplied: {
    tr: 'Yanıtsız',
    en: 'Unreplied',
    infoTr: 'Google’da işletme yanıtı olmayan yorumlar.',
    infoEn: 'Google reviews without an owner reply.',
  },
  googleReplyRate: {
    tr: 'Yanıt oranı',
    en: 'Reply rate',
    infoTr: 'İşletme yanıtı olan Google yorumlarının oranı.',
    infoEn: 'Share of Google reviews with an owner reply.',
  },
  customers: {
    tr: 'Müşteri',
    en: 'Customers',
    infoTr: 'E-posta ya da telefon bırakan, KVKK onaylı farklı kişiler. Aynı kişinin tekrar gelen geri bildirimleri tek kişi sayılır.',
    infoEn: 'Distinct people who left an email or phone and gave privacy consent. Repeat feedback from one person counts once.',
  },
  segment: {
    tr: 'Segment',
    en: 'Segment',
    infoTr: 'VIP: 5+ değerlendirme, ortalama 4★ ve üstü. Risk: 2+ değerlendirme, ortalama 3★ altı. Kayıp: 2+ değerlendirme, 90 günden uzun süredir gelmedi.',
    infoEn: 'VIP: 5+ ratings, average 4★ or more. At risk: 2+ ratings, average below 3★. Churned: 2+ ratings, not back for over 90 days.',
  },
  returning: {
    tr: 'Tekrar gelen',
    en: 'Returning',
    infoTr: 'Birden fazla geri bildirim bırakan müşterilerin oranı.',
    infoEn: 'Share of customers who left more than one piece of feedback.',
  },
  atRisk: {
    tr: 'Risk',
    en: 'At risk',
    infoTr: '2+ değerlendirme ve ortalama 3★ altı olan müşteriler.',
    infoEn: 'Customers with 2+ ratings and an average below 3★.',
  },
};

export function metricLabel(key: MetricKey, isTr: boolean): string {
  return isTr ? METRICS[key].tr : METRICS[key].en;
}

export function metricInfo(key: MetricKey, isTr: boolean): string {
  return isTr ? METRICS[key].infoTr : METRICS[key].infoEn;
}

export type ChangeTone = 'good' | 'bad' | 'neutral';

export interface ChangeText {
  /** "Değişim yok", "+12%", "3 kat", "Yeni" … */
  text: string;
  /** ↑ / ↓ or '' when unchanged. */
  arrow: '↑' | '↓' | '';
  tone: ChangeTone;
}

/**
 * Period-over-period change for a count or duration.
 * - equal (incl. 0 → 0): "Değişim yok"
 * - previous 0: "Yeni"
 * - ratio ≥ 2 (either way): "3 kat" / "3×" — no "%999+"
 * - else rounded percent with sign.
 * `lowerIsBetter` (durations) flips the tone: shorter = good (green ↓).
 */
export function describeChange(
  current: number,
  previous: number,
  opts: { isTr: boolean; lowerIsBetter?: boolean },
): ChangeText {
  const { isTr, lowerIsBetter = false } = opts;
  if (current === previous) return { text: isTr ? 'Değişim yok' : 'No change', arrow: '', tone: 'neutral' };
  const up = current > previous;
  const arrow = up ? '↑' : '↓';
  const tone: ChangeTone = up !== lowerIsBetter ? 'good' : 'bad';
  if (previous === 0) return { text: isTr ? 'Yeni' : 'New', arrow, tone };
  if (current === 0) return { text: isTr ? 'Sıfıra indi' : 'Down to zero', arrow, tone };
  const ratio = up ? current / previous : previous / current;
  if (ratio >= 2) {
    const n = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
    const nText = String(n).replace('.', isTr ? ',' : '.');
    return { text: isTr ? `${nText} kat` : `${nText}×`, arrow, tone };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: isTr ? 'Değişim yok' : 'No change', arrow: '', tone: 'neutral' };
  return { text: isTr ? `%${Math.abs(pct)}` : `${Math.abs(pct)}%`, arrow, tone };
}

/** Rating change (absolute, one decimal). 0.0 → "Değişim yok". */
export function describeRatingChange(current: number | null, previous: number | null, isTr: boolean): ChangeText | null {
  if (current === null || previous === null || current <= 0 || previous <= 0) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return { text: isTr ? 'Değişim yok' : 'No change', arrow: '', tone: 'neutral' };
  const abs = Math.abs(diff).toFixed(1);
  return {
    text: isTr ? abs.replace('.', ',') : abs,
    arrow: diff > 0 ? '↑' : '↓',
    tone: diff > 0 ? 'good' : 'bad',
  };
}

export interface ReplyTiming {
  createdAt: Date;
  /** First reply time, or null when unreplied. */
  firstReplyAt: Date | null;
}

export interface ReplyTimeStats {
  /** Median reply time (ms) of reviews created in the period; null if none. */
  medianMs: number | null;
  /** Reviews created in the period that got a reply (median sample size). */
  answered: number;
  /** Replies in the period to reviews older than BACKLOG_REPLY_DAYS at reply time. */
  backlogReplies: number;
}

/** Median of a non-empty list (ms). */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeReplyTimes(
  items: ReplyTiming[],
  period: { start: Date; end: Date },
): ReplyTimeStats {
  const backlogMs = BACKLOG_REPLY_DAYS * 86_400_000;
  const lags: number[] = [];
  let backlogReplies = 0;
  for (const item of items) {
    if (!item.firstReplyAt) continue;
    const lag = item.firstReplyAt.getTime() - item.createdAt.getTime();
    if (lag < 0) continue;
    const createdIn = item.createdAt >= period.start && item.createdAt < period.end;
    const repliedIn = item.firstReplyAt >= period.start && item.firstReplyAt < period.end;
    if (lag > backlogMs) {
      if (repliedIn) backlogReplies += 1;
      continue;
    }
    if (createdIn) lags.push(lag);
  }
  return { medianMs: median(lags), answered: lags.length, backlogReplies };
}

/** "45 dk", "1 sa 15 dk", "3 gün" (en: "45 min", "1 h 15 min", "3 days"). */
export function formatDuration(ms: number, isTr: boolean): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return isTr ? `${minutes} dk` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) {
    if (rest === 0) return isTr ? `${hours} sa` : `${hours} h`;
    return isTr ? `${hours} sa ${rest} dk` : `${hours} h ${rest} min`;
  }
  const days = Math.round(hours / 24);
  return isTr ? `${days} gün` : `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Reply rate over feedback + Google reviews, weighted by volume. */
export function combinedReplyRate(parts: Array<{ replied: number; total: number }>): number | null {
  const total = parts.reduce((a, p) => a + p.total, 0);
  if (total === 0) return null;
  const replied = parts.reduce((a, p) => a + Math.min(p.replied, p.total), 0);
  return (replied / total) * 100;
}

/** "%0 olumlu · %100 olumsuz" style text for topic sentiment. */
export function topicSentimentText(pos: number, neg: number, isTr: boolean): string {
  return isTr ? `%${pos} olumlu · %${neg} olumsuz` : `${pos}% positive · ${neg}% negative`;
}

/** Topics mentioned fewer times than this are shown faded as "az veri". */
export const TOPIC_MIN_MENTIONS = 3;

const PLATFORM_NAMES: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  yelp: 'Yelp',
  foursquare: 'Foursquare',
};

// Turkish dative suffix after the brand name ("Google'a", "Yemeksepeti'ne").
const TR_DATIVE: Record<string, string> = {
  google: "'a",
  yemeksepeti: "'ne",
  getir: "'e",
  trendyol_go: "'ya",
  tripadvisor: "'a",
  airbnb: "'ye",
  booking: "'e",
  yandex: "'e",
  yelp: "'e",
  foursquare: "'e",
};

/** "Google'a yönlendirildi" / "Sent to Google"; unknown platform → generic. */
export function redirectBadgeLabel(platform: string | null | undefined, isTr: boolean): string {
  const key = (platform || '').toLowerCase();
  const name = PLATFORM_NAMES[key];
  if (!name) return isTr ? 'Platforma yönlendirildi' : 'Sent to a platform';
  return isTr ? `${name}${TR_DATIVE[key]} yönlendirildi` : `Sent to ${name}`;
}

/** Display name for a customer without one (or without consent). */
export function anonymousName(isTr: boolean): string {
  return isTr ? 'İsimsiz' : 'Unnamed';
}
