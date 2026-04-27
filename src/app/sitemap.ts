import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { HELP_CATEGORIES } from '@/lib/help-categories';
import { STATIC_HELP_ARTICLES } from '@/lib/help-articles';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://buaze.com';

  const staticPages = [
    { path: '', priority: 1.0, changefreq: 'weekly' as const },
    { path: '/blog', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/help', priority: 0.85, changefreq: 'weekly' as const },
    { path: '/solutions/restaurants', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/hotels', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/healthcare', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/dentists', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/beauty-salon', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/gym', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/veterinary', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/law-firms', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/real-estate', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/auto-service', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/aesthetic', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/schools', priority: 0.8, changefreq: 'monthly' as const },
    { path: '/solutions/boutique-hotels', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/pricing', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/compare', priority: 0.8, changefreq: 'monthly' as const },
    { path: '/about', priority: 0.8, changefreq: 'monthly' as const },
    { path: '/contact', priority: 0.8, changefreq: 'monthly' as const },
    { path: '/privacy', priority: 0.5, changefreq: 'yearly' as const },
    { path: '/terms', priority: 0.5, changefreq: 'yearly' as const },
    { path: '/cookie', priority: 0.5, changefreq: 'yearly' as const }
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Static URLs
  staticPages.forEach(({ path, priority, changefreq }) => {
    sitemapEntries.push({
      url: `${baseUrl}/tr${path}`,
      lastModified: new Date(),
      changeFrequency: changefreq,
      priority,
      alternates: {
        languages: {
          tr: `${baseUrl}/tr${path}`,
          en: `${baseUrl}/en${path}`
        }
      }
    });

    sitemapEntries.push({
      url: `${baseUrl}/en${path}`,
      lastModified: new Date(),
      changeFrequency: changefreq,
      priority: priority - 0.1, // English slightly lower priority by default
    });
  });

  // Dynamic Blog URLs
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isActive: true },
      select: { slug: true, locale: true, updatedAt: true }
    });

    posts.forEach((post) => {
      sitemapEntries.push({
        url: `${baseUrl}/${post.locale}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    });
  } catch (error) {
    console.error('Sitemap blog fetch error:', error);
  }

  // Published menu pages
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true, menuEnabled: true, menuPublished: true },
      select: { slug: true, menuUpdatedAt: true, updatedAt: true },
    });
    restaurants.forEach((r) => {
      sitemapEntries.push({
        url: `${baseUrl}/menu/${r.slug}`,
        lastModified: r.menuUpdatedAt ?? r.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error('Sitemap menu fetch error:', error);
  }

  // Help center category URLs (both locales, alternates linked)
  HELP_CATEGORIES.forEach((cat) => {
    sitemapEntries.push({
      url: `${baseUrl}/tr/help/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          tr: `${baseUrl}/tr/help/category/${cat.slug}`,
          en: `${baseUrl}/en/help/category/${cat.slug}`,
        },
      },
    });
    sitemapEntries.push({
      url: `${baseUrl}/en/help/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  });

  // Help articles — DB takes precedence; static array fills gaps so the
  // sitemap is never empty in preview deploys without prisma db push.
  const seenArticleKeys = new Set<string>();
  try {
    const dbArticles = await prisma.helpArticle.findMany({
      where: { isPublished: true },
      select: { slug: true, locale: true, updatedAt: true },
    });
    dbArticles.forEach((a) => {
      seenArticleKeys.add(`${a.locale}:${a.slug}`);
      sitemapEntries.push({
        url: `${baseUrl}/${a.locale}/help/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: 'monthly',
        priority: a.locale === 'tr' ? 0.7 : 0.6,
      });
    });
  } catch (error) {
    console.error('Sitemap help articles fetch error:', error);
  }
  STATIC_HELP_ARTICLES.forEach((a) => {
    const key = `${a.locale}:${a.slug}`;
    if (seenArticleKeys.has(key)) return;
    sitemapEntries.push({
      url: `${baseUrl}/${a.locale}/help/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly',
      priority: a.locale === 'tr' ? 0.7 : 0.6,
    });
  });

  // TR-only legal pages
  const trOnlyPages = ['/kvkk', '/gizlilik', '/acik-riza', '/ticari-ileti'];
  for (const page of trOnlyPages) {
    sitemapEntries.push({
      url: `${baseUrl}/tr${page}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    });
  }

  return sitemapEntries;
}
