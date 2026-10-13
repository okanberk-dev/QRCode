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

// Accepts both TR ("1.234,56") and EN ("1,234.56") formats, plus simple
// decimals ("1,50" / "1.50"). When both a comma and a dot appear, the last
// occurrence is treated as the decimal separator; the other becomes a
// thousands separator. When only dots appear with multiple occurrences,
// all dots are treated as thousands separators.
//
// A single dot followed by exactly three digits ("1.250", "12.345") is a
// Turkish thousands separator: three decimals are never a valid price, so
// reading it as a decimal could only ever produce an error. The integer part
// must not start with a zero ("0.250" stays invalid). "1,250" (comma + three
// digits) is deliberately NOT accepted — it is genuinely ambiguous between
// 1,25 and 1250, so it is rejected instead of guessed.
export function parsePriceInput(value: string): number | null {
  if (typeof value !== 'string') return null;
  let cleaned = value.replace(/\s/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const dotCount = (cleaned.match(/\./g) || []).length;

  if (hasComma && dotCount > 0) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // TR: "1.234,56"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // EN: "1,234.56"
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // "1,50" or "1,234,567" — treat comma as decimal only when there's one,
    // otherwise as thousands separators.
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount === 1) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (dotCount > 1) {
    // Multiple dots: all thousands separators.
    cleaned = cleaned.replace(/\./g, '');
  } else if (/^[1-9]\d{0,2}\.\d{3}$/.test(cleaned)) {
    // Single dot + exactly three digits: TR thousands separator ("1.250").
    cleaned = cleaned.replace('.', '');
  }

  if (!/^\d{1,9}(\.\d{0,2})?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0 || num > 10_000_000) return null;
  return Math.round(num * 100);
}
