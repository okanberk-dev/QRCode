/**
 * Owner-facing link-check messages (TR / EN).
 *
 * The test endpoint stores the message in the language of whoever ran the
 * check (the cron runs in Turkish). `localizeCheckError` maps a stored
 * message back to the viewer's language so an English page never shows
 * "Erişilemedi." Pure module — safe to import from client components.
 */
export const PLATFORM_LINK_MESSAGES = {
  emptyUrl: {
    tr: 'URL boş — önce kaydet, sonra test et.',
    en: 'URL is empty — save it first, then test.',
  },
  invalidUrl: { tr: 'Geçersiz URL formatı.', en: 'Invalid URL format.' },
  notFound: {
    tr: 'Sayfa bulunamadı (404). Bağlantı kaldırılmış ya da yanlış olabilir.',
    en: 'Page not found (404). The link may have been removed or is incorrect.',
  },
  gone: {
    tr: 'Sayfa kalıcı olarak kaldırılmış (410).',
    en: 'Page permanently removed (410).',
  },
  blocked: {
    tr: 'Bağlantı sunucu tarafından reddedildi.',
    en: 'The server refused the request.',
  },
  serverError: {
    tr: 'Platform sunucusu hata döndürdü. Birazdan tekrar deneyin.',
    en: 'The platform server returned an error. Try again shortly.',
  },
  unverified: { tr: 'Bağlantı doğrulanamadı.', en: 'The link could not be verified.' },
  timeout: (seconds: number) => ({
    tr: `${seconds} saniyede yanıt alınamadı.`,
    en: `No response within ${seconds} seconds.`,
  }),
  unreachable: { tr: 'Erişilemedi.', en: 'Unreachable.' },
  // SSRF guard (src/lib/ssrf-guard.ts) — özel / iç ağ adresleri test edilmez.
  privateAddress: {
    tr: 'Bu adres herkese açık bir web adresi değil (yerel / iç ağ adresleri test edilemez).',
    en: 'This is not a public web address (local / internal network addresses cannot be tested).',
  },
} as const;

type LocalizedPair = { tr: string; en: string };

const FIXED_PAIRS: LocalizedPair[] = Object.values(PLATFORM_LINK_MESSAGES).flatMap((entry) =>
  typeof entry === 'function' ? [] : [entry as LocalizedPair],
);

const TIMEOUT_TR = /^(\d+(?:[.,]\d+)?) saniyede yanıt alınamadı\.$/;
const TIMEOUT_EN = /^No response within (\d+(?:[.,]\d+)?) seconds\.$/;

/** Return a stored check message in `locale`; unknown text passes through. */
export function localizeCheckError(error: string, locale: 'tr' | 'en'): string {
  const text = error.trim();
  for (const pair of FIXED_PAIRS) {
    if (pair.tr === text || pair.en === text) return pair[locale];
  }
  const timeout = TIMEOUT_TR.exec(text) ?? TIMEOUT_EN.exec(text);
  if (timeout) return PLATFORM_LINK_MESSAGES.timeout(Number(timeout[1].replace(',', '.')))[locale];
  return error;
}
