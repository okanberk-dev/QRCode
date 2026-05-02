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
      // Allow AI bots to read marketing pages for search generative experiences
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
      }
    ],
    sitemap: 'https://buaze.com/sitemap.xml',
    host: 'buaze.com',
  };
}
