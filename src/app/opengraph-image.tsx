import { ImageResponse } from 'next/og';
import { getSiteSettings } from '@/lib/site-settings';

// Revalidate once a minute so a newly uploaded OG image propagates quickly
// without hammering the DB on every crawler hit.
export const revalidate = 60;

// Image metadata
export const alt = 'Buaze - Google İtibar Yönetimi';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

/**
 * If the admin uploaded a custom OG image (stored as a data URL or remote URL
 * in `Settings`), serve that. Otherwise render the branded default. This is
 * the single source of truth — file-convention OG wins over metadata, so the
 * uploaded URL must be served here or it won't reach social crawlers.
 */
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

export default async function Image() {
  const settings = await getSiteSettings().catch(() => null);
  if (settings?.ogImageUrl) {
    const custom = await serveCustomOgImage(settings.ogImageUrl);
    if (custom) return custom;
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1A2332 0%, #111111 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          padding: '80px',
        }}
      >
        {/* Glow Effects */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(244, 180, 0,0.15) 0%, rgba(244, 180, 0,0) 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(244, 180, 0,0.15) 0%, rgba(244, 180, 0,0) 70%)',
            borderRadius: '50%',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Logo / Brand Name */}
          <div
            style={{
              fontSize: '100px',
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-0.04em',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            buaze<span style={{ color: '#F4B400' }}>.</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#6B7280',
              marginTop: '40px',
              textAlign: 'center',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ color: '#F4B400' }}>Google Puanınızı</span>
            <span>Otomatik Olarak Yükseltin</span>
          </div>

          {/* Stars */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '60px',
            }}
          >
            {/* SVG Star icons inline for reliable Vercel OG rendering */}
            {[...Array.from({ length: 5 })].map((_, i) => (
              <svg
                key={i}
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="#F4B400"
                stroke="#F4B400"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: 'drop-shadow(0px 4px 12px rgba(244, 180, 0, 0.4))'
                }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>

          {/* URL Tag */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '24px',
              fontWeight: 600,
              color: '#2A3444',
              letterSpacing: '0.05em',
            }}
          >
            buaze.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
