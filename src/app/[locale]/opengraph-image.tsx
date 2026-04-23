import { ImageResponse } from 'next/og';
import type { Locale } from '@/lib/translations';
import { getSiteSettings } from '@/lib/site-settings';

export const revalidate = 60;

export const alt = 'Buaze — Google İtibar Yönetimi';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Serve the admin-uploaded OG image when present; otherwise fall through to
// the locale-aware branded render. Same pattern as the root opengraph-image.
async function serveCustomOgImage(url: string): Promise<Response | null> {
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) return null;
      const [, contentType, base64] = match;
      const buf = Buffer.from(base64, 'base64');
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const settings = await getSiteSettings().catch(() => null);
  if (settings?.ogImageUrl) {
    const custom = await serveCustomOgImage(settings.ogImageUrl);
    if (custom) return custom;
  }

  const headline = isTr ? 'Dijital İtibar' : 'Digital';
  const headline2 = isTr ? 'Operasyon Merkezi' : 'Reputation Hub';
  const sub = isTr
    ? 'Geri bildirim operasyonları ile güven inşa edin'
    : 'Manage feedback operations and build trust';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #0d0c0b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'sans-serif',
          padding: '80px 100px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Orange glow top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            right: '-100px',
            width: '700px',
            height: '700px',
            background:
              'radial-gradient(circle, rgba(198, 242, 78,0.25) 0%, rgba(0,0,0,0) 70%)',
            borderRadius: '50%',
          }}
        />
        {/* Yellow glow bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            left: '-100px',
            width: '600px',
            height: '600px',
            background:
              'radial-gradient(circle, rgba(198, 242, 78,0.15) 0%, rgba(0,0,0,0) 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Left content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 10 }}>
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '36px',
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-0.03em',
            }}
          >
            buaze
            <span style={{ color: '#C6F24E', marginLeft: '2px' }}>.</span>
          </div>

          {/* Headline */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '72px',
                fontWeight: 900,
                color: '#C6F24E',
                letterSpacing: '-0.04em',
                lineHeight: '1',
              }}
            >
              {headline}
            </span>
            <span
              style={{
                fontSize: '72px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.04em',
                lineHeight: '1',
              }}
            >
              {headline2}
            </span>
          </div>

          {/* Sub */}
          <div
            style={{
              fontSize: '28px',
              color: '#6B7280',
              fontWeight: 500,
              marginTop: '8px',
            }}
          >
            {sub}
          </div>

          {/* Stars */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="#C6F24E"
                style={{ filter: 'drop-shadow(0 0 8px rgba(198, 242, 78,0.5))' }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        </div>

        {/* Right: Big rating badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '240px',
            height: '240px',
            background: 'rgba(255,255,255,0.06)',
            border: '2.5px solid rgba(255,255,255,0.15)',
            borderRadius: '32px',
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: '88px',
              fontWeight: 900,
              color: '#C6F24E',
              lineHeight: '1',
              letterSpacing: '-0.05em',
            }}
          >
            4.9
          </span>
          <span style={{ fontSize: '20px', color: '#6B7280', marginTop: '8px', fontWeight: 600 }}>
            Google Stars
          </span>
        </div>

        {/* Bottom label */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '100px',
            fontSize: '22px',
            color: '#1A1A1A',
            fontWeight: 600,
            letterSpacing: '0.05em',
            zIndex: 10,
          }}
        >
          buaze.com
        </div>
      </div>
    ),
    { ...size }
  );
}
