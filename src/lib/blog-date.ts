/**
 * Parses a human-readable blog post date (TR or EN) to a Date.
 *
 * Accepts:
 *   - TR: "15 Mart 2026"  (day [TR-month] year)
 *   - EN: "March 15, 2026" (month-name day, year)
 *   - ISO 8601 fall-through: "2026-03-15"
 *
 * Returns null when the input does not match any known shape — caller decides
 * whether to fall back to `new Date()` or skip the field.
 *
 * Used by:
 *   - blog seed (to spread `createdAt` per post so Article.dateModified does
 *     not collapse to the seed runtime for every row)
 *   - `BlogPost` Article JSON-LD (datePublished must be ISO 8601 for Google)
 */

const TR_MONTHS: Record<string, number> = {
  ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
  temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
};

const EN_MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export function parseBlogDate(input: string): Date | null {
  if (!input) return null;

  // ISO short-circuit
  const iso = new Date(input);
  if (input.match(/^\d{4}-\d{2}-\d{2}/) && !isNaN(iso.getTime())) {
    return iso;
  }

  const trMatch = input
    .toLowerCase()
    .trim()
    .match(/^(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})$/);
  if (trMatch) {
    const [, day, month, year] = trMatch;
    const m = TR_MONTHS[month];
    if (m !== undefined) {
      return new Date(Date.UTC(Number(year), m, Number(day)));
    }
  }

  const enMatch = input
    .toLowerCase()
    .trim()
    .match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (enMatch) {
    const [, month, day, year] = enMatch;
    const m = EN_MONTHS[month];
    if (m !== undefined) {
      return new Date(Date.UTC(Number(year), m, Number(day)));
    }
  }

  return null;
}

/** Returns ISO 8601 string suitable for `datePublished` / `dateModified`. */
export function blogDateToIso(input: string): string | null {
  const d = parseBlogDate(input);
  return d ? d.toISOString() : null;
}
