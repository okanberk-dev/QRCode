/**
 * Pano labels are sentence case (docs/design/DASHBOARD_DESIGN.md §3 — no ALL
 * CAPS). Older panel code wrote eyebrow labels in capitals ("MENÜ YAYIN
 * AKIŞI"); this turns an all-caps label into "Menü yayın akışı" with Turkish
 * casing, keeping acronyms ("PULSE AI ÇIKARIMI" → "Pulse AI çıkarımı").
 * Mixed-case text is returned unchanged.
 */
const ACRONYMS = new Set([
  'AI', 'API', 'B2B', 'BI', 'CRM', 'CSV', 'EN', 'GBP', 'ID', 'IP', 'KPI', 'KVKK', 'MRR', 'NPS', 'PDF', 'PNG',
  'QR', 'SEO', 'SMS', 'SSS', 'SVG', 'TL', 'TR', 'URL', 'USD', 'UTC', 'İYS', 'NFC', 'OAUTH', 'URL\'Sİ', 'SSL',
]);

/** English loanwords: lower-cased with English rules (I → i, not ı). */
const LOANWORDS = new Set(['SUPERADMIN', 'ADMIN', 'PULSE', 'BUAZE', 'GOOGLE', 'WEBHOOK', 'CHECKLIST', 'DASHBOARD', 'ONLINE', 'EMAIL', 'LINK', 'INSIGHT', 'WIDGET', 'PIXEL']);

export function toSentenceCase(text: string, locale: 'tr' | 'en' = 'tr'): string {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2 || letters !== letters.toLocaleUpperCase(locale)) return text;
  const lang = locale === 'tr' ? 'tr-TR' : 'en-US';
  let first = true;
  return text.replace(/[\p{L}\d'’]+/gu, (word) => {
    const upper = word.toLocaleUpperCase(lang);
    if (ACRONYMS.has(upper) || /\d/.test(word)) {
      first = false;
      return word;
    }
    const lower = word.toLocaleLowerCase(LOANWORDS.has(upper) ? 'en-US' : lang);
    if (first) {
      first = false;
      return lower.charAt(0).toLocaleUpperCase(lang) + lower.slice(1);
    }
    return lower;
  });
}
