/**
 * Pure logic of the item editor (no React): the price field, what counts as
 * "unsaved", and which fields go into the PATCH.
 *
 * Kept apart from `ItemEditorModal` so the rules can be tested with node:test
 * and so the modal stays about layout and focus.
 */
import { formatPrice, parsePriceInput } from '@/lib/format';

/** Currency symbols for the price field; any other code is shown as is. */
const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };

/** Symbol shown next to the price field for a product's own currency (new products are TRY). */
export function currencySymbol(code?: string | null): string {
  const upper = (code || 'TRY').trim().toUpperCase();
  return CURRENCY_SYMBOLS[upper] ?? upper;
}

type PriceCheck =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'ok'; cents: number; zero: boolean };

/** What the typed price means. The field starts empty, so "empty" is a state of its own. */
export function checkPrice(raw: string): PriceCheck {
  const text = raw.trim();
  if (!text) return { kind: 'empty' };
  const cents = parsePriceInput(text);
  if (cents === null) return { kind: 'invalid' };
  return { kind: 'ok', cents, zero: cents === 0 };
}

/**
 * Quiet echo under the price field: how the typed amount was understood.
 * Only shown when the text holds a dot or comma (the ambiguous cases), e.g.
 * `1.250` → "₺1.250", so a Turkish thousands separator is visibly read right.
 */
export function priceEcho(raw: string, currency: string, isTr: boolean): string | null {
  if (!/[.,]/.test(raw)) return null;
  const check = checkPrice(raw);
  if (check.kind !== 'ok') return null;
  return formatPrice(check.cents, currency || 'TRY', isTr ? 'tr-TR' : 'en-US');
}

/** An existing price as the owner would type it: `185`, `185,50` (Turkish) / `185.50`. */
export function priceToInput(cents: number | null | undefined, isTr: boolean): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '';
  if (cents % 100 === 0) return String(cents / 100);
  const text = (cents / 100).toFixed(2);
  return isTr ? text.replace('.', ',') : text;
}

/** Everything the editor lets you change. */
export interface ItemFormValues {
  categoryId: string;
  name: string;
  description: string;
  /** What is in the price field (empty until typed). */
  price: string;
  badges: string[];
  allergens: string[];
  isAvailable: boolean;
  isOutOfStock: boolean;
  /** Stored photo: a data URL, a link, or none. */
  imageUrl: string | null;
}

/** The item being edited (or the defaults of a new one), as the editor starts. */
interface ItemFormSource {
  categoryId?: string;
  name?: string;
  description?: string | null;
  priceCents?: number;
  badges?: string[];
  allergens?: string[];
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  imageUrl?: string | null;
}

export function initialItemFormValues(
  mode: 'create' | 'edit',
  source: ItemFormSource,
  fallbackCategoryId: string,
  isTr: boolean,
): ItemFormValues {
  return {
    categoryId: source.categoryId || fallbackCategoryId,
    name: source.name ?? '',
    description: source.description ?? '',
    // A new product starts with an empty price (a typed "0" used to be left
    // behind and saved); an existing one shows its stored price.
    price: mode === 'edit' ? priceToInput(source.priceCents, isTr) : '',
    badges: source.badges ?? [],
    allergens: source.allergens ?? [],
    isAvailable: source.isAvailable ?? true,
    isOutOfStock: source.isOutOfStock ?? false,
    imageUrl: source.imageUrl ?? null,
  };
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const inB = new Set(b);
  return a.every((x) => inB.has(x));
}

const cleanText = (value: string): string | null => value.trim() || null;

/** The fields of a PATCH. Absent means "leave as is" (the server treats the request as partial). */
export interface ItemPatch {
  categoryId?: string;
  name?: string;
  description?: string | null;
  priceCents?: number;
  imageUrl?: string | null;
  badges?: string[];
  allergens?: string[];
  isAvailable?: boolean;
  isOutOfStock?: boolean;
}

/**
 * Only what changed. A photo that was not touched is never sent again — the
 * stored one can be a 100 KB data URL, and re-sending it on every rename was
 * the old behaviour. A price that does not parse is left out (the editor
 * refuses to save it anyway).
 */
export function buildEditPatch(initial: ItemFormValues, current: ItemFormValues): ItemPatch {
  const patch: ItemPatch = {};
  if (current.categoryId !== initial.categoryId) patch.categoryId = current.categoryId;
  if (current.name.trim() !== initial.name.trim()) patch.name = current.name.trim();
  if (cleanText(current.description) !== cleanText(initial.description)) {
    patch.description = cleanText(current.description);
  }
  const now = checkPrice(current.price);
  const before = checkPrice(initial.price);
  if (now.kind === 'ok' && (before.kind !== 'ok' || before.cents !== now.cents)) patch.priceCents = now.cents;
  if ((current.imageUrl || null) !== (initial.imageUrl || null)) patch.imageUrl = current.imageUrl || null;
  if (!sameSet(current.badges, initial.badges)) patch.badges = current.badges;
  if (!sameSet(current.allergens, initial.allergens)) patch.allergens = current.allergens;
  if (current.isAvailable !== initial.isAvailable) patch.isAvailable = current.isAvailable;
  if (current.isOutOfStock !== initial.isOutOfStock) patch.isOutOfStock = current.isOutOfStock;
  return patch;
}

/** A new item: every field, in the shape of `POST …/menu/items`. */
export function buildCreatePayload(current: ItemFormValues, priceCents: number): Required<ItemPatch> {
  return {
    categoryId: current.categoryId,
    name: current.name.trim(),
    description: cleanText(current.description),
    priceCents,
    imageUrl: current.imageUrl || null,
    badges: current.badges,
    allergens: current.allergens,
    isAvailable: current.isAvailable,
    isOutOfStock: current.isOutOfStock,
  };
}

/**
 * Whether closing would lose something. New item: any of name / price /
 * description / photo filled in. Existing item: any difference from what was
 * loaded (an unparseable price counts, even though it cannot be sent).
 */
export function isItemFormDirty(mode: 'create' | 'edit', initial: ItemFormValues, current: ItemFormValues): boolean {
  if (mode === 'create') {
    return Boolean(
      current.name.trim() ||
        current.price.trim() ||
        current.description.trim() ||
        current.imageUrl ||
        current.badges.length ||
        current.allergens.length,
    );
  }
  if (checkPrice(current.price).kind === 'invalid') return true;
  return Object.keys(buildEditPatch(initial, current)).length > 0;
}

/** The editor after "Save & add another": category kept, everything else for the next item blank. */
export function nextItemFormValues(current: ItemFormValues): ItemFormValues {
  return {
    categoryId: current.categoryId,
    name: '',
    description: '',
    price: '',
    badges: [],
    allergens: [],
    isAvailable: true,
    isOutOfStock: false,
    imageUrl: null,
  };
}

/** True when the "more options" part holds something worth showing at once (edit mode). */
export function hasExtraOptions(values: ItemFormValues): boolean {
  return Boolean(
    values.description.trim() ||
      values.badges.length ||
      values.allergens.length ||
      !values.isAvailable ||
      values.isOutOfStock ||
      (values.imageUrl && !values.imageUrl.startsWith('data:')),
  );
}
