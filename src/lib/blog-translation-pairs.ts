import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';

export { BLOG_TRANSLATION_PAIRS, resolveBlogPair } from '@/lib/blog-translation-pairs-static';
import { resolveBlogPair } from '@/lib/blog-translation-pairs-static';

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
