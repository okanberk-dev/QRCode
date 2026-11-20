/**
 * Pasting a list into the builder (Menu Studio, spec §5.7 / §8.3).
 *
 * One item per line, name first and price last — the same reading as
 * `parseMenuLines` (`src/lib/menu-bulk-parse.ts`), which the bulk endpoint
 * also re-checks. On top of that, a pasted block may carry category headers:
 *
 *   Çorbalar:                ← header (ends with a colon)
 *   Mercimek 90
 *   Ezogelin 95
 *   Tatlılar                 ← header (no price, and the next line has one)
 *   Baklava 180
 *   Künefe                   ← NOT a header: nothing priced follows → error row
 *
 * Lines before the first header form a headerless section (they go into the
 * category the owner picked). The review shows every line before anything is
 * created; headers become new categories unless the owner unticks them.
 *
 * Pure and React-free (node:test).
 */
import {
  MENU_BULK_MAX_ITEMS,
  MENU_BULK_NAME_MAX,
  parseMenuLines,
  type MenuLineError,
} from '@/lib/menu-bulk-parse';
import { checkPrice, priceToInput } from './menu-item-form';
import { SETUP_CATEGORY_NAME_MAX, makeSetupKey, type SetupCategory } from './menu-setup';

export type PasteRowError = MenuLineError;

export interface PasteRow {
  /** Stable React key. */
  id: string;
  /** The pasted line as read (bullets stripped, spaces collapsed). */
  line: string;
  /** Editable name. */
  name: string;
  /** Editable price text. */
  price: string;
  priceCents: number | null;
  error: PasteRowError | null;
}

export interface PasteSection {
  id: string;
  /** Category name from a header line; null for the lines before the first header. */
  header: string | null;
  /** Create the header as a new category (on by default; off merges into the picked category). */
  asCategory: boolean;
  rows: PasteRow[];
  /** More readable items than one bulk request takes (`MENU_BULK_MAX_ITEMS`); the extras are left out. */
  overLimit: boolean;
}

const LINE_BREAK = /\r\n|[\r\n\u2028\u2029]/;
const HEADER_MARKS = /^[\s#\-•*·–—]+/;
/** "Kola 1,250" → name "Kola", price "1,250" (for rows the parser could not read). */
const TRAILING_NUMBER = /^(.*?)[\s:;|–—-]+(?:₺\s*)?([\d.,]+)\s*(?:₺|TL|TRY)?\.?$/i;

function nonBlankLines(text: string): string[] {
  if (typeof text !== 'string' || !text) return [];
  return text.split(LINE_BREAK).filter((line) => line.replace(HEADER_MARKS, '').trim() !== '');
}

/** Two or more non-blank lines — the quick-add field hands such a paste to the review instead. */
export function isMultiLinePaste(text: string): boolean {
  return nonBlankLines(text).length >= 2;
}

/**
 * Quick-add name ⏎ with the price field still empty: a typed "Mocha 130" (the
 * format the hint shows) splits like a paste would. Null keeps the fields as
 * they are (price already typed, or no readable trailing price).
 */
export function splitTypedQuickAdd(name: string, price: string): { name: string; priceCents: number } | null {
  if (price.trim()) return null;
  return parseSingleLine(name);
}

/** One readable "name price" line (e.g. "Mercimek Çorbası 90"), else null. */
export function parseSingleLine(text: string): { name: string; priceCents: number } | null {
  if (nonBlankLines(text).length !== 1) return null;
  const { rows } = parseMenuLines(text, 1);
  const row = rows[0];
  if (!row || row.error !== undefined) return null;
  return { name: row.name, priceCents: row.priceCents };
}

let rowSeq = 0;
function nextId(prefix: string): string {
  rowSeq += 1;
  return `${prefix}${rowSeq}`;
}

function headerName(line: string): string | null {
  const name = line.replace(HEADER_MARKS, '').replace(/:+\s*$/, '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > SETUP_CATEGORY_NAME_MAX) return null;
  return name;
}

function toRow(
  parsed: ReturnType<typeof parseMenuLines>['rows'][number],
  isTr: boolean,
): PasteRow {
  if (parsed.error === undefined) {
    return {
      id: nextId('r'),
      line: parsed.line,
      name: parsed.name,
      price: priceToInput(parsed.priceCents, isTr),
      priceCents: parsed.priceCents,
      error: null,
    };
  }
  const split = TRAILING_NUMBER.exec(parsed.line);
  return {
    id: nextId('r'),
    line: parsed.line,
    name: split ? split[1].trim() : parsed.line,
    price: split ? split[2] : '',
    priceCents: null,
    error: parsed.error,
  };
}

function countReadable(rows: PasteRow[]): number {
  return rows.reduce((n, r) => n + (r.error === null ? 1 : 0), 0);
}

/** Read a pasted block into sections (see the header rules at the top). */
export function parsePasteBlock(text: string, isTr: boolean): { sections: PasteSection[] } {
  const lines = nonBlankLines(text);
  const parsed = lines.map((line) => parseMenuLines(line, 1).rows[0]).filter(Boolean);

  const sections: PasteSection[] = [];
  let current: PasteSection | null = null;
  const open = (header: string | null): PasteSection => {
    const section: PasteSection = { id: nextId('s'), header, asCategory: header !== null, rows: [], overLimit: false };
    sections.push(section);
    return section;
  };

  parsed.forEach((row, index) => {
    if (row.error === 'no_price') {
      const explicit = /:\s*$/.test(row.line);
      const next = parsed[index + 1];
      const followedByPrice = !!next && next.error !== 'no_price';
      const name = explicit || followedByPrice ? headerName(row.line) : null;
      if (name) {
        current = open(name);
        return;
      }
    }
    if (!current) current = open(null);
    current.rows.push(toRow(row, isTr));
  });

  for (const section of sections) section.overLimit = countReadable(section.rows) > MENU_BULK_MAX_ITEMS;
  return { sections };
}

/** Re-read a row after the owner edited its name or price in the review. */
export function revalidateRow(row: PasteRow, isTr: boolean): PasteRow {
  const name = row.name.replace(/\s+/g, ' ').trim();
  const check = checkPrice(row.price);
  let error: PasteRowError | null = null;
  if (!name) error = 'no_name';
  else if (name.length > MENU_BULK_NAME_MAX) error = 'name_too_long';
  else if (check.kind === 'empty') error = 'no_price';
  else if (check.kind === 'invalid') error = 'bad_price';
  const priceCents = check.kind === 'ok' ? check.cents : null;
  return {
    ...row,
    name,
    price: check.kind === 'ok' ? priceToInput(check.cents, isTr) : row.price,
    priceCents: error === null ? priceCents : null,
    error,
  };
}

export interface PastePlanItem {
  name: string;
  priceCents: number;
}

export interface PastePlan {
  /** Rows for the category the owner picked (headerless lines + unticked headers), at most 30. */
  intoTarget: PastePlanItem[];
  /** Ticked headers that have at least one readable row, each with at most 30 items. */
  newCategories: { name: string; items: PastePlanItem[] }[];
}

/**
 * Readable rows bound for the picked category: headerless lines and unticked
 * headers merge there, so the 30-item cap applies to their sum, not to each section.
 */
export function targetReadableCount(sections: PasteSection[]): number {
  return sections
    .filter((s) => s.header === null || !s.asCategory)
    .reduce((n, s) => n + countReadable(s.rows), 0);
}

/** What "Ekle" will create. Rows with errors are left out. */
export function pastePlan(sections: PasteSection[]): PastePlan {
  const intoTarget: PastePlanItem[] = [];
  const newCategories: PastePlan['newCategories'] = [];
  for (const section of sections) {
    const items = section.rows
      .filter((r) => r.error === null && r.priceCents !== null)
      .map((r) => ({ name: r.name, priceCents: r.priceCents as number }));
    if (section.header !== null && section.asCategory) {
      if (items.length > 0) newCategories.push({ name: section.header, items: items.slice(0, MENU_BULK_MAX_ITEMS) });
    } else {
      intoTarget.push(...items);
    }
  }
  return { intoTarget: intoTarget.slice(0, MENU_BULK_MAX_ITEMS), newCategories };
}

/**
 * Setup "Listemi yapıştır": one wizard category per section. Lines before the
 * first header become a category with a default name. Unreadable lines are
 * kept as written so the wizard can say they will be skipped.
 */
export function setupCategoriesFromPaste(sections: PasteSection[], isTr: boolean): SetupCategory[] {
  return sections
    .filter((section) => section.header !== null || section.rows.length > 0)
    .map((section) => ({
      key: makeSetupKey(),
      name: section.header ?? (isTr ? 'Ürünler' : 'Items'),
      itemsText: section.rows
        .map((r) => (r.error === null && r.priceCents !== null ? `${r.name} ${priceToInput(r.priceCents, isTr)}` : r.line))
        .join('\n'),
    }));
}
