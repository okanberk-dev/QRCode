import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { getSiteSettings } from '@/lib/site-settings';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const dynamic = 'force-dynamic';
const GA_MEASUREMENT_ID = 'G-Y1H5FLYZ9R';
const YM_ID = 108768887;

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
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
        { url: s.faviconUrl || '/favicon.svg', type: 'image/svg+xml' },
      ],
      shortcut: s.faviconUrl || '/favicon.svg',
      apple: '/apple-touch-icon.svg',
    },
    manifest: '/site.webmanifest',
    openGraph: {
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Buaze - Every review is a pulse' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/opengraph-image'],
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
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className={`${inter.className} antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-screen`}>
        {/* Analytics scripts run on `lazyOnload` to keep them out of the
            critical path. PageSpeed flagged ~410ms (GA) + ~399ms (Yandex)
            of main-thread CPU during page load, all attributable to these
            two libraries. `lazyOnload` runs them after the browser is idle,
            so TBT and LCP recover without losing any tracking data. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {/* Yandex Metrica — webvisor disabled because the recording
            sub-domain (mc.yandex.com/solid.ws) was failing DNS resolution
            in production, surfacing as a console error on every page load,
            and we don't currently consume the session-recording UI. Click
            map + bounce + link tracking still run. */}
        <Script id="yandex-metrica" strategy="lazyOnload">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}','ym');
            ym(${YM_ID},'init',{ssr:true,webvisor:false,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});
          `}
        </Script>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<div><img src="https://mc.yandex.ru/watch/${YM_ID}" style="position:absolute;left:-9999px;" alt="" /></div>`,
          }}
        />
        <QueryProvider>{children}</QueryProvider>
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
