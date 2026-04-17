import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://buaze.com';
  const locales = ['tr', 'en'];

  const staticPages = [
    { path: '', priority: 1.0, changefreq: 'weekly' as const },
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
  
  const trOnlyPages = ['/kvkk', '/gizlilik', '/acik-riza', '/ticari-ileti'];

  const entries: MetadataRoute.Sitemap = [];

  // Bilingual pages
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changefreq,
        priority: page.priority,
        alternates: {
          languages: {
            tr: `${baseUrl}/tr${page.path}`,
            en: `${baseUrl}/en${page.path}`,
            'x-default': `${baseUrl}/en${page.path}`,
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
