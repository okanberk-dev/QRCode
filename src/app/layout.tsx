import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mamma\'s Burger Ankara - Değerlendirme',
  description: 'Deneyiminizi bizimle paylaşın',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
