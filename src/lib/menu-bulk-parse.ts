/**
 * "Liste yapıştır" — turn pasted lines into menu items.
 *
 * One item per line: the **name first, the price last**.
 *
 *   Klasik Burger 185          → Klasik Burger, 185 TL
 *   Cheeseburger - 215,50      → Cheeseburger, 215,50 TL
 *   - Çay 20 TL                → Çay, 20 TL        (bullet and TL/₺/TRY are noise)
 *   Pizza 30 cm 250            → "Pizza 30 cm", 250 TL   (only the LAST number is the price)
 *   Menü 1.250                 → Menü, 1.250 TL    (TR thousands separator)
 *   Kola 1,250                 → bad_price         (1,25 or 1250? — we do not guess)
 *
 * The same module is used by the preview in the modal and, through the
 * limits below, by `POST …/menu/items/bulk` — the server never trusts this
 * parser, it re-validates every row.
 *
 * Pure and dependency-free (apart from the shared price parser) so it runs in
 * the client bundle and in tests. Deliberately avoids regex look-behind: the
 * builder bundle must keep parsing on iOS Safari < 16.4.
 */

import { parsePriceInput } from './format';

/** Most items accepted in one paste / one bulk request. */
export const MENU_BULK_MAX_ITEMS = 30;
/** Longest item name; mirrors `validateMenuItem` (`sanitizeText(name, 120)`). */
export const MENU_BULK_NAME_MAX = 120;

export type MenuLineError = 'no_price' | 'no_name' | 'name_too_long' | 'bad_price';

export type ParsedMenuLine =
  | { name: string; priceCents: number; line: string; error?: undefined }
  | { error: MenuLineError; line: string; name?: undefined; priceCents?: undefined };

export interface ParseMenuLinesResult {
  /** In input order. At most `max` rows; blank lines never appear. */
  rows: ParsedMenuLine[];
  /** More than `max` non-blank lines were pasted (the extras are dropped). */
  overLimit: boolean;
}

const LINE_BREAK = /\r\n|[\r\n\u2028\u2029]/;
/** Leading list marker: -, •, *, ·, – (en dash), — (em dash) and spaces. */
const LEADING_BULLET = /^[\s\-•*·–—]+/;
/** Characters that may sit between the name and the price. */
const SEPARATOR_CHARS = /[\s:;|–—\-.,]/;
const TRAILING_SEPARATORS = /[\s:;|–—\-.,]+$/;

function stripTrailingCurrency(text: string): string {
  // "185 TL", "185TL", "185 ₺", "185 TRY", "185 TL." — only directly after a digit,
  // so a name that happens to end in "tl" is left alone.
  return text.replace(/(\d)\s*(?:₺|TL|TRY)\.?\s*$/i, '$1');
}

function parseOneLine(rawLine: string): ParsedMenuLine | null {
  const line = rawLine.replace(LEADING_BULLET, '').replace(/\s+/g, ' ').trim();
  if (!line) return null;

  const rest = stripTrailingCurrency(line);
  const run = /[\d.,]+$/.exec(rest);
  if (!run) return { error: 'no_price', line };

  // A run of dots/commas in front of the digits is a leader ("Burger .... 185"),
  // not part of the number.
  const leaders = /^[.,]+/.exec(run[0]);
  const token = leaders ? run[0].slice(leaders[0].length) : run[0];
  if (!token) return { error: 'no_price', line };
  let head = rest.slice(0, run.index) + (leaders ? leaders[0] : '');

  // Optional currency marker in front of the number: "₺185", "TL 185".
  let hadCurrencyPrefix = false;
  if (/₺\s*$/.test(head)) {
    head = head.replace(/₺\s*$/, '');
    hadCurrencyPrefix = true;
  } else if (/(^|[\s:;|–—\-])(?:TL|TRY)\s*$/i.test(head)) {
    head = head.replace(/(^|[\s:;|–—\-])(?:TL|TRY)\s*$/i, '$1');
    hadCurrencyPrefix = true;
  }

  // The number has to stand apart from the name: "Ayran35" is a name, not a
  // price (unless an explicit currency marker separates them).
  const last = head.slice(-1);
  if (last !== '' && !hadCurrencyPrefix && !SEPARATOR_CHARS.test(last)) {
    return { error: 'no_price', line };
  }

  const name = head.replace(TRAILING_SEPARATORS, '').replace(/\s+/g, ' ').trim();
  if (!name) return { error: 'no_name', line };

  const priceCents = parsePriceInput(token);
  if (priceCents === null) return { error: 'bad_price', line };

  if (name.length > MENU_BULK_NAME_MAX) return { error: 'name_too_long', line };

  return { name, priceCents, line };
}

export function parseMenuLines(
  text: string,
  max: number = MENU_BULK_MAX_ITEMS,
): ParseMenuLinesResult {
  const rows: ParsedMenuLine[] = [];
  let overLimit = false;
  if (typeof text !== 'string' || !text) return { rows, overLimit };

  for (const rawLine of text.split(LINE_BREAK)) {
    const parsed = parseOneLine(rawLine);
    if (!parsed) continue; // blank (or bullet-only) line
    if (rows.length >= max) {
      overLimit = true;
      break;
    }
    rows.push(parsed);
  }
  return { rows, overLimit };
}
