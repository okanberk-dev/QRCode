/**
 * Blog byline helpers (blog index + post page).
 *
 * Posts come from the DB. A missing author — or one of the placeholder names
 * that came from the 2026-04 design prototype and were never real people —
 * is shown as the Buaze team instead (spec D3: no invented people). Any other
 * author string is the operator's choice and is shown as entered.
 */

const PLACEHOLDER_AUTHORS = new Set(['emre kaya', 'zeynep aydın', 'mert yılmaz', 'selin demir']);

export function displayBlogAuthor(raw: string | null | undefined, locale: 'tr' | 'en'): string {
  const name = (raw ?? '').trim();
  if (!name || PLACEHOLDER_AUTHORS.has(name.toLocaleLowerCase('tr-TR'))) {
    return locale === 'tr' ? 'Buaze ekibi' : 'Buaze team';
  }
  return name;
}

/** Team bylines ("Buaze Ekibi", "Buaze Content Team") are an Organization, not a Person. */
export function isTeamAuthor(name: string): boolean {
  return /buaze|ekib|team|içerik|content/i.test(name);
}

export function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR');
}
