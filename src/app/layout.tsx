import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Buaze | Dijital İtibar Yönetimi',
  description: 'Restoran değerlendirme ve geri bildirim yönetim platformu',
  verification: {
    google: 'FYUcNyiNfUTFfmZBl_Xqb_YCFqBpD-PcpHHiGDz_kZ0',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') === 'en' ? 'en' : 'tr';

  return (
    <html lang={locale}>
      <body className="antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-screen">
        {children}
      </body>
    </html>
  );
}
