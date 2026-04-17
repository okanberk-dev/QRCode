import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://buaze.com';

  const staticPages = [
    { path: '', priority: 1.0, changefreq: 'weekly' as const },
    { path: '/blog', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/solutions/restaurants', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/hotels', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/solutions/healthcare', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/pricing', priority: 0.9, changefreq: 'monthly' as const },
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
