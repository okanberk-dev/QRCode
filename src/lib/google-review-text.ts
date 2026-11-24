/**
 * Pure text helpers for Google Business Profile reviews (CLAUDE.md §54).
 * No DB, no network — shared by the sync (server), the inbox stats (server)
 * and the reply inbox (client).
 *
 *  - splitGoogleTranslation: Google returns a review written in another
 *    language as "original + (Translated by Google) + translation" or
 *    "(Translated by Google) translation + (Original) + original". Analysis,
 *    search and the reply language use the ORIGINAL only; the stored
 *    `comment` stays exactly as Google sent it.
 *  - detectReviewLanguage: cheap script + stopword heuristic. `null` when
 *    unsure (short or mixed text) — callers then fall back to the business
 *    language or let the model mirror the review.
 *  - extractReviewKeywords: frequent words of the original texts, TR/EN
 *    stopwords removed, one count per review.
 */

const TRANSLATED_MARKER =
  /\(\s*(?:translated by google|google tarafından çevrildi|google tarafından çevrilmiştir|übersetzt von google|traduit par google|traducido por google|tradotto da google|vertaald door google|traduzido pelo google|переведено google|przetłumaczone przez google)\s*\)/i;
const ORIGINAL_MARKER = /\(\s*(?:original|orijinal|orijinali|originale|оригинал|oryginał)\s*\)/i;

export interface SplitReviewText {
  /** The customer's own words (may equal the whole comment). */
  original: string | null;
  /** Google's machine translation, when present. */
  translated: string | null;
}

function clean(value: string | undefined | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function splitGoogleTranslation(comment: string | null | undefined): SplitReviewText {
  const text = clean(comment);
  if (!text) return { original: null, translated: null };

  const originalMatch = ORIGINAL_MARKER.exec(text);
  if (originalMatch && TRANSLATED_MARKER.test(text.slice(0, originalMatch.index))) {
    // "(Translated by Google) <translation>\n\n(Original)\n<original>"
    const before = text.slice(0, originalMatch.index).replace(TRANSLATED_MARKER, '');
    return {
      original: clean(text.slice(originalMatch.index + originalMatch[0].length)),
      translated: clean(before),
    };
  }

  const translatedMatch = TRANSLATED_MARKER.exec(text);
  if (translatedMatch) {
    const before = clean(text.slice(0, translatedMatch.index));
    const after = clean(text.slice(translatedMatch.index + translatedMatch[0].length));
    if (!before) {
      // Only a translation came back (no original section): it is all we have.
      return { original: after, translated: null };
    }
    // "<original>\n\n(Translated by Google)\n<translation>"
    return { original: before, translated: after };
  }

  return { original: text, translated: null };
}

// ─── language ────────────────────────────────────────────────────────────

const LATIN_HINTS: Record<string, { chars: RegExp; words: string[] }> = {
  tr: {
    chars: /[ğışİŞĞ]/g,
    words: ['ve', 'bir', 'çok', 'için', 'güzel', 'ama', 'bu', 'da', 'de', 'ile', 'gibi', 'daha', 'teşekkürler', 'harika', 'iyi', 'tavsiye', 'yemek', 'hizmet'],
  },
  en: {
    chars: /(?!)/g,
    words: ['the', 'and', 'is', 'was', 'very', 'great', 'good', 'food', 'with', 'for', 'place', 'service', 'nice', 'friendly', 'staff', 'we', 'it', 'amazing'],
  },
  de: {
    chars: /[äöüßÄÖÜ]/g,
    words: ['und', 'der', 'die', 'das', 'nicht', 'sehr', 'ist', 'war', 'mit', 'ein', 'eine', 'gut', 'lecker', 'essen', 'freundlich', 'auch'],
  },
  fr: {
    chars: /[éèêàçœùÉÈ]/g,
    words: ['le', 'la', 'les', 'et', 'très', 'est', 'pas', 'une', 'un', 'avec', 'pour', 'bon', 'était', 'nous', 'service', 'accueil'],
  },
  es: {
    chars: /[ñ¿¡áíóú]/g,
    words: ['el', 'la', 'los', 'las', 'y', 'muy', 'es', 'pero', 'con', 'para', 'una', 'comida', 'bueno', 'buena', 'todo', 'servicio'],
  },
  it: {
    chars: /[àèìòù]/g,
    words: ['il', 'la', 'e', 'molto', 'è', 'non', 'che', 'con', 'per', 'una', 'buono', 'ottimo', 'cibo', 'servizio', 'gentili'],
  },
  nl: {
    chars: /(?!)/g,
    words: ['de', 'het', 'een', 'en', 'zeer', 'niet', 'lekker', 'erg', 'met', 'voor', 'goed', 'eten', 'vriendelijk', 'was'],
  },
  pt: {
    chars: /[ãõâêôç]/g,
    words: ['o', 'a', 'os', 'e', 'muito', 'não', 'com', 'para', 'uma', 'bom', 'boa', 'comida', 'atendimento', 'é'],
  },
  pl: {
    chars: /[ąęłśżźćń]/g,
    words: ['i', 'nie', 'jest', 'bardzo', 'się', 'na', 'w', 'z', 'dobre', 'polecam', 'jedzenie', 'obsługa'],
  },
};

function countMatches(text: string, re: RegExp): number {
  re.lastIndex = 0;
  return (text.match(re) ?? []).length;
}

/**
 * Best-effort ISO 639-1 code of a review text, or null when unsure.
 * Script decides first (Cyrillic, Arabic, Greek…); Latin text is scored by
 * characteristic letters (×2) and common words.
 */
export function detectReviewLanguage(text: string | null | undefined): string | null {
  const value = clean(text);
  if (!value) return null;
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (letters.length < 3) return null;

  const share = (re: RegExp) => countMatches(letters, re) / letters.length;
  if (share(/[Ѐ-ӿ]/g) > 0.4) return /[іїєґІЇЄҐ]/.test(value) ? 'uk' : 'ru';
  if (share(/[؀-ۿ]/g) > 0.4) return /[پچژگ]/.test(value) ? 'fa' : 'ar';
  if (share(/[Ͱ-Ͽ]/g) > 0.4) return 'el';
  if (share(/[֐-׿]/g) > 0.4) return 'he';
  if (share(/[぀-ヿ]/g) > 0.2) return 'ja';
  if (share(/[가-힯]/g) > 0.3) return 'ko';
  if (share(/[一-鿿]/g) > 0.3) return 'zh';
  if (share(/[Ⴀ-ჿ]/g) > 0.4) return 'ka';
  if (share(/[԰-֏]/g) > 0.4) return 'hy';
  if (share(/[฀-๿]/g) > 0.4) return 'th';

  const words = value
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const wordsEn = value
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let best: string | null = null;
  let bestScore = 0;
  let secondScore = 0;
  for (const [code, hint] of Object.entries(LATIN_HINTS)) {
    const pool = code === 'tr' ? words : wordsEn;
    const wordHits = pool.filter((w) => hint.words.includes(w)).length;
    const score = wordHits + 2 * countMatches(value, hint.chars);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = code;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }
  if (!best || bestScore === 0) return null;
  // A tie means the text does not tell (e.g. "de" is both TR and NL).
  if (bestScore === secondScore) return null;
  return best;
}

const LANGUAGE_NAMES: Record<string, { tr: string; en: string }> = {
  tr: { tr: 'Türkçe', en: 'Turkish' },
  en: { tr: 'İngilizce', en: 'English' },
  de: { tr: 'Almanca', en: 'German' },
  fr: { tr: 'Fransızca', en: 'French' },
  es: { tr: 'İspanyolca', en: 'Spanish' },
  it: { tr: 'İtalyanca', en: 'Italian' },
  nl: { tr: 'Felemenkçe', en: 'Dutch' },
  pt: { tr: 'Portekizce', en: 'Portuguese' },
  pl: { tr: 'Lehçe', en: 'Polish' },
  ru: { tr: 'Rusça', en: 'Russian' },
  uk: { tr: 'Ukraynaca', en: 'Ukrainian' },
  ar: { tr: 'Arapça', en: 'Arabic' },
  fa: { tr: 'Farsça', en: 'Persian' },
  el: { tr: 'Yunanca', en: 'Greek' },
  he: { tr: 'İbranice', en: 'Hebrew' },
  ja: { tr: 'Japonca', en: 'Japanese' },
  ko: { tr: 'Korece', en: 'Korean' },
  zh: { tr: 'Çince', en: 'Chinese' },
  ka: { tr: 'Gürcüce', en: 'Georgian' },
  hy: { tr: 'Ermenice', en: 'Armenian' },
  th: { tr: 'Tayca', en: 'Thai' },
};

export function languageName(code: string | null | undefined, locale: 'tr' | 'en' = 'en'): string | null {
  if (!code) return null;
  return LANGUAGE_NAMES[code]?.[locale] ?? null;
}

// ─── keywords ────────────────────────────────────────────────────────────

export const REVIEW_STOPWORDS = new Set<string>([
  // TR
  'acaba', 'ama', 'ancak', 'artık', 'aslında', 'az', 'bana', 'bazen', 'bazı', 'belki', 'ben', 'beni',
  'benim', 'bile', 'bir', 'biraz', 'birçok', 'biri', 'birkaç', 'birşey', 'biz', 'bize', 'bizi', 'bizim',
  'böyle', 'bu', 'buna', 'bunda', 'bundan', 'bunu', 'bunun', 'burada', 'burası', 'çok', 'çünkü', 'da',
  'daha', 'dahi', 'de', 'defa', 'değil', 'diye', 'dolayı', 'en', 'fakat', 'falan', 'gibi', 'göre', 'hala',
  'hâlâ', 'hem', 'hep', 'hepsi', 'her', 'herkes', 'hiç', 'hiçbir', 'için', 'ile', 'ilk', 'ise', 'işte',
  'kadar', 'kendi', 'kez', 'ki', 'kim', 'mı', 'mi', 'mu', 'mü', 'nasıl', 'ne', 'neden', 'nerede', 'niye',
  'o', 'olan', 'olarak', 'oldu', 'olduğu', 'olduk', 'oldukça', 'olmak', 'olsa', 'olur', 'on', 'ona', 'onlar',
  'onu', 'onun', 'orada', 'öyle', 'önce', 'pek', 'sadece', 'sanki', 'sen', 'siz', 'size', 'sizin', 'sonra',
  'şey', 'şeyler', 'şu', 'şunu', 'tam', 'tek', 'tüm', 'üzere', 've', 'veya', 'ya', 'yani', 'yine', 'yok',
  'zaten', 'var', 'idi', 'iken', 'ayrıca', 'gayet', 'gerçekten', 'tekrar', 'yer', 'yere', 'yerde', 'kere',
  'gün', 'kişi', 'şekilde', 'etti', 'ettik', 'etmek', 'yaptık', 'geldik', 'gittik', 'aldık', 'bence',
  'teşekkürler', 'teşekkür', 'ederim', 'ederiz', 'herşey', 'her şey', 'bi', 'mısınız', 'misiniz',
  // EN
  'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been',
  'before', 'being', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'even', 'ever', 'every', 'few', 'for', 'from', 'get', 'got', 'had', 'has', 'have', 'having', 'he',
  'her', 'here', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'like', 'made',
  'make', 'many', 'me', 'more', 'most', 'much', 'my', 'no', 'not', 'now', 'of', 'off', 'on', 'once', 'one',
  'only', 'or', 'other', 'our', 'out', 'over', 'own', 'really', 'same', 'she', 'should', 'so', 'some',
  'still', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'time', 'to', 'too', 'two', 'under', 'up', 'us', 'very', 'was', 'we', 'well', 'went',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
  'came', 'come', 'definitely', 'would', 'thank', 'thanks', 'place', 'went', 'visit', 'visited',
]);

export interface ReviewKeywordInput {
  text: string | null;
  rating: number | null;
  language?: string | null;
}

export interface ReviewKeyword {
  word: string;
  mentions: number;
  sentiment: 'pos' | 'neu' | 'neg';
}

export function tokenizeReview(text: string, language?: string | null): string[] {
  const lowered = language === 'tr' || !language ? text.toLocaleLowerCase('tr-TR') : text.toLowerCase();
  return lowered
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !REVIEW_STOPWORDS.has(w));
}

/** Most frequent words across ORIGINAL review texts (one count per review). */
export function extractReviewKeywords(items: ReviewKeywordInput[], topN = 10): ReviewKeyword[] {
  const stats = new Map<string, { count: number; ratingSum: number }>();
  for (const item of items) {
    if (!item.text) continue;
    const seen = new Set<string>();
    for (const token of tokenizeReview(item.text, item.language)) {
      if (seen.has(token)) continue;
      seen.add(token);
      const entry = stats.get(token) ?? { count: 0, ratingSum: 0 };
      entry.count += 1;
      entry.ratingSum += item.rating ?? 3;
      stats.set(token, entry);
    }
  }
  return Array.from(stats.entries())
    .filter(([, s]) => s.count >= 2)
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([word, s]) => {
      const avg = s.ratingSum / s.count;
      return { word, mentions: s.count, sentiment: avg >= 4 ? 'pos' : avg <= 2.5 ? 'neg' : 'neu' };
    });
}

// ─── templates ───────────────────────────────────────────────────────────

/** First name for "{ad}": the reviewer's first word, never a full name. */
export function reviewerFirstName(name: string | null | undefined): string | null {
  const value = clean(name);
  if (!value) return null;
  const first = value.split(/\s+/)[0];
  return first.length >= 2 ? first : null;
}

/**
 * Fills `{ad}` / `{name}` and `{işletme}` / `{isletme}` / `{business}` in a
 * saved reply template. Without a name, "{ad}" is removed together with the
 * space or comma before it, so "Merhaba {ad}," becomes "Merhaba,".
 */
export function fillReplyTemplate(
  template: string,
  vars: { firstName?: string | null; businessName?: string | null },
): string {
  let out = template;
  const name = vars.firstName?.trim();
  out = name
    ? out.replace(/\{\s*(?:ad|name)\s*\}/gi, name)
    : out.replace(/[ \t]*\{\s*(?:ad|name)\s*\}/gi, '');
  const business = vars.businessName?.trim() ?? '';
  out = out.replace(/\{\s*(?:işletme|isletme|business)\s*\}/gi, business);
  return out.replace(/[ \t]+([,.!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
}
