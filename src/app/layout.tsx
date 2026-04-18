import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://buaze.com'),
  title: {
    // Descriptive site-wide default title for pages that don't override it,
    // plus a "%s | Buaze" template so child routes get a clean suffix.
    default: 'Buaze | Dijital İtibar ve Geri Bildirim Yönetimi',
    template: '%s | Buaze',
  },
  description:
    'Buaze, işletmeler için QR kod tabanlı dijital itibar ve müşteri geri bildirim yönetim platformudur. Google yorumlarınızı büyütün, müşteri deneyimini ölçün.',
  alternates: {
    // Site-wide canonical fallback pointing to the preferred locale home.
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
  // Allow users to pinch-zoom — better for accessibility than the previous
  // `maximumScale: 1` lock, which blocks users with low vision from zooming.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FCFBF7' },
    { media: '(prefers-color-scheme: dark)', color: '#1f1e1d' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-screen">
        {children}
      </body>
    </html>
  );
}
