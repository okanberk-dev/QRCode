export function formatPrice(cents: number, currency = 'TRY', locale: string = 'tr-TR'): string {
  if (!Number.isFinite(cents)) return '';
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function parsePriceInput(value: string): number | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  if (!/^\d{1,6}(\.\d{0,2})?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}
