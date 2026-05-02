import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const firebaseAuthProxyTarget =
  process.env.FIREBASE_AUTH_PROXY_TARGET ||
  (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
    : '');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Tree-shake hint — lucide-react 1000+ icon export ediyor; default
  // tree-shake bu volume'da fail edebilir. `optimizePackageImports` Next 14+
  // feature: yalnız import edilen icon'lar bundle'a girer. CLAUDE.md §34.13.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  async rewrites() {
    if (!firebaseAuthProxyTarget) return [];

    return [
      {
        source: '/__/auth/:path*',
        destination: `https://${firebaseAuthProxyTarget}/__/auth/:path*`,
      },
      {
        source: '/__/firebase/init.json',
        destination: `https://${firebaseAuthProxyTarget}/__/firebase/init.json`,
      },
    ];
  },

  // 301 redirects to preserve link equity when public-facing slugs are renamed.
  // Add new entries here whenever a marketing route changes path.
  async redirects() {
    return [
      // Marketing slug rename: /features/ai-copilot → /features/pulse-ai
      // Audit Section 5: URL slug must match the canonical product name.
      {
        source: '/:locale(tr|en)/features/ai-copilot',
        destination: '/:locale/features/pulse-ai',
        permanent: true,
      },

      // Blog slug aliases — preserve old URLs (Google index, social shares)
      // when content was renamed. Per-locale because TR and EN slugs differ.
      // To add a new alias, append two entries (one per locale) and redeploy.
      {
        source: '/tr/blog/why-google-reviews-matter-for-local-business-growth',
        destination: '/tr/blog/yerel-isletmeler-icin-google-yorumlari-neden-onemli',
        permanent: true,
      },
      {
        source: '/en/blog/why-google-reviews-matter-for-local-business-growth',
        destination: '/en/blog/why-google-reviews-matter-for-local-businesses',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // unload=* allows browser extensions (Grammarly, password managers)
          // to attach unload listeners — they emit a Permissions-Policy
          // violation otherwise. Doesn't enable any first-party tracking.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), unload=*' },
        ],
      },
      // /embed/* — public iframe widget. Sadece bu path için frame
      // restrictions gevşetilir (CLAUDE.md §34.10). Site geneli korumalı
      // (SAMEORIGIN) kalır. ALLOWALL eski browser'lar için placeholder;
      // modern browser'lar `frame-ancestors *` CSP'sini takip eder.
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *;" },
        ],
      },
    ];
  },
};

// Always wrap with Sentry per the canonical SDK skill — when SENTRY_AUTH_TOKEN
// is missing the plugin skips source-map upload silently; runtime SDK init is
// gated separately on SENTRY_DSN inside instrumentation.ts / *.config.ts.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Upload source maps for the App Router client bundles too.
  widenClientFileUpload: true,
  // Tunnel SDK traffic through the app origin to dodge ad-blockers.
  // Middleware matcher is `/admin/:path*` so /monitoring is already excluded.
  tunnelRoute: '/monitoring',
  // Hide Sentry's own logger noise from the production browser console.
  disableLogger: true,
  automaticVercelMonitors: true,
});
