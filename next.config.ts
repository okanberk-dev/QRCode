import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

// Bundle analyzer — manuel monitoring tool. `ANALYZE=true npm run build`
// `.next/analyze/{client,nodejs,edge}.html` raporları üretir. Default
// `enabled: false` → ANALYZE env yokken no-op (build davranışı değişmez).
// CLAUDE.md §38.99 — yeni dep eklerken public bundle delta kontrolü için.
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const firebaseAuthProxyTarget =
  process.env.FIREBASE_AUTH_PROXY_TARGET ||
  (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
    : '');

// Locale-less public URLs (/pricing, /contact, /iletisim ...) used to 404: they are what
// people type, what other sites link to and what AI assistants guess. Negotiated, so
// temporary (307): Accept-Language starting with "en" -> /en/..., everything else
// (including crawlers without the header) -> /tr/... (TR is the primary locale, x-default).
// Only an explicit allow-list: /api, /admin, /dashboard, /r, /menu, /s, /embed stay untouched.
const LOCALE_LESS_SEGMENTS = [
  'about', 'blog', 'careers', 'compare', 'contact', 'cookie', 'faq', 'features',
  'google-compliance', 'help', 'how-it-works', 'integrations', 'press', 'pricing', 'roi',
  'solutions', 'vs', 'kvkk', 'terms', 'ticari-ileti', 'kullanim-sozlesmesi',
  'mesafeli-hizmet-sozlesmesi', 'iade-iptal-politikasi', 'veri-isleyici-sozlesmesi',
  'veri-ihlali-mudahale', 'icerik-moderasyon', 'kabul-edilebilir-kullanim', 'acik-riza',
];
// Turkish / alternative spellings -> [tr destination, en destination]
const LOCALE_LESS_ALIASES: Record<string, [string, string]> = {
  iletisim: ['contact', 'contact'],
  fiyatlandirma: ['pricing', 'pricing'],
  hakkimizda: ['about', 'about'],
  gizlilik: ['gizlilik', 'privacy'],
  privacy: ['gizlilik', 'privacy'],
};

function localeLessRedirects() {
  const enHeader = [{ type: 'header' as const, key: 'accept-language', value: '^en.*' }];
  const rules: { source: string; destination: string; permanent: false; has?: typeof enHeader }[] = [];
  const add = (seg: string, trDest: string, enDest: string) => {
    rules.push({ source: `/${seg}/:path*`, has: enHeader, destination: `/en/${enDest}/:path*`, permanent: false });
    rules.push({ source: `/${seg}/:path*`, destination: `/tr/${trDest}/:path*`, permanent: false });
  };
  for (const seg of LOCALE_LESS_SEGMENTS) add(seg, seg, seg);
  for (const [seg, [tr, en]] of Object.entries(LOCALE_LESS_ALIASES)) add(seg, tr, en);
  return rules;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // SEO: never stream metadata into <body>. Next 15.2+ "streaming metadata"
  // renders <title>, description, canonical, hreflang and robots at the END
  // of <body> on dynamically rendered pages for every user agent except a
  // short list of "HTML-limited" bots. Googlebot is not on that list (it runs
  // JS), and neither are GPTBot / ClaudeBot / PerplexityBot / OAI-SearchBot,
  // which do not run JS at all. Google only honours rel=canonical and
  // hreflang inside <head>, and Search Console's live test (Google-
  // InspectionTool) gets head metadata while the real crawl did not — a
  // mismatch that is invisible in GSC. /.*/ makes metadata blocking for all
  // requests, so every crawler gets it in <head>. Cost: a dynamic page waits
  // for generateMetadata before flushing <head>; ours are cheap.
  htmlLimitedBots: /.*/,

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Tree-shake hint — lucide-react 1000+ icon export ediyor; default
  // tree-shake bu volume'da fail edebilir. `optimizePackageImports` Next 14+
  // feature: yalnız import edilen icon'lar bundle'a girer. CLAUDE.md §34.13.
  //
  // Stage 83 §38.163 — extended:
  //   - framer-motion (~12 marketing/animation imports) is barrel-exported
  //     and prone to dragging unused motion features into the chunk.
  //   - date-fns is used by blog/case-study date formatting; the package
  //     ships every locale + every fn unless tree-shake is hinted.
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
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
      ...localeLessRedirects(),
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

      // SEO §35 (2026-06-03) — TR blog posts had English slugs, weakening
      // Turkish keyword signal in the URL. Slugs were renamed in the DB to
      // Turkish; these /tr-scoped 301s preserve any indexed equity from the
      // old English URLs. EN posts keep the English slug (unaffected — these
      // sources are /tr/ only).
      {
        source: '/tr/blog/the-power-of-google-reviews-for-hotels',
        destination: '/tr/blog/oteller-icin-google-yorumlarinin-gucu',
        permanent: true,
      },
      {
        source: '/tr/blog/handling-negative-customer-reviews',
        destination: '/tr/blog/olumsuz-musteri-yorumlarini-yonetme',
        permanent: true,
      },
      {
        source: '/tr/blog/how-to-increase-restaurant-reviews',
        destination: '/tr/blog/restoran-yorumlari-nasil-artirilir',
        permanent: true,
      },
      {
        source: '/tr/blog/digital-reputation-strategies',
        destination: '/tr/blog/dijital-itibar-yonetimi-stratejileri',
        permanent: true,
      },

      // SEO (2026-09) — Search Console "Not found (404)" cleanup.
      // `bilgi-guvenligi` was deliberately removed (CLAUDE.md §5.3, Sentry
      // encoding crash); external links and Google's memory still point at
      // it, so 301 to the KVKK page rather than leaving a bare 404.
      {
        source: '/:locale(tr|en)/bilgi-guvenligi',
        destination: '/:locale/kvkk',
        permanent: true,
      },
      // A `/legal/` path prefix never existed on this site (CLAUDE.md
      // §38.131 — public legal routes use short slugs). The cookie banner
      // and the register form shipped `/legal/...` hrefs, so these URLs are
      // in Google's index; 301 them onto the real routes.
      {
        source: '/:locale(tr|en)/legal/cerez-politikasi',
        destination: '/:locale/cookie',
        permanent: true,
      },
      // Customer campaign mail feature removed (CLAUDE.md §38.241) — its
      // marketing page was indexed; send it to the features overview.
      {
        source: '/:locale(tr|en)/features/campaigns',
        destination: '/:locale/features',
        permanent: true,
      },
      {
        source: '/:locale(tr|en)/dashboard/campaigns/:path*',
        destination: '/:locale/dashboard/customers',
        permanent: true,
      },
      {
        source: '/admin/campaign-approvals/:path*',
        destination: '/admin/dashboard',
        permanent: true,
      },
      {
        source: '/admin/customer-campaign-templates/:path*',
        destination: '/admin/dashboard',
        permanent: true,
      },
      // Privacy policy lives at one slug per locale (TR /gizlilik, EN
      // /privacy). Both slugs used to render the same document with their own
      // self-canonical — four duplicate URLs in Google's index.
      {
        source: '/tr/privacy',
        destination: '/tr/gizlilik',
        permanent: true,
      },
      {
        source: '/en/gizlilik',
        destination: '/en/privacy',
        permanent: true,
      },
      // Illustrative case studies / customer stories were removed (not real
      // customers — a trust and E-E-A-T risk). Keep any indexed URL alive.
      {
        source: '/:locale(tr|en)/customer-stories/:path*',
        destination: '/:locale/features',
        permanent: true,
      },
      {
        source: '/:locale(tr|en)/case-study/:path*',
        destination: '/:locale/features',
        permanent: true,
      },
      {
        source: '/:locale(tr|en)/legal/kvkk-aydinlatma',
        destination: '/:locale/kvkk',
        permanent: true,
      },
      {
        source: '/:locale(tr|en)/legal/ticari-ileti',
        destination: '/:locale/ticari-ileti',
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
          // Cross-Origin-Opener-Policy — Firebase Google sign-in popup uses
          // `signInWithPopup` which polls `popup.closed` and calls
          // `popup.close()` after the auth callback completes. Modern Chrome
          // emits "Cross-Origin-Opener-Policy policy would block the
          // window.closed/close call" warnings when COOP is unset, and the
          // strict `same-origin` variant breaks Firebase popup entirely.
          //
          // `same-origin-allow-popups` is the canonical choice:
          //   - opener can still call `popup.closed` / `popup.close()` on
          //     same-origin popups (Firebase auth iframe + Buaze auth windows)
          //   - cross-origin popups remain isolated (Spectre-class protection
          //     preserved at the cross-origin boundary)
          //   - Firebase resmi rehberi tam olarak bu değeri öneriyor
          //     (https://firebase.google.com/docs/auth/web/redirect-best-practices)
          //
          // CLAUDE.md §37.8 B-group — operatör onayı + Firebase popup runtime
          // test sonrası site-wide enforce. Stage closure §38.227.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
      // /__/auth/* + /__/firebase/* — Firebase Auth pages proxied onto our
      // own domain by the rewrites above (Google sign-in popup handler +
      // the hidden auth iframe). These are Firebase's documents, not ours,
      // so the site-wide COOP / CSP must not leak onto them.
      //
      // Why COOP breaks the popup: the popup loads /__/auth/handler with our
      // `same-origin-allow-popups`, then navigates to accounts.google.com
      // (COOP unsafe-none). Mismatched COOP values on a cross-origin
      // navigation force a browsing-context-group switch, which severs
      // `window.opener` for good. The handler can then neither hand the
      // result back to the opener nor `window.close()` itself — the popup
      // stays open on a blank page while the opener waits on Firebase's 8 s
      // "popup closed" timer. With `unsafe-none` here the opener survives
      // the round trip and the handler closes the popup as designed.
      //
      // Later header entries override earlier ones for the same key (the
      // /embed/* entry below relies on the same rule). CSP keeps only the
      // framing/plugin directives; `form-action` is dropped because some
      // Firebase providers finish with a form POST.
      {
        source: '/__/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'" },
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
      // X-Robots-Tag — defense-in-depth on top of robots.ts (CLAUDE.md
      // §34.16). robots.ts disallow is a *suggestion* a bot may ignore;
      // the X-Robots-Tag HTTP header is the *enforced* signal at the
      // response layer. Applied to:
      //   /api/*    — JSON endpoints, never indexable
      //   /admin/*  — internal panel
      //   /r/*      — public review surface (per-restaurant) — SEO-irrelevant,
      //               and indexing them would dilute the marketing site
      //               for thousands of long-tail slugs
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/r/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
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
//
// Wrap order (CLAUDE.md §38.99): `withBundleAnalyzer` Sentry'nin **içine**
// sarılır — Sentry webpack plugin son aşamada çalışmalı (source map upload).
// Analyzer önce nextConfig'i wrap eder; Sentry de output'u sarar.
export default withSentryConfig(withAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Upload source maps for the App Router client bundles too.
  widenClientFileUpload: true,
  // Tunnel SDK traffic through the app origin to dodge ad-blockers.
  // Middleware matcher is `/admin/:path*` so /monitoring is already excluded.
  tunnelRoute: '/monitoring',
  webpack: {
    // Hide Sentry's own logger noise from the production browser console.
    // (Replaces the deprecated top-level `disableLogger: true`.)
    treeshake: { removeDebugLogging: true },
    // `automaticVercelMonitors` was removed: it only wraps Pages Router
    // `pages/api` routes, so it never instrumented our App Router crons.
    // Cron failure handling lives in `withCronGuard` (src/lib/cron-guard.ts).
  },
});
