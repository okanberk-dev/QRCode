import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { getSiteSettings } from '@/lib/site-settings';
import { QueryProvider } from '@/components/providers/QueryProvider';

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
      <body className={`${inter.className} antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-screen`}>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {/* Yandex Metrica */}
        <Script id="yandex-metrica" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}','ym');
            ym(${YM_ID},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
          `}
        </Script>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<div><img src="https://mc.yandex.ru/watch/${YM_ID}" style="position:absolute;left:-9999px;" alt="" /></div>`,
          }}
        />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
