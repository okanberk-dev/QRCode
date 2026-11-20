import { resolveDisplayTimeZone } from '@/lib/timezone';

/**
 * Display formatting shared by the billing pages, the hand-off page, the
 * owner panel and the billing mails (billing spec §13). Pure, safe on the
 * server and in the browser. Dates are shown in the display time zone
 * (Europe/Istanbul by default, CLAUDE.md §46), so the server render and the
 * browser render always agree.
 */

export type BillingLocale = 'tr' | 'en';

/** Kuruş → "₺999,00" (TR) / "₺999.00" (EN). Always two decimals, always the lira sign. */
export function formatTry(amountMinor: number, locale: BillingLocale): string {
  const lira = Math.round(amountMinor) / 100;
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
      style: 'currency',
      currency: 'TRY',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(lira);
  } catch {
    return `₺${lira.toFixed(2)}`;
  }
}

/** "19 Ara 2026" (TR) / "Dec 19, 2026" (EN) in the display time zone; '' for an invalid date. */
export function formatIstanbulDate(value: Date | string | null | undefined, locale: BillingLocale): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: resolveDisplayTimeZone(),
    }).format(d);
  } catch {
    return '';
  }
}

/** "08/28" for a card expiry; '' when unknown. */
export function formatCardExpiry(expMonth: number | null | undefined, expYear: number | null | undefined): string {
  if (!expMonth || !expYear || expMonth < 1 || expMonth > 12) return '';
  return `${String(expMonth).padStart(2, '0')}/${String(expYear % 100).padStart(2, '0')}`;
}

const BRAND_LABELS: Record<string, string> = {
  VISA: 'VISA',
  MASTERCARD: 'MASTERCARD',
  MASTER: 'MASTERCARD',
  TROY: 'TROY',
  AMEX: 'AMEX',
  AMERICANEXPRESS: 'AMEX',
};

/** Card brand as shown on the card visual (no logo assets): a known network name or "KART"/"CARD". */
export function cardBrandLabel(brand: string | null | undefined, locale: BillingLocale): string {
  const key = (brand ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  return BRAND_LABELS[key] ?? (locale === 'en' ? 'CARD' : 'KART');
}

/** Screen-reader label: "Visa kart, son dört hane 4242, son kullanma 08/28". */
export function cardAriaLabel(
  card: { brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null },
  locale: BillingLocale,
): string {
  const brand = cardBrandLabel(card.brand, locale);
  const nice = brand === 'KART' || brand === 'CARD' ? '' : `${brand.charAt(0)}${brand.slice(1).toLowerCase()} `;
  const expiry = formatCardExpiry(card.expMonth, card.expYear);
  if (locale === 'en') {
    return `${nice}card${card.last4 ? `, last four digits ${card.last4}` : ''}${expiry ? `, expires ${expiry}` : ''}`;
  }
  return `${nice}kart${card.last4 ? `, son dört hane ${card.last4}` : ''}${expiry ? `, son kullanma ${expiry}` : ''}`;
}
