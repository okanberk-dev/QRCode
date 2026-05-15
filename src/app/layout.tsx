import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { getSiteSettings } from '@/lib/site-settings';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import CookieConsentBanner from '@/components/legal/CookieConsentBanner';
import ConditionalAnalytics from '@/components/legal/ConditionalAnalytics';
import { locales, defaultLocale, type Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';
const YM_ID = 108768887;

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

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL('https://buaze.com'),
    title: {
      default: s.titleDefaultTr,
      template: s.titleTemplate,
    },
    description: s.descriptionTr,
    alternates: {
      canonical: 'https://buaze.com',
    },
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
      url: 'https://buaze.com',
      images: [
        {
          url: s.ogImageUrl || '/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'Buaze - Every review is a pulse',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: s.titleDefaultTr,
      description: s.descriptionTr,
      images: [s.ogImageUrl || '/opengraph-image'],
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stage 31b §38.108 — Cookie consent banner için locale detection.
  // Root layout `[locale]` URL segment'i taşımıyor (marketing + admin +
  // public surface'larda farklı). NEXT_LOCALE cookie'si veya browser
  // accept-language fallback. CookieConsentBanner bilingual; default 'tr'
  // safe.
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const detectedLocale: Locale = locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale;

  return (
    <html lang="tr" className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
        {/* Resource hints — `preconnect` opens the TLS handshake ahead of
            time (DNS + TCP + TLS) and was promoted from the previous
            `dns-prefetch`-only setup after PageSpeed flagged the
            "Network dependency tree" insight (CLAUDE.md §34.14).
            `dns-prefetch` is kept as a fallback for browsers that ignore
            `preconnect` (very old). Fonts use `crossOrigin="anonymous"`
            because the woff2 files are fetched as anonymous CORS — without
            the attribute the browser opens a second connection just to
            satisfy the credentials mode. */}
        <link rel="preconnect" href="https://mc.yandex.ru" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
        {/* Yandex Metrica noscript pixel — analytics consent opt-in
            şartına bağlı; consent verilmediyse pixel yüklenmez. KVKK
            Çerez Kurulu rehberi: opt-in tüm tracker'lar için zorunlu. */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<div><img src="https://mc.yandex.ru/watch/${YM_ID}" style="position:absolute;left:-9999px;" alt="" /></div>`,
          }}
        />
        <QueryProvider>{children}</QueryProvider>
        {/* Cookie consent banner — bottom-sheet, ilk ziyarette görünür,
            iframe (`/embed/*`) context'te otomatik gizli. */}
        <CookieConsentBanner locale={detectedLocale} />
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
