/**
 * Personalized reply drafts for Google reviews (CLAUDE.md §54).
 *
 *  - The reply is written in the review's own language (Russian review →
 *    Russian reply). No text / unknown language → the business language.
 *  - Business settings: tone, length, "siz/sen", greeting by first name,
 *    signature and banned phrases (see google-reply-settings.ts).
 *  - 4–5★ without text get short, varied thank-you lines (no AI call); the
 *    variant is picked from the review id and never repeats inside one batch.
 *  - 1–3★ get an apology + concrete-step draft. Drafts are NEVER sent
 *    automatically: the owner always sends.
 */
import { createHash } from 'node:crypto';
import { chatCompletion, hasOpenAIKey } from '@/lib/openai';
import { buildReplyTemplate } from '@/lib/reply-template';
import { languageName, reviewerFirstName } from '@/lib/google-review-text';
import { findBannedPhrases, type GoogleReplySettings } from '@/lib/google-reply-settings';

export interface DraftReview {
  reviewId: string;
  reviewerName: string | null;
  rating: number | null;
  originalText: string | null;
  language: string | null;
}

export interface DraftBusiness {
  name: string;
  category?: string | null;
  /** Language of the business panel, used when the review has no text. */
  locale: 'tr' | 'en';
  settings: GoogleReplySettings;
}

export interface GeneratedGoogleDraft {
  body: string;
  source: 'ai' | 'template';
  language: string;
  /** Banned phrases that slipped into the text (the owner must edit). */
  bannedFound: string[];
}

/** Same hash the auto-draft cron stores, so it does not regenerate our draft. */
export function draftCommentHash(comment: string | null | undefined): string | null {
  if (!comment || !comment.trim()) return null;
  return createHash('sha256').update(comment.trim()).digest('hex').slice(0, 32);
}

export function replyLanguageFor(review: DraftReview, business: DraftBusiness): string {
  if (review.originalText && review.language) return review.language;
  return business.locale;
}

function hashIndex(seed: string, size: number): number {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 8);
  return Number.parseInt(hex, 16) % size;
}

type ThanksFn = (name: string | null, siz: boolean) => string;

const THANKS_TR: ThanksFn[] = [
  (n, siz) => `${n ? `Merhaba ${n}, ` : ''}${siz ? 'güzel puanınız için çok teşekkür ederiz' : 'güzel puanın için çok teşekkürler'}! ${siz ? 'Sizi yeniden ağırlamak isteriz.' : 'Seni yeniden görmek isteriz.'}`,
  (n, siz) => `${n ? `${n}, ` : ''}${siz ? 'bizi tercih ettiğiniz için teşekkür ederiz' : 'bizi tercih ettiğin için teşekkürler'}. ${siz ? 'Tekrar bekleriz!' : 'Yine bekleriz!'}`,
  (n, siz) => `${siz ? 'Değerlendirmeniz için teşekkürler' : 'Değerlendirmen için teşekkürler'}${n ? ` ${n}` : ''}! Bu güzel geri bildirim tüm ekibi mutlu etti.`,
  (n, siz) => `${n ? `Merhaba ${n}! ` : ''}${siz ? 'Memnun kalmanıza çok sevindik' : 'Memnun kalmana çok sevindik'}. ${siz ? 'Bir sonraki ziyaretinizde görüşmek üzere.' : 'Bir sonraki ziyaretinde görüşmek üzere.'}`,
  (n, siz) => `${siz ? 'Yıldızlarınız için teşekkür ederiz' : 'Yıldızların için teşekkürler'}${n ? `, ${n}` : ''}. ${siz ? 'Sizi yine aramızda görmek isteriz.' : 'Seni yine aramızda görmek isteriz.'}`,
  (n, siz) => `${n ? `${n}, ` : ''}${siz ? 'desteğiniz bizim için çok değerli' : 'desteğin bizim için çok değerli'}. Teşekkürler ve tekrar bekleriz!`,
  (n, siz) => `${siz ? 'Bizi puanladığınız için teşekkürler' : 'Bizi puanladığın için teşekkürler'}${n ? ` ${n}` : ''}. Her ziyaretin keyifli geçmesi için çalışıyoruz.`,
  (n, siz) => `${n ? `Merhaba ${n}, ` : ''}${siz ? 'güzel değerlendirmeniz' : 'güzel değerlendirmen'} için teşekkür ederiz. Görüşmek üzere!`,
];

const THANKS_EN: ThanksFn[] = [
  (n) => `${n ? `Hi ${n}, thank` : 'Thank'} you so much for the great rating! We hope to see you again soon.`,
  (n) => `${n ? `${n}, thanks` : 'Thanks'} for choosing us. We look forward to your next visit!`,
  (n) => `Thank you for the stars${n ? `, ${n}` : ''}! Feedback like this makes the whole team happy.`,
  (n) => `${n ? `Hi ${n}! ` : ''}We're so glad you enjoyed your time with us. See you next time.`,
  (n) => `Thanks for the lovely rating${n ? `, ${n}` : ''}. We'd love to welcome you back.`,
  (n) => `${n ? `${n}, your` : 'Your'} support means a lot to us. Thank you and see you again!`,
  (n) => `Thank you for rating us${n ? `, ${n}` : ''}. We work hard to make every visit a good one.`,
  (n) => `${n ? `Hi ${n}, many` : 'Many'} thanks for your kind rating. See you soon!`,
];

function withSignature(body: string, signature: string): string {
  const sig = signature.trim();
  if (!sig) return body.trim();
  if (body.toLocaleLowerCase('tr-TR').includes(sig.toLocaleLowerCase('tr-TR'))) return body.trim();
  return `${body.trim()}\n\n${sig}`;
}

/**
 * Short thank-you for a 4–5★ review without text. `used` (the bodies already
 * drafted in this batch) makes the next variant differ.
 */
export function shortThanksDraft(
  review: DraftReview,
  business: DraftBusiness,
  used: Set<string> = new Set(),
): string {
  const lang = business.locale;
  const pool = lang === 'tr' ? THANKS_TR : THANKS_EN;
  const name = business.settings.useName ? reviewerFirstName(review.reviewerName) : null;
  const siz = business.settings.tone === 'formal' || business.settings.addressForm === 'siz';
  const start = hashIndex(review.reviewId, pool.length);
  let body = '';
  for (let step = 0; step < pool.length; step++) {
    body = withSignature(pool[(start + step) % pool.length](name, siz), business.settings.signature);
    if (!used.has(body)) break;
  }
  return body;
}

const LENGTH_RULE = {
  short: { tr: '1-2 cümle, en çok 35 kelime.', en: '1-2 sentences, at most 35 words.' },
  medium: { tr: '2-4 cümle, en çok 70 kelime.', en: '2-4 sentences, at most 70 words.' },
  long: { tr: '4-6 cümle, en çok 120 kelime.', en: '4-6 sentences, at most 120 words.' },
} as const;

export function buildGoogleDraftPrompt(
  review: DraftReview,
  business: DraftBusiness,
  opts: { avoidOpenings?: string[] } = {},
): { system: string; user: string } {
  const s = business.settings;
  const lang = replyLanguageFor(review, business);
  const langName = languageName(lang, 'en') ?? 'the same language as the review';
  const rating = review.rating ?? 5;
  const name = s.useName ? reviewerFirstName(review.reviewerName) : null;

  const rules = [
    `You write the public reply of the business "${business.name}"${business.category ? ` (${business.category})` : ''} to a Google review.`,
    `Write the reply in ${langName}${review.originalText ? ', the language the customer wrote in' : ''}.`,
    `Length: ${LENGTH_RULE[s.length].en}`,
    s.tone === 'formal'
      ? 'Tone: formal, polite and reserved.'
      : 'Tone: warm, sincere and professional.',
    lang === 'tr'
      ? s.addressForm === 'sen'
        ? 'Turkish address form: use "sen" (informal) consistently.'
        : 'Turkish address form: use "siz" (formal) consistently.'
      : '',
    name
      ? `Greet the customer by first name: "${name}". Never use the surname.`
      : 'Do not invent a name; greet without a name.',
    'Mention one specific thing the customer wrote about (a dish, drink, staff member, the atmosphere, the wait…) so the reply clearly answers THIS review. Never copy the review back word for word.',
    rating <= 3
      ? 'The rating is low: open with a sincere apology about the specific problem, say one concrete step the business will take, and invite the customer to contact the business directly. Do not argue or blame the customer.'
      : 'Thank the customer for the specific thing they liked and invite them back.',
    'Never offer free items, discounts, gifts or compensation. Never ask for a review change.',
    'No emojis, no hashtags, no links, no phone numbers, no placeholders such as [name].',
    s.signature ? `End with this signature on its own line: ${s.signature}` : 'Do not add a signature.',
    s.bannedPhrases.length > 0
      ? `Never use these words or phrases: ${s.bannedPhrases.map((p) => `"${p}"`).join(', ')}.`
      : '',
    opts.avoidOpenings && opts.avoidOpenings.length > 0
      ? `Other replies in this batch already start like this — start differently: ${opts.avoidOpenings
          .slice(0, 8)
          .map((o) => `"${o}"`)
          .join(', ')}.`
      : '',
    'Output only the reply text.',
  ].filter(Boolean);

  const user = [
    `Rating: ${rating}/5`,
    `Customer: ${name ?? 'unknown'}`,
    `Review: ${review.originalText ?? '(no text)'}`,
  ].join('\n');
  return { system: rules.join('\n'), user };
}

function cleanModelText(text: string): string {
  return text
    .trim()
    .replace(/^["“”'«»]+|["“”'«»]+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 4000);
}

/** First words of a draft, to keep batch openings different. */
export function draftOpening(body: string): string {
  return body.split(/\s+/).slice(0, 4).join(' ');
}

export async function generateGoogleReviewDraft(
  review: DraftReview,
  business: DraftBusiness,
  opts: { useAi: boolean; used?: Set<string>; avoidOpenings?: string[] },
): Promise<GeneratedGoogleDraft> {
  const lang = replyLanguageFor(review, business);
  const rating = review.rating ?? 5;
  const finish = (body: string, source: 'ai' | 'template'): GeneratedGoogleDraft => ({
    body,
    source,
    language: lang,
    bannedFound: findBannedPhrases(body, business.settings.bannedPhrases),
  });

  // 4–5★ with no text: a short, varied thank-you is enough (and costs nothing).
  if (!review.originalText && rating >= 4) {
    return finish(shortThanksDraft(review, business, opts.used), 'template');
  }

  if (opts.useAi && hasOpenAIKey()) {
    const prompt = buildGoogleDraftPrompt(review, business, { avoidOpenings: opts.avoidOpenings });
    const text = await chatCompletion(
      [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      { temperature: 0.85, maxTokens: 400 },
    );
    if (text) return finish(withSignature(cleanModelText(text), business.settings.signature), 'ai');
  }

  const templateLocale: 'tr' | 'en' = lang === 'tr' ? 'tr' : 'en';
  const fallback = buildReplyTemplate({
    name: business.settings.useName ? reviewerFirstName(review.reviewerName) : null,
    rating,
    locale: templateLocale,
  });
  return finish(withSignature(fallback, business.settings.signature), 'template');
}
