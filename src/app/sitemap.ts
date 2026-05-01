import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { HELP_CATEGORIES } from '@/lib/help-categories';
import { STATIC_HELP_ARTICLES } from '@/lib/help-articles';
import { CUSTOMER_STORIES } from '@/lib/customer-stories';
import { discoverPublicRoutes } from '@/lib/seo/route-discovery';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const BASE_URL = 'https://buaze.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Auto-discovered marketing routes from src/app/[locale]/. New pages are
  // picked up automatically; redirect aliases + auth/dashboard surfaces are
  // skipped (see route-discovery.ts).
  const routes = discoverPublicRoutes();
  for (const route of routes) {
    const trUrl = `${BASE_URL}/tr${route.path ? `/${route.path}` : ''}`;
    const enUrl = `${BASE_URL}/en${route.path ? `/${route.path}` : ''}`;
    const lastModified = new Date();

    sitemapEntries.push({
      url: trUrl,
      lastModified,
      changeFrequency: route.changefreq,
      priority: route.priority,
      alternates: {
        languages: { tr: trUrl, en: enUrl },
      },
    });

    sitemapEntries.push({
      url: enUrl,
      lastModified,
      changeFrequency: route.changefreq,
      priority: Math.max(0, route.priority - 0.1),
    });
  }

  // Dynamic blog posts — locale-specific rows.
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isActive: true },
      select: { slug: true, locale: true, updatedAt: true },
    });
    posts.forEach((post) => {
      sitemapEntries.push({
        url: `${BASE_URL}/${post.locale}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    });
  } catch (error) {
    console.error('Sitemap blog fetch error:', error);
  }

  // Case studies — single row renders both locales (heroTr/heroEn columns).
  try {
    const studies = await prisma.caseStudy.findMany({
      where: { isPublished: true },
      select: { slug: true, publishedAt: true },
    });
    studies.forEach((study) => {
      const trUrl = `${BASE_URL}/tr/case-study/${study.slug}`;
      const enUrl = `${BASE_URL}/en/case-study/${study.slug}`;
      sitemapEntries.push({
        url: trUrl,
        lastModified: study.publishedAt,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages: { tr: trUrl, en: enUrl } },
      });
      sitemapEntries.push({
        url: enUrl,
        lastModified: study.publishedAt,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    });
  } catch (error) {
    console.error('Sitemap case-study fetch error:', error);
  }

  // Customer stories — static array, both locales rendered from same row.
  CUSTOMER_STORIES.forEach((story) => {
    const trUrl = `${BASE_URL}/tr/customer-stories/${story.slug}`;
    const enUrl = `${BASE_URL}/en/customer-stories/${story.slug}`;
    sitemapEntries.push({
      url: trUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: { languages: { tr: trUrl, en: enUrl } },
    });
    sitemapEntries.push({
      url: enUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  });

  // Published menu pages (public restaurant menus).
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true, menuEnabled: true, menuPublished: true },
      select: { slug: true, menuUpdatedAt: true, updatedAt: true },
    });
    restaurants.forEach((r) => {
      sitemapEntries.push({
        url: `${BASE_URL}/menu/${r.slug}`,
        lastModified: r.menuUpdatedAt ?? r.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error('Sitemap menu fetch error:', error);
  }

  // Help center category URLs (both locales, alternates linked).
  HELP_CATEGORIES.forEach((cat) => {
    const trUrl = `${BASE_URL}/tr/help/category/${cat.slug}`;
    const enUrl = `${BASE_URL}/en/help/category/${cat.slug}`;
    sitemapEntries.push({
      url: trUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: { languages: { tr: trUrl, en: enUrl } },
    });
    sitemapEntries.push({
      url: enUrl,
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
        url: `${BASE_URL}/${a.locale}/help/${a.slug}`,
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
      url: `${BASE_URL}/${a.locale}/help/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly',
      priority: a.locale === 'tr' ? 0.7 : 0.6,
    });
  });

  // De-duplicate by URL — static slug pages (e.g. blog/google-2026,
  // case-study/pizza-locale) are surfaced by both the filesystem walk and
  // the DB query if a matching row exists. Keep the entry from whichever
  // source ran first; later sources are skipped.
  const seenUrls = new Set<string>();
  return sitemapEntries.filter((entry) => {
    if (seenUrls.has(entry.url)) return false;
    seenUrls.add(entry.url);
    return true;
  });
}
