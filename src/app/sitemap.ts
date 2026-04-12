import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://buaze.com';
  const locales = ['tr', 'en'];

  const staticPages = ['', '/about', '/pricing', '/contact', '/privacy', '/terms', '/cookie'];
  const trOnlyPages = ['/kvkk', '/gizlilik', '/acik-riza', '/ticari-ileti'];

  const entries: MetadataRoute.Sitemap = [];

  // Bilingual pages
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'weekly' : 'monthly',
        priority: page === '' ? 1.0 : 0.8,
        alternates: {
          languages: {
            tr: `${baseUrl}/tr${page}`,
            en: `${baseUrl}/en${page}`,
          },
        },
      });
    }
  }

  // TR-only legal pages
  for (const page of trOnlyPages) {
    entries.push({
      url: `${baseUrl}/tr${page}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    });
  }

  return entries;
}
