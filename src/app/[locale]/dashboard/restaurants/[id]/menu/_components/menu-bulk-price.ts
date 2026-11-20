/**
 * "Fiyatları değiştir" — price changes for many items at once (Menu Studio,
 * spec §5.7 / §7.7 BulkPriceDialog), e.g. +10 % rounded to 5 ₺ after an
 * inflation update.
 *
 * All amounts are integer minor units (kuruş / cents). Pure and React-free.
 */

export type PriceOp =
  | { kind: 'percent'; direction: 'up' | 'down'; /** percent, e.g. 7.5 */ value: number }
  | { kind: 'amount'; direction: 'up' | 'down'; cents: number }
  | { kind: 'fixed'; cents: number };

/** Rounding step in minor units: Yok · 1 · 5 · 10 (of the currency). */
export type PriceRounding = 0 | 100 | 500 | 1000;

export const PRICE_ROUNDINGS: readonly PriceRounding[] = [0, 100, 500, 1000];

/** Largest percentage accepted (a typo guard, not a business rule). */
export const MAX_PERCENT = 500;

/** "10", "7,5", "7.5", "%10", "10 %" → number; anything else, 0 or above 500 → null. */
export function parsePercentInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim().replace(/^%\s*/, '').replace(/\s*%$/, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_PERCENT) return null;
  return value;
}

/** Round half up to a multiple of `step` (0 = no rounding). */
export function roundTo(cents: number, step: PriceRounding): number {
  if (!step) return cents;
  return Math.floor((cents + step / 2) / step) * step;
}

/** Thousandths of a percent, so 7.5 % is exact integer math. */
function scaledPercent(value: number): number {
  return Math.round(value * 1000);
}

/** The new price for one item: an integer, never below 0. */
export function applyPriceOp(cents: number, op: PriceOp, rounding: PriceRounding): number {
  let next: number;
  if (op.kind === 'percent') {
    const factor = 100_000 + (op.direction === 'up' ? 1 : -1) * scaledPercent(op.value);
    next = Math.round((cents * factor) / 100_000);
  } else if (op.kind === 'amount') {
    next = cents + (op.direction === 'up' ? op.cents : -op.cents);
  } else {
    next = op.cents;
  }
  next = roundTo(Math.max(0, Math.round(next)), rounding);
  return Math.max(0, next);
}

export interface BulkPriceItem {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
}

export interface BulkPricePreview {
  /** Items whose price changes, in input order. */
  changes: { id: string; name: string; from: number; to: number }[];
  /** Items that would keep their price. */
  unchanged: number;
  /** Changed items that would end at 0. */
  zeroCount: number;
  /** The selection mixes currencies (only percent makes sense then). */
  mixedCurrency: boolean;
}

export function previewPriceOp(items: BulkPriceItem[], op: PriceOp, rounding: PriceRounding): BulkPricePreview {
  const changes: BulkPricePreview['changes'] = [];
  let unchanged = 0;
  let zeroCount = 0;
  for (const item of items) {
    const to = applyPriceOp(item.priceCents, op, rounding);
    if (to === item.priceCents) {
      unchanged += 1;
      continue;
    }
    changes.push({ id: item.id, name: item.name, from: item.priceCents, to });
    if (to === 0) zeroCount += 1;
  }
  const mixedCurrency = new Set(items.map((i) => (i.currency || 'TRY').toUpperCase())).size > 1;
  return { changes, unchanged, zeroCount, mixedCurrency };
}
