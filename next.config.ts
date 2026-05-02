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
    // Site-wide CSP — "A group" defensive directives only. Each one closes a
    // known XSS / clickjacking vector without restricting any script source
    // we currently load (no `script-src` / `style-src` here — those need the
    // 3rd-party allowlist mapping documented in CLAUDE.md §37.8 before they
    // can be flipped on without breaking GTM, Yandex, Sentry, Firebase auth,
    // reCAPTCHA, Vercel preview comments, etc).
    //
    //   - frame-ancestors 'self'         CSP-equivalent of XFO; modern
    //                                    browsers treat this as the source
    //                                    of truth, XFO is fallback.
    //   - base-uri 'self'                Blocks <base> tag injection — a
    //                                    common DOM-based-XSS pivot.
    //   - form-action 'self'             Forms can only POST to our own
    //                                    origin; every form in the codebase
    //                                    targets /api/* (verified).
    //   - object-src 'none'              No <object>/<embed>/<applet> in
    //                                    the codebase — full deny.
    //   - upgrade-insecure-requests      Belt-and-suspenders on top of the
    //                                    HTTPS-only deploy: any sneaky
    //                                    http:// reference auto-upgrades.
    const SITE_CSP = [
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    // /embed/* keeps `frame-ancestors *` (third-party iframe is the entire
    // point of the widget) but inherits the rest of the A-group directives.
    const EMBED_CSP = [
      'frame-ancestors *',
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

    // Permissions-Policy adds Google FLoC / Topics / payment / sensor opt-out
    // on top of the existing camera/microphone/geolocation/unload set — no
    // first-party feature uses any of these surfaces.
    const PERMISSIONS_POLICY = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'unload=*',
      'interest-cohort=()',
      'browsing-topics=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
      'serial=()',
    ].join(', ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Adobe Flash + Acrobat PDF cross-domain policy lookup engelleme.
          // Buaze hiç Flash/PDF cross-domain content servis etmiyor; bu header
          // legacy istemcilerin `crossdomain.xml` lookup'ı yapmasını ve
          // attacker'ın bunu auto-trust kabul etmesini bloke eder. Modern
          // baseline security header (CLAUDE.md §34.15).
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
          { key: 'Content-Security-Policy', value: SITE_CSP },
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
          { key: 'Content-Security-Policy', value: EMBED_CSP },
        ],
      },
      // Long-lived cache for static assets that are content-hashed at the
      // path level (favicon variants, embed wrapper script, manifest).
      // Vercel CDN already serves Next's `/_next/static/*` with immutable
      // headers, but anything we ship from `public/` falls back to a short
      // default. PageSpeed flagged ~74 KiB of cache savings here — fixing
      // it shaves repeat-view load + helps the "Use efficient cache
      // lifetimes" insight (CLAUDE.md §34.14).
      //
      // We don't add a hash to these paths so we keep them at 1 year +
      // SWR — when the file content changes the operator does a cache
      // bust manually (rename the file or query-string the references,
      // matching the existing `?v=3` discipline in layout.tsx icon meta).
      {
        source: '/buaze-embed.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/apple-touch-icon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/site.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/llms.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
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
