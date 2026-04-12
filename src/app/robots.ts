import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tr/', '/en/'],
        disallow: [
          '/admin/',
          '/api/',
          '/tr/auth/',
          '/en/auth/',
          '/tr/dashboard/',
          '/en/dashboard/',
        ],
      },
    ],
    sitemap: 'https://buaze.com/sitemap.xml',
    host: 'https://buaze.com',
  };
}
