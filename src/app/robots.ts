import { MetadataRoute } from 'next';
import { SITE_URL, SITE_HOST } from '@/lib/site';

const PRIVATE_PATHS = [
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
  // Faceted / search query strings. `?cat=` blog filters already
  // self-canonicalise to /blog, and `?q=` only resolves on the
  // noindex help-search page — neither is worth crawl budget, and
  // Googlebot was fetching the literal `?q={search_term_string}`
  // template off the WebSite SearchAction.
  '/*?q=',
  '/*?cat=',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tr/', '/en/'],
        disallow: PRIVATE_PATHS,
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
        // Same private surface as everyone else — the AI group used to omit
        // /r/, the dashboards and the faceted query strings.
        disallow: PRIVATE_PATHS,
        crawlDelay: 2,
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_HOST,
  };
}
