import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Değerlendirme Platformu',
  description: 'Restoran değerlendirme ve geri bildirim yönetim platformu',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
