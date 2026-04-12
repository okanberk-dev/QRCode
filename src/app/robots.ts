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
        ],
      },
      // Allow AI bots to read the marketing pages for search generative experiences
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'Anthropic-ai', 'PerplexityBot'],
        allow: ['/', '/tr/', '/en/'],
        disallow: ['/admin/', '/api/', '/tr/auth/', '/en/auth/'],
      }
    ],
    sitemap: 'https://buaze.com/sitemap.xml',
    host: 'https://buaze.com',
  };
}
