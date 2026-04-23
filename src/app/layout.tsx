import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

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
      icon: s.faviconUrl || '/favicon.svg',
    },
    openGraph: s.ogImageUrl
      ? { images: [{ url: s.ogImageUrl, width: 1200, height: 630 }] }
      : undefined,
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
        {children}
      </body>
    </html>
  );
}
