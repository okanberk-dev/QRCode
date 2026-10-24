import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/site';
import { getSiteSettings } from '@/lib/site-settings';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import CookieConsentBanner from '@/components/legal/LazyCookieConsentBanner';
import ConditionalAnalytics from '@/components/legal/ConditionalAnalytics';

// SEO §35 — root layout no longer forces `dynamic = 'force-dynamic'`.
// The previous force-dynamic + `cookies()` read defeated ISR for the whole
// `[locale]/*` marketing tree (every Googlebot hit re-rendered server-side
// instead of being served fast from the Vercel CDN edge). The `cookies()`
// read only fed the cookie-banner locale, which CookieConsentBanner already
// auto-detects client-side (Stage 31d §38.110), so the read was redundant.
// Dashboard self-declares force-dynamic; admin layout reads cookies() (so it
// stays dynamic automatically); public `/r` + `/menu` are dynamic segments
// rendered on-demand. Marketing pages keep their per-page `revalidate=3600`,
// which now actually takes effect → better crawl budget + Core Web Vitals.

// Stage 27 §38.103 Fix M5 — Space Grotesk weight 600 unused removal.
// Codebase-wide audit: `font-semibold` Space Grotesk üzerinde 0 callsite
// (Inter body font'unda 20+ callsite intact). Tek 600-weight callsite
// `solutions/restaurants/page.tsx:256` SVG illustration metni — Pulse §11
// paterniyle uyumlu olarak weight 500'e çekildi (`bz-h-tight` zaten 500).
// Latin subset 1 weight ≈ ~15 KB woff2 cold load tasarruf.
//
// Stage 32 §38.112 — Premium editorial cookie consent banner hero başlığı
// (`/components/legal/CookieConsentBanner.tsx`) italic Space Grotesk
// kullanır (JSX prototip bottom-right floating card paterni). Google Fonts
// Space Grotesk italic variant'ı yayınlamadığı için (next/font/google
// type'ı `style: 'normal'` only kabul eder) **synthetic italic** kullanılır:
// component'lerde `style={{ fontStyle: 'italic' }}` ile browser otomatik
// oblique transform uygular. 0 KB ek cost, görsel ~%85 gerçek italic
// (Pulse §11 ile uyumlu, KVKK ilk-ziyaret yüzey için yeterli).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

// CSS Performance §38.60 — Inter weight 900 kaldırıldı (0 callsite kaldı,
// `menu/[slug]/not-found` `font-black` → `font-semibold`'e çekildi).
// CLAUDE.md §11 paterni: "Aşırı `font-black` kullanımından kaçının."
// Latin subset 1 weight ≈ ~15-25KB woff2 — repeat-view + cold start tasarrufu.
// Weight 800 korundu: MenuSplash hero (user-facing) + homepage 100px ghost
// number decorative — gözle görülür ağırlık farkı yaratıyor.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

// Mono is only used for small eyebrows / numbers — never the LCP text — so
// it isn't preloaded on every page (it still loads, just not with priority).
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-jetbrains-mono',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: s.titleDefaultTr,
      template: s.titleTemplate,
    },
    description: s.descriptionTr,
    // No canonical here: every route under this layout (public menus, review
    // and survey pages, embeds) would inherit the homepage as its canonical.
    // Each indexable page declares its own.
    icons: {
      icon: [
        // §38.106 — `?v=4` cache bust for circular favicon (Google search
        // results yuvarlak konteyneri tam doldursun); CLAUDE.md §34.14
        // disipline (immutable header + query string version bump).
        { url: s.faviconUrl || '/favicon.svg?v=4', type: 'image/svg+xml' },
      ],
      shortcut: s.faviconUrl || '/favicon.svg?v=4',
      apple: '/apple-touch-icon.svg?v=4',
    },
    manifest: '/site.webmanifest',
    // Open Graph — extended with site_name + locale alternates so Slack /
    // LinkedIn / WhatsApp link unfurls show "Buaze · TR" framing instead
    // of falling back to the raw domain. CLAUDE.md §34.16.
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: 'tr_TR',
      alternateLocale: ['en_US'],
      images: [
        {
          url: '/images/open-graph-en.png',
          width: 1200,
          height: 630,
          alt: 'Buaze - Every review is a pulse',
          type: 'image/png',
        },
      ],
    },
    // Title / description / image are filled per page from its openGraph.
    twitter: {
      card: 'summary_large_image',
    },
    // Apple PWA / iOS metadata — improves the "Add to Home Screen" UX:
    // standalone display, dark status bar on the lime-on-black brand,
    // no auto-linkified phone numbers (Safari otherwise rewrites every
    // numeric string in the page into a `tel:` link, breaking the
    // monospaced stat tiles).
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Buaze',
    },
    formatDetection: {
      telephone: false,
    },
    verification: {
      google: 'FYUcNyiNfUTFfmZBl_Xqb_YCFqBpD-PcpHHiGDz_kZ0',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // Enable safe-area-inset-* env vars on iOS (Stage 99 — public survey
  // /s/[slug] uses them for the sticky footer + thanks coupon padding).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `suppressHydrationWarning`: the inline script below may switch `lang`
    // to "en" before hydration (see DocumentLang); React would otherwise flag
    // the attribute mismatch on <html>.
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        {/* English pages live under /en. The root layout cannot know the
            locale without reading headers() (that would make the ISR
            marketing tree dynamic), so the path decides `lang` here, before
            the first paint. CSS uppercase follows `lang`: under "tr" English
            eyebrows read "BUSİNESS". Client-side locale switches are handled
            by DocumentLang in the [locale] layout. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(/^\\/en(\\/|$)/.test(location.pathname))document.documentElement.lang='en';",
          }}
        />
        {/* Resource hints. Fonts are self-hosted by next/font, so no Google
            Fonts connections are needed. GTM and Yandex load only after
            analytics consent (ConditionalAnalytics, lazyOnload), so a full
            preconnect would usually be wasted — dns-prefetch is enough. */}
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className={`${inter.className} antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-dvh`}>
        {/* Stage 31b §38.108 — KVKK Çerez Kurulu kararı + ePrivacy Direktifi
            uyumlu opt-in çerez consent. GA + Yandex Metrica `Script` tag'leri
            koşulsuz `lazyOnload` mount'tan ConditionalAnalytics component'ine
            taşındı: localStorage `bz_cookie_consent.analytics === true`
            durumunda render. Banner kullanıcı kararıyla dispatch ettiği
            `bz:cookie-consent-changed` event'i ile script'ler reactive
            olarak yüklenir. */}
        <ConditionalAnalytics />
        {children}
        {/* Cookie consent banner — bottom-sheet, ilk ziyarette görünür,
            iframe (`/embed/*`) context'te otomatik gizli. Locale client-side
            auto-detect edilir (Stage 31d §38.110); default 'tr'. */}
        <CookieConsentBanner />
        {/* Vercel telemetry — Speed Insights (Web Vitals: FCP/LCP/CLS/INP)
            ve Analytics (page views) birlikte mount'lı. RES (Real Experience
            Score) hesaplaması her iki sample stream'i de tüketir; tek başına
            Speed Insights ile RES "0" kalabiliyordu (insufficient context).
            CLAUDE.md §30.5 + §31. */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
