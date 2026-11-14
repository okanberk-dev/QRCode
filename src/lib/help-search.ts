/**
 * Help Center search helpers — pure and tiny, so both the server (API route,
 * static fallback) and the client search page can import them without
 * pulling the article bodies into a browser bundle.
 */

/** Lowercase + fold Turkish letters so "sube" finds "şube" and vice versa. */
export function normalizeHelpSearchText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[âà]/g, 'a')
    .replace(/[îì]/g, 'i')
    .replace(/[ûù]/g, 'u')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a query into normalised words (empty array for a blank query). */
export function helpQueryWords(query: string): string[] {
  return normalizeHelpSearchText(query.slice(0, 100)).split(' ').filter(Boolean);
}

/**
 * Score an entry against query words: `null` when any word is missing,
 * otherwise the number of words that also appear in the title.
 */
export function scoreHelpMatch(words: string[], haystack: string, normalizedTitle: string): number | null {
  if (words.length === 0) return null;
  if (!words.every((word) => haystack.includes(word))) return null;
  return words.filter((word) => normalizedTitle.includes(word)).length;
}
