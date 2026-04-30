import type { Locale } from '@/lib/translations';

/**
 * Aynı blog yazısının TR ↔ EN slug eşleşmeleri.
 *
 * Locale switcher veya yanlış locale + slug kombinasyonu (örn. `/tr/blog/<en-slug>`)
 * durumunda kullanıcıyı yazının doğru dilindeki slug'ına yönlendirmek için
 * kullanılır. Aynı slug'ı paylaşan yazılar (örn `how-to-increase-restaurant-reviews`
 * hem TR hem EN'de) için pair'a girmek gereksiz — kör pathname.replace(/tr/, /en/)
 * zaten çalışır.
 *
 * Yeni eski yazı için pair eklerken sadece bir entry yaz (TR + EN slug çifti).
 * resolveBlogPair her iki yöne de bakar.
 */
export const BLOG_TRANSLATION_PAIRS: ReadonlyArray<{ tr: string; en: string }> = [
  {
    tr: 'digital-reputation-strategies',
    en: 'professional-digital-reputation-strategies',
  },
  {
    tr: 'yerel-isletmeler-icin-google-yorumlari-neden-onemli',
    en: 'why-google-reviews-matter-for-local-businesses',
  },
];

/**
 * Verilen slug + kaynak locale → karşı locale slug'ı.
 * Eşleşme bulunamazsa null döner. Aynı slug iki locale'de paylaşılıyorsa
 * (örn `how-to-increase-restaurant-reviews`) pair listede olmaz; caller
 * o durumda fallback olarak aynı slug'ı kullanmalı.
 */
export function resolveBlogPair(
  slug: string,
  fromLocale: Locale,
  toLocale: Locale,
): string | null {
  if (fromLocale === toLocale) return slug;
  const pair = BLOG_TRANSLATION_PAIRS.find((p) => p[fromLocale] === slug);
  return pair ? pair[toLocale] : null;
}
