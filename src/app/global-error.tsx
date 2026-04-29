'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAFAFA',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 500, color: '#0A0A0A', marginBottom: 12 }}>
              Beklenmeyen bir hata oluştu
            </h1>
            <p style={{ fontSize: 15, color: '#525252', marginBottom: 24, lineHeight: 1.6 }}>
              Sorun ekibimize otomatik iletildi. Sayfayı yenileyebilir veya birkaç dakika içinde tekrar deneyebilirsin.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                borderRadius: 999,
                backgroundColor: '#0A0A0A',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Ana sayfaya dön
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
