'use client';

import { useEffect, useState } from 'react';
import { reportBoundaryError } from '@/lib/error-boundary';

type Locale = 'tr' | 'en';

function resolveContext(): { locale: Locale; homeHref: string } {
  if (typeof window === 'undefined') return { locale: 'tr', homeHref: '/' };

  const path = window.location.pathname;
  if (path.startsWith('/en')) return { locale: 'en', homeHref: '/en' };
  if (path.startsWith('/admin')) return { locale: 'tr', homeHref: '/admin/dashboard' };
  return { locale: 'tr', homeHref: '/tr' };
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [context, setContext] = useState<{ locale: Locale; homeHref: string }>({
    locale: 'tr',
    homeHref: '/',
  });

  useEffect(() => {
    setContext(resolveContext());
    reportBoundaryError('global-error-boundary', error);
  }, [error]);

  const isTr = context.locale === 'tr';

  return (
    <html lang={context.locale}>
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          background: '#FAFAFA',
          color: '#0A0A0A',
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            boxSizing: 'border-box',
          }}
        >
          <section
            role="alert"
            style={{
              width: '100%',
              maxWidth: 460,
              border: '1px solid #EDEDED',
              borderRadius: 24,
              background: '#FFFFFF',
              boxShadow: '0 18px 48px rgba(10, 10, 10, 0.08)',
              padding: '36px 32px',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: '#EFEAFB',
                color: '#5D3EBC',
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              !
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 600,
              }}
            >
              {isTr ? 'Sayfa güvenli moda geçti.' : 'The page entered safe mode.'}
            </h1>
            <p
              style={{
                margin: '14px auto 0',
                maxWidth: 360,
                color: '#737373',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {isTr
                ? 'Beklenmeyen bir hata yakaladık. Bir kez daha deneyebilir veya güvenli başlangıç sayfasına dönebilirsiniz.'
                : 'We caught an unexpected error. You can try once more or return to a safe starting page.'}
            </p>

            {error.digest && (
              <p
                style={{
                  marginTop: 16,
                  color: '#A3A3A3',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                REFERANS · {error.digest}
              </p>
            )}

            <div style={{ display: 'grid', gap: 10, marginTop: 28 }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  minHeight: 48,
                  border: 0,
                  borderRadius: 999,
                  background: '#0A0A0A',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {isTr ? 'Tekrar dene' : 'Try again'}
              </button>
              <a
                href={context.homeHref}
                style={{
                  minHeight: 46,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #E5E5E5',
                  borderRadius: 999,
                  background: '#FFFFFF',
                  color: '#0A0A0A',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {isTr ? 'Güvenli başlangıca dön' : 'Return to a safe start'}
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
