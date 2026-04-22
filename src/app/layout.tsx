import type { Metadata, Viewport } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://buaze.com'),
  title: {
    default: 'Buaze | Dijital İtibar ve Geri Bildirim Yönetimi',
    template: '%s | Buaze',
  },
  description:
    'Buaze, işletmeler için QR kod tabanlı dijital itibar ve müşteri geri bildirim yönetim platformudur. Google yorumlarınızı büyütün, müşteri deneyimini ölçün.',
  alternates: {
    canonical: 'https://buaze.com',
  },
  icons: {
    icon: '/favicon.svg',
  },
  verification: {
    google: 'FYUcNyiNfUTFfmZBl_Xqb_YCFqBpD-PcpHHiGDz_kZ0',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F6F1' },
    { media: '(prefers-color-scheme: dark)', color: '#1A2332' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${manrope.variable} ${inter.variable}`}>
      <body className={`${inter.className} antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
