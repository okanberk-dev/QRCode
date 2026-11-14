// Short written summary for an ROI calculator estimate. Shown in the visitor's
// report e-mail, on the PDF and in the sales notification.
//
// Honesty rules (marketing spec D1 + D9): the summary only restates the
// visitor's own estimate (time spent replying, reply coverage, plan cost),
// describes the QR flow exactly as the product works and never promises a
// better rating, ranking, revenue or more customers. It never suggests that
// low ratings are kept away from public platforms.
//
// Without OPENAI_API_KEY, on any API failure, or when the model's answer
// breaks those rules, the deterministic template below is used instead
// (CLAUDE.md §15 pattern) — the mail and PDF always get a usable summary.

import { chatCompletion, hasOpenAIKey } from '@/lib/openai';
import type { RoiPdfData } from '@/lib/roi/RoiPdf';
import { formatHours, formatUsd, isRoiSector } from '@/lib/roi/roi-model';
import { safeParseJson } from '@/lib/safe-json';

export interface RoiInsight {
  /** 2-3 sentence summary of the estimate. */
  summary: string;
  /** One sentence: the point that matters most for this business. */
  highlight: string;
  /** Three concrete suggestions for the first 30 days. */
  nextSteps: string[];
  /** 'ai' = OpenAI answer; 'template' = deterministic fallback. */
  source: 'ai' | 'template';
}

interface InsightInput {
  data: RoiPdfData;
  locale: 'tr' | 'en';
}

const SECTOR_NOUN = {
  tr: { restaurant: 'restoran', cafe: 'kafe', hotel: 'otel', clinic: 'klinik', other: 'işletme' },
  en: { restaurant: 'restaurant', cafe: 'cafe', hotel: 'hotel', clinic: 'clinic', other: 'business' },
} as const;

function sectorNoun(sector: string, locale: 'tr' | 'en'): string {
  return isRoiSector(sector) ? SECTOR_NOUN[locale][sector] : SECTOR_NOUN[locale].other;
}

/**
 * Wording the summary must never contain: review gating ("filter", "leak",
 * "keep off Google"), guarantees, multipliers and invented research. A model
 * answer that matches is discarded in favour of the template.
 */
const BANNED_CLAIMS =
  /filtr|filter|sız(ma|dır|mad)|leak|stay(s)? off|keep[^.]{0,20}off|uzak tut|gizle|engelle|garanti|guarantee|kesinlikle|\bROI\b|\d+(?:[.,]\d+)?\s?(?:×|x\b|kat\b)|kohort|cohort|brightlocal|araştırma(ya|lara)? göre|research shows|studies show/i;

export async function generateRoiInsight({ data, locale }: InsightInput): Promise<RoiInsight> {
  if (!hasOpenAIKey()) return buildRoiTemplateInsight({ data, locale });

  // 8 s timeout — /api/roi/save has a 30 s budget (PDF 1-2 s, mails 1-2 s).
  const raw = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT[locale] },
      { role: 'user', content: buildPrompt({ data, locale }) },
    ],
    { temperature: 0.3, maxTokens: 500, timeoutMs: 8_000 },
  );
  if (!raw) return buildRoiTemplateInsight({ data, locale });

  const parsed = parseInsightJson(raw);
  if (!parsed) return buildRoiTemplateInsight({ data, locale });

  const joined = [parsed.summary, parsed.highlight, ...parsed.nextSteps].join(' ');
  if (BANNED_CLAIMS.test(joined)) return buildRoiTemplateInsight({ data, locale });

  return { ...parsed, source: 'ai' };
}

// ─── Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT: Record<'tr' | 'en', string> = {
  tr: [
    'Buaze için kısa ve dürüst bir değerlendirme yazıyorsunuz. Buaze, işletmelerin QR kodla müşteri puanı ve geri bildirimi toplamasını ve yanıtlamasını sağlayan bir yazılımdır.',
    'Kurallar:',
    '- Yalnız verilen tahmini rakamları kullanın ve tahmin olduklarını belirtin. Yeni rakam üretmeyin.',
    '- Daha yüksek puan, daha iyi sıralama, daha fazla müşteri, ciro ya da kazanç vaat etmeyin. Garanti, çarpan ve araştırma iddiası kullanmayın.',
    '- Düşük puanların süzüldüğünü, gizlendiğini ya da herkese açık platformlardan uzak tutulduğunu ima etmeyin. Müşteri her zaman istediği yere yorum yazabilir.',
    '- Ürünün yapmadığı bir özellik yazmayın. Yalnız kullanıcı mesajındaki ürün bilgilerini kullanın.',
    '- "Siz" diliyle, sade ve ölçülü Türkçe yazın. Emoji, ünlem ve abartı yok.',
    'Yanıtınız yalnız şu JSON olsun: {"summary":"2-3 cümle","highlight":"1 cümle","nextSteps":["...","...","..."]}',
  ].join('\n'),
  en: [
    'You write a short, honest assessment for Buaze, software that lets businesses collect customer ratings and feedback with a QR code and reply to them.',
    'Rules:',
    '- Use only the estimated figures provided and say they are estimates. Do not invent figures.',
    '- Do not promise a higher rating, better ranking, more customers, revenue or profit. No guarantees, multipliers or research claims.',
    '- Never suggest that low ratings are filtered, hidden or kept off public platforms. Customers can always post a review wherever they like.',
    '- Do not describe features the product does not have. Use only the product facts in the user message.',
    '- Write plain, measured English addressed to the reader as "you". No emoji, exclamation marks or hype.',
    'Reply with this JSON only: {"summary":"2-3 sentences","highlight":"1 sentence","nextSteps":["...","...","..."]}',
  ].join('\n'),
};

function buildPrompt({ data, locale }: InsightInput): string {
  const { inputs, result } = data;
  const isTr = locale === 'tr';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const pct = (n: number) => (isTr ? `%${Math.round(n)}` : `${Math.round(n)}%`);
  const h = (n: number) => formatHours(n, locale);
  const hasPlan = result.planMonthlyUsd !== null && result.monthlyDifferenceUsd !== null;

  if (isTr) {
    return [
      `İşletme: ${data.restaurantName} (${sectorNoun(data.sector, locale)})`,
      'Ziyaretçinin girdiği değerler:',
      `- Aylık müşteri: ${fmt(inputs.monthlyCustomers)}`,
      `- QR kodu okutup puan veren müşteri oranı: ${pct(inputs.ratingRatePct)}`,
      `- Yanıt yazılan geri bildirim oranı: ${pct(inputs.replySharePct)}`,
      `- Bir yanıtı elle yazma süresi: ${inputs.minutesManual} dk; Pulse AI taslağıyla: ${inputs.minutesWithDraft} dk`,
      `- Bir çalışma saatinin maliyeti: ${formatUsd(inputs.hourlyCostUsd)}`,
      hasPlan ? `- Plan: ${data.planName ?? 'seçilen plan'}, ${formatUsd(result.planMonthlyUsd!)} / ay` : '- Plan seçilmedi',
      'Tahmini sonuçlar:',
      `- Puan: ${fmt(result.ratingsPerMonth)} / ay; yanıt: ${fmt(result.repliesPerMonth)} / ay`,
      `- Elle yanıt süresi: ${h(result.hoursManual)} saat / ay; taslakla: ${h(result.hoursWithDrafts)} saat / ay`,
      `- Zaman tasarrufu: ${h(result.hoursSaved)} saat / ay (değeri ${formatUsd(result.timeValueUsd)} / ay)`,
      hasPlan ? `- Plan maliyetiyle aylık fark: ${formatUsd(result.monthlyDifferenceUsd!, { signed: true })}` : '',
      `- Bugünkü yanıt süresiyle yanıtlanabilecek puan oranı: ${pct(result.coverageNowPct)} → ${pct(result.coverageSameTimePct)}`,
      'Ürün bilgileri:',
      '- Müşteri QR kodu okutur ve puan verir. İşletmenin belirlediği eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçilen platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce işletmeye özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
      '- 1-3 yıldızlı geri bildirimde işletmeye anında e-posta gider.',
      '- Pulse AI, geri bildirimlere sıcak, resmi ya da özür dileyen tonda yanıt taslağı hazırlar. Taslak, işletme onaylamadan gönderilmez.',
      '- 10 yorum platformunun bağlantısı eklenebilir: Google, Yandex, Foursquare, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yelp. Bağlantılar her gün kontrol edilir.',
      '- Her pazartesi haftalık özet e-postası gönderilir.',
      'Bu işletme için 2-3 cümlelik özet, 1 cümlelik öne çıkan nokta ve ilk 30 gün için 3 öneri yazın.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `Business: ${data.restaurantName} (${sectorNoun(data.sector, locale)})`,
    'Values the visitor entered:',
    `- Customers per month: ${fmt(inputs.monthlyCustomers)}`,
    `- Share of customers who scan the QR code and rate: ${pct(inputs.ratingRatePct)}`,
    `- Share of feedback they reply to: ${pct(inputs.replySharePct)}`,
    `- Minutes to write a reply by hand: ${inputs.minutesManual}; with a Pulse AI draft: ${inputs.minutesWithDraft}`,
    `- Cost of one working hour: ${formatUsd(inputs.hourlyCostUsd)}`,
    hasPlan ? `- Plan: ${data.planName ?? 'selected plan'}, ${formatUsd(result.planMonthlyUsd!)} / month` : '- No plan selected',
    'Estimated results:',
    `- Ratings: ${fmt(result.ratingsPerMonth)} / month; replies: ${fmt(result.repliesPerMonth)} / month`,
    `- Reply time by hand: ${h(result.hoursManual)} hours / month; with drafts: ${h(result.hoursWithDrafts)} hours / month`,
    `- Time saved: ${h(result.hoursSaved)} hours / month (worth ${formatUsd(result.timeValueUsd)} / month)`,
    hasPlan ? `- Monthly difference after the plan cost: ${formatUsd(result.monthlyDifferenceUsd!, { signed: true })}` : '',
    `- Share of ratings that could be answered in today's reply time: ${pct(result.coverageNowPct)} → ${pct(result.coverageSameTimePct)}`,
    'Product facts:',
    '- The customer scans the QR code and gives a rating. At or above the threshold the business sets (5 stars by default), the chosen platform’s review page opens. Below it, the customer can first send private feedback to the business; the public review link is shown on the same screen.',
    '- Feedback rated 1-3 stars triggers an instant e-mail to the business.',
    '- Pulse AI drafts replies to feedback in a warm, formal or apologetic tone. A draft is never sent until the business approves it.',
    '- Links can be added for 10 review platforms: Google, Yandex, Foursquare, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yelp. Links are checked every day.',
    '- A weekly summary e-mail is sent every Monday.',
    'Write a 2-3 sentence summary, a 1-sentence key point and 3 suggestions for the first 30 days for this business.',
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── JSON parser (defensive) ───────────────────────────────────────────

function parseInsightJson(raw: string): Omit<RoiInsight, 'source'> | null {
  // The model sometimes wraps the JSON in a ```json block.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // safeParseJson tags malformed AI responses to Sentry (CLAUDE.md §38.9).
  const parsed = safeParseJson<{
    summary?: unknown;
    highlight?: unknown;
    nextSteps?: unknown;
  }>(cleaned, { source: 'roi-insight' });
  if (!parsed) return null;
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 700) : '';
  const highlight = typeof parsed.highlight === 'string' ? parsed.highlight.trim().slice(0, 300) : '';
  const nextSteps = (Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [])
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim().slice(0, 300))
    .filter((s) => s.length > 0)
    .slice(0, 3);

  if (!summary || !highlight || nextSteps.length < 3) return null;
  return { summary, highlight, nextSteps };
}

// ─── Deterministic template ────────────────────────────────────────────

/** Used when OpenAI is unavailable or its answer is rejected. */
export function buildRoiTemplateInsight({ data, locale }: InsightInput): RoiInsight {
  const { inputs, result } = data;
  const isTr = locale === 'tr';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const pct = (n: number) => (isTr ? `%${Math.round(n)}` : `${Math.round(n)}%`);
  const h = (n: number) => formatHours(n, locale);
  const name = data.restaurantName;
  const hasPlan = result.planMonthlyUsd !== null && result.monthlyDifferenceUsd !== null;
  const minutesPerReply = Math.max(0, inputs.minutesManual - inputs.minutesWithDraft);

  if (isTr) {
    const summary = [
      `Girdiğiniz değerlere göre ${name} ayda tahmini ${fmt(result.ratingsPerMonth)} puan alır ve bunların ${fmt(result.repliesPerMonth)} tanesine yanıt yazarsınız.`,
      result.hoursSaved > 0
        ? `Bu yanıtları elle yazmak ayda yaklaşık ${h(result.hoursManual)} saat sürer; Pulse AI taslaklarıyla süre ${h(result.hoursWithDrafts)} saate iner ve tahmini ${h(result.hoursSaved)} saat (${formatUsd(result.timeValueUsd)}) kazanırsınız.`
        : `Girdiğiniz sürelerde taslakla yanıt, elle yazmayla aynı sürüyor; bu yüzden zaman tasarrufu hesaplanmadı.`,
      hasPlan
        ? `Seçtiğiniz planın aylık maliyetiyle tahmini fark ${formatUsd(result.monthlyDifferenceUsd!, { signed: true })}.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    const highlight =
      result.coverageSameTimePct > result.coverageNowPct
        ? `Bugün yanıta ayırdığınız sürede, taslaklarla puanların ${pct(result.coverageNowPct)} yerine yaklaşık ${pct(result.coverageSameTimePct)} kadarına yanıt verebilirsiniz.`
        : minutesPerReply > 0
          ? `Pulse AI taslağı her yanıtta yaklaşık ${minutesPerReply} dakika kazandırır; taslağı siz onaylamadan hiçbir yanıt gönderilmez.`
          : 'Pulse AI taslakları siz onaylamadan gönderilmez; düzenleyip kendi dilinize uygun hale getirebilirsiniz.';
    return {
      summary,
      highlight,
      nextSteps: [
        'QR kodu tüm müşterilerin görebileceği yerlere koyun (masa, kasa, paket) ve ilk hafta kaç puan geldiğini izleyin.',
        'Kullandığınız yorum platformlarının bağlantılarını ekleyin; Buaze bağlantıları her gün kontrol eder.',
        'Pulse AI taslaklarını işletmenizin diline göre düzenleyip onaylayın; hiçbir yanıt siz onaylamadan gönderilmez.',
      ],
      source: 'template',
    };
  }

  const summary = [
    `Based on your values, ${name} gets an estimated ${fmt(result.ratingsPerMonth)} ratings a month and you reply to ${fmt(result.repliesPerMonth)} of them.`,
    result.hoursSaved > 0
      ? `Writing those replies by hand takes about ${h(result.hoursManual)} hours a month; with Pulse AI drafts it drops to ${h(result.hoursWithDrafts)} hours, an estimated ${h(result.hoursSaved)} hours (${formatUsd(result.timeValueUsd)}) saved.`
      : 'With the times you entered, replying with a draft takes as long as writing by hand, so no time saving was calculated.',
    hasPlan
      ? `After the plan’s monthly cost, the estimated difference is ${formatUsd(result.monthlyDifferenceUsd!, { signed: true })}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const highlight =
    result.coverageSameTimePct > result.coverageNowPct
      ? `In the time you spend on replies today, drafts would let you answer about ${pct(result.coverageSameTimePct)} of ratings instead of ${pct(result.coverageNowPct)}.`
      : minutesPerReply > 0
        ? `A Pulse AI draft saves about ${minutesPerReply} minutes per reply, and nothing is sent until you approve it.`
        : 'Pulse AI drafts are never sent until you approve them, and you can edit them to sound like you.';
  return {
    summary,
    highlight,
    nextSteps: [
      'Put the QR code where every customer can see it (tables, till, packaging) and watch how many ratings arrive in the first week.',
      'Add links for the review platforms you use; Buaze checks the links every day.',
      'Edit and approve the Pulse AI drafts to match how you speak; no reply is sent until you approve it.',
    ],
    source: 'template',
  };
}
