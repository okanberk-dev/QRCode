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
          '/r/',
          '/tr/dashboard/',
          '/en/dashboard/',
          '/tr/auth/',
          '/en/auth/',
          '/tr/onboarding',
          '/en/onboarding',
          '/tr/accept-invite',
          '/en/accept-invite',
          '/*/dashboard/',
          '/*/onboarding',
          '/*/accept-invite',
        ],
      },
      // Allow AI bots to read marketing pages for search generative experiences.
      // `crawlDelay: 2` — polite scraping. Major search engines (Google, Bing)
      // ignore Crawl-delay anyway; this targets the AI / SGE crawlers which
      // tend to hammer pages aggressively when ingesting a new domain.
      // CLAUDE.md §34.15.
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'Anthropic-ai',
          'Claude-Web',
          'PerplexityBot',
          'CCBot',
          'cohere-ai',
          'Applebot-Extended',
          'Meta-ExternalAgent',
          'YouBot',
          'OAI-SearchBot',
        ],
        allow: ['/', '/tr/', '/en/'],
        disallow: [
          '/admin/',
          '/api/',
          '/tr/auth/',
          '/en/auth/',
          '/tr/onboarding',
          '/en/onboarding',
          '/tr/accept-invite',
          '/en/accept-invite',
        ],
        crawlDelay: 2,
      }
    ],
    sitemap: 'https://buaze.com/sitemap.xml',
    host: 'buaze.com',
  };
}
