import { ImageResponse } from 'next/og';

// Route segment config
// export const runtime = 'edge';

// Image metadata
export const alt = 'Buaze - Google İtibar Yönetimi';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
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
