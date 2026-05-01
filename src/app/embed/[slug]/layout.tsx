import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Embed widget layout — minimal, parent iframe içinde gömülü olarak
 * çalışır. Root layout font/css yüklenir ama outer chrome (nav, footer)
 * yok. Background transparent → parent site rengiyle uyum sağlar.
 */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'transparent',
        minHeight: '0',
        padding: 0,
        margin: 0,
      }}
    >
      {children}
    </div>
  );
}
