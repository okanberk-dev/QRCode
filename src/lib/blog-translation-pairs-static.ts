// Prisma-free half of blog-translation-pairs — imported by the marketing
// navbar (a client component). Keeping it separate stops `@/lib/prisma` (and
// the @prisma/client browser build) from being pulled into every marketing
// page's JS bundle.
import type { Locale } from '@/lib/translations';

/**
 * Statik (kod-içi) slug eşleşmeleri — eski / seed blog yazıları için.
 *
 * Yeni yazılar için admin paneli BlogPost.translationGroupId alanı kullanır:
 * resolveBlogPairFromDb DB-aware lookup yapar. Statik map seed dosyasındaki
 * yazıların DB'de groupId set edilmediği durumlar için fallback.
 */
export const BLOG_TRANSLATION_PAIRS: ReadonlyArray<{ tr: string; en: string }> = [
  {
    tr: 'dijital-itibar-yonetimi-stratejileri',
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
