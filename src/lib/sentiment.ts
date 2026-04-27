/**
 * Deterministic keyword extraction for the owner-panel sentiment word cloud
 * (`/[locale]/dashboard/analytics`). No external NLP/AI dependency — runs
 * cheaply in-process on each SSR request.
 *
 * Approach:
 *   1. Tokenize comments (lowercase, strip punctuation, split on whitespace).
 *   2. Drop stop-words (TR + EN base set).
 *   3. Tag each token as positive / negative / neutral via a curated lexicon.
 *      Tokens not in the lexicon are dropped from the cloud (we don't show
 *      raw frequencies for unknown words — too noisy).
 *   4. Aggregate per (word, polarity) and return top N.
 *
 * The lexicon is intentionally small (~40 words) and Turkish-first. Owners
 * see the most common emotional vocabulary in their reviews. This is *not* a
 * full sentiment analysis pipeline; it's a quick word cloud for the panel.
 */

export type Polarity = 'pos' | 'neg';

export interface SentimentWord {
  /** Lowercased word as it appears in the lexicon */
  word: string;
  /** Number of comments containing this word */
  count: number;
  polarity: Polarity;
}

const STOP_WORDS_TR = new Set([
  've', 'veya', 'ile', 'için', 'gibi', 'ama', 'fakat', 'ki', 'mi', 'mı', 'mu',
  'mü', 'ne', 'çok', 'daha', 'her', 'bu', 'şu', 'o', 'bir', 'iki', 'üç', 'de',
  'da', 'te', 'ta', 'olarak', 'olan', 'oldu', 'olduğu', 'oldukça', 'sonra',
  'önce', 'kadar', 'şey', 'ben', 'sen', 'biz', 'siz', 'onlar', 'benim',
  'senin', 'bizim', 'sizin', 'onların', 'kendi', 'tam', 'özellikle', 'ise',
  'hem', 'aynı', 'birkaç', 'biraz',
]);

const STOP_WORDS_EN = new Set([
  'and', 'or', 'with', 'for', 'like', 'but', 'that', 'is', 'was', 'are', 'were',
  'a', 'an', 'the', 'this', 'these', 'those', 'i', 'you', 'we', 'they', 'he',
  'she', 'it', 'in', 'on', 'at', 'to', 'of', 'as', 'so', 'too', 'very', 'much',
  'more', 'less', 'all', 'any', 'no', 'not', 'than', 'then',
]);

/**
 * Curated polarity lexicon — TR primary, EN fallback. Each entry maps a base
 * word to its polarity. Stems aren't normalized (Turkish has rich morphology
 * — "lezzetli/lezzetlidir/lezzetlilik" all match against "lezzetli" via
 * word-prefix matching). See `findStem` below.
 */
const LEXICON: Record<string, Polarity> = {
  // Positive (TR)
  lezzet: 'pos', lezzetli: 'pos', muhteşem: 'pos', mükemmel: 'pos',
  harika: 'pos', güzel: 'pos', süper: 'pos', tavsiye: 'pos', önerilir: 'pos',
  hızlı: 'pos', taze: 'pos', temiz: 'pos', sıcak: 'pos', kibar: 'pos',
  ilgili: 'pos', samimi: 'pos', uygun: 'pos', kaliteli: 'pos', şahane: 'pos',
  nefis: 'pos', enfes: 'pos', servis: 'pos', şef: 'pos', mekan: 'pos',
  manzara: 'pos', tatlı: 'pos', köfte: 'pos',
  // Positive (EN)
  great: 'pos', delicious: 'pos', excellent: 'pos', amazing: 'pos',
  wonderful: 'pos', perfect: 'pos', tasty: 'pos', clean: 'pos', fast: 'pos',
  fresh: 'pos', friendly: 'pos', polite: 'pos', recommended: 'pos',

  // Negative (TR)
  kötü: 'neg', berbat: 'neg', soğuk: 'neg', yavaş: 'neg', pahalı: 'neg',
  kaba: 'neg', ilgisiz: 'neg', bayat: 'neg', kirli: 'neg', tuzsuz: 'neg',
  hijyen: 'neg', yağlı: 'neg', küçük: 'neg', az: 'neg', sorun: 'neg',
  kalitesiz: 'neg', tatsız: 'neg',
  // Negative (EN)
  bad: 'neg', terrible: 'neg', cold: 'neg', slow: 'neg', expensive: 'neg',
  rude: 'neg', dirty: 'neg', stale: 'neg', greasy: 'neg', small: 'neg',
};

/**
 * Match a token against the lexicon by prefix (Turkish suffix-rich morphology).
 * E.g. "lezzetlidir" → "lezzet" (longest-prefix wins).
 */
function findStem(token: string): string | null {
  if (LEXICON[token]) return token;
  // Try shrinking suffix: "lezzetliydi" → "lezzetli" → "lezzet"
  for (let len = token.length - 1; len >= 4; len--) {
    const slice = token.slice(0, len);
    if (LEXICON[slice]) return slice;
  }
  return null;
}

/**
 * Extract top sentiment words from a list of comments. Each comment counts at
 * most once per word (so a single ranty comment doesn't dominate the cloud).
 *
 * @param comments  Customer review text (raw)
 * @param topN      How many words to return (default 16)
 */
export function extractSentimentWords(
  comments: string[],
  topN = 16,
): SentimentWord[] {
  const counts = new Map<string, number>();

  for (const comment of comments) {
    if (!comment) continue;
    // Tokenize: lowercase, replace non-letter with space, split.
    // \p{L} is Unicode letter — keeps Turkish diacritics intact.
    const tokens = comment
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4);

    const seenInThisComment = new Set<string>();
    for (const token of tokens) {
      if (STOP_WORDS_TR.has(token) || STOP_WORDS_EN.has(token)) continue;
      const stem = findStem(token);
      if (!stem) continue;
      if (seenInThisComment.has(stem)) continue;
      seenInThisComment.add(stem);
      counts.set(stem, (counts.get(stem) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count, polarity: LEXICON[word] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
