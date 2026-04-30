import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';

/**
 * Statik (kod-içi) slug eşleşmeleri — eski / seed blog yazıları için.
 *
 * Yeni yazılar için admin paneli BlogPost.translationGroupId alanı kullanır:
 * resolveBlogPairFromDb DB-aware lookup yapar. Statik map seed dosyasındaki
 * yazıların DB'de groupId set edilmediği durumlar için fallback.
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

/**
 * DB-aware lookup: aynı translationGroupId içindeki karşı locale post'unu bul.
 * BlogPost.translationGroupId admin panelden manuel eşleştirme ile set edilir.
 * Bulunmazsa statik map'e (resolveBlogPair) düşer.
 */
export async function resolveBlogPairFromDb(
  slug: string,
  fromLocale: Locale,
  toLocale: Locale,
): Promise<string | null> {
  if (fromLocale === toLocale) return slug;

  // 1. Source post'u bul, translationGroupId'sine bak
  try {
    const source = await prisma.blogPost.findUnique({
      where: { slug_locale: { slug, locale: fromLocale } },
      select: { translationGroupId: true },
    });
    if (source?.translationGroupId) {
      const counterpart = await prisma.blogPost.findFirst({
        where: {
          translationGroupId: source.translationGroupId,
          locale: toLocale,
          isActive: true,
        },
        select: { slug: true },
      });
      if (counterpart) return counterpart.slug;
    }
  } catch {
    // DB hata — statik fallback'e düş
  }

  // 2. Statik map fallback
  return resolveBlogPair(slug, fromLocale, toLocale);
}
