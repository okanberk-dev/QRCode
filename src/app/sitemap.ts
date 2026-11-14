import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { HELP_CATEGORIES } from '@/lib/help-categories';
import { STATIC_HELP_ARTICLES } from '@/lib/help-articles';
import { discoverPublicRoutes } from '@/lib/seo/route-discovery';
import { SITE_URL } from '@/lib/site';
import { isIndexableMenu } from '@/lib/seo/indexable-menu';

export const revalidate = 3600;

const BASE_URL = SITE_URL;

// Blog URLs that next.config.ts 301-redirects to a newer slug. The old DB rows
// can still be active, and a redirecting URL in the sitemap shows up in Search
// Console as "Page with redirect". Keep in sync with the blog redirects in
// next.config.ts.
const RETIRED_BLOG_PATHS = new Set([
  '/tr/blog/why-google-reviews-matter-for-local-business-growth',
  '/en/blog/why-google-reviews-matter-for-local-business-growth',
  '/tr/blog/the-power-of-google-reviews-for-hotels',
  '/tr/blog/handling-negative-customer-reviews',
  '/tr/blog/how-to-increase-restaurant-reviews',
  '/tr/blog/digital-reputation-strategies',
]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Marketing routes from src/app/[locale]/, listed at build time by
  // scripts/generate-public-routes.mjs (new pages are picked up on the next
  // build; redirect aliases + auth/dashboard surfaces are skipped).
  // lastmod is deliberately omitted for static routes: stamping every row with
  // the regeneration time teaches Google to ignore lastmod entirely. Only rows
  // with a real content date (blog / help / menu from the DB) carry one.
  const routes = discoverPublicRoutes();
  for (const route of routes) {
    const suffix = route.path ? `/${route.path}` : '';
    const trUrl = `${BASE_URL}/tr${suffix}`;
    const enUrl = `${BASE_URL}/en${suffix}`;
    const locales = route.locales ?? ['tr', 'en'];

    if (locales.length === 1) {
      // Locale-only slug (e.g. /tr/gizlilik ↔ /en/privacy): no same-path
      // alternate exists, so emit the single canonical URL without one.
      sitemapEntries.push({
        url: locales[0] === 'tr' ? trUrl : enUrl,
        changeFrequency: route.changefreq,
        priority: route.priority,
      });
      continue;
    }

    // hreflang pairs on both rows (Google wants the annotation on every
    // URL in the cluster), x-default → TR (CLAUDE.md §35.12).
    const alternates = { languages: { tr: trUrl, en: enUrl, 'x-default': trUrl } };
    sitemapEntries.push({
      url: trUrl,
      changeFrequency: route.changefreq,
      priority: route.priority,
      alternates,
    });

    sitemapEntries.push({
      url: enUrl,
      changeFrequency: route.changefreq,
      priority: Math.max(0, Math.round((route.priority - 0.1) * 10) / 10),
      alternates,
    });
  }

  // Dynamic blog posts — locale-specific rows. Translated pairs (same
  // translationGroupId) carry hreflang alternates, matching the <link
  // rel="alternate"> tags the post page itself emits.
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isActive: true },
      select: { slug: true, locale: true, updatedAt: true, translationGroupId: true },
    });
    const live = posts.filter(
      (post) => !RETIRED_BLOG_PATHS.has(`/${post.locale}/blog/${post.slug}`),
    );
    const groups = new Map<string, { tr?: string; en?: string }>();
    for (const post of live) {
      if (!post.translationGroupId) continue;
      const g = groups.get(post.translationGroupId) ?? {};
      if (post.locale === 'tr' || post.locale === 'en') g[post.locale] = post.slug;
      groups.set(post.translationGroupId, g);
    }
    live.forEach((post) => {
      const pair = post.translationGroupId ? groups.get(post.translationGroupId) : undefined;
      const alternates =
        pair?.tr && pair?.en
          ? {
              languages: {
                tr: `${BASE_URL}/tr/blog/${pair.tr}`,
                en: `${BASE_URL}/en/blog/${pair.en}`,
                'x-default': `${BASE_URL}/tr/blog/${pair.tr}`,
              },
            }
          : undefined;
      sitemapEntries.push({
        url: `${BASE_URL}/${post.locale}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
        ...(alternates ? { alternates } : {}),
      });
    });
  } catch (error) {
    console.error('Sitemap blog fetch error:', error);
  }

  // Published menu pages (public restaurant menus).
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true, menuEnabled: true, menuPublished: true },
      select: {
        slug: true,
        name: true,
        menuUpdatedAt: true,
        updatedAt: true,
        _count: { select: { menuItems: { where: { deletedAt: null, isAvailable: true } } } },
      },
    });
    restaurants
      .filter((r) => isIndexableMenu({ slug: r.slug, name: r.name, itemCount: r._count.menuItems }))
      .forEach((r) => {
        sitemapEntries.push({
          url: `${BASE_URL}/menu/${r.slug}`,
          lastModified: r.menuUpdatedAt ?? r.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      });
  } catch (error) {
    console.error('Sitemap menu fetch error:', error);
  }

  // Help center category URLs (both locales, alternates linked).
  HELP_CATEGORIES.forEach((cat) => {
    const trUrl = `${BASE_URL}/tr/help/category/${cat.slug}`;
    const enUrl = `${BASE_URL}/en/help/category/${cat.slug}`;
    const alternates = { languages: { tr: trUrl, en: enUrl, 'x-default': trUrl } };
    sitemapEntries.push({
      url: trUrl,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates,
    });
    sitemapEntries.push({
      url: enUrl,
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates,
    });
  });

  // Help articles — DB takes precedence; static array fills gaps so the
  // sitemap is never empty in preview deploys before schema migration.
  const seenArticleKeys = new Set<string>();
  try {
    const dbArticles = await prisma.helpArticle.findMany({
      // Rows whose category was removed (e.g. api-webhook) return 404 on
      // the help pages, so they must not be listed either.
      where: { isPublished: true, category: { in: HELP_CATEGORIES.map((c) => c.slug) } },
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

  // De-duplicate by URL — static slug pages (e.g. blog/google-2026) are surfaced by both the filesystem walk and
  // the DB query if a matching row exists. Keep the entry from whichever
  // source ran first; later sources are skipped.
  const seenUrls = new Set<string>();
  return sitemapEntries.filter((entry) => {
    if (seenUrls.has(entry.url)) return false;
    seenUrls.add(entry.url);
    return true;
  });
}
