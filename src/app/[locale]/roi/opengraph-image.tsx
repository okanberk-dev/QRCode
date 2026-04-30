// Static OpenGraph image for /[locale]/roi.
// Twitter / LinkedIn / WhatsApp / Slack social previews use this rather
// than a generic favicon. Pulse design (CLAUDE.md §11) — graphite +
// lime + Space Grotesk-equivalent system font.
//
// Edge runtime: Next.js automatically wires the file-convention; no
// extra route registration. 1200×630 standard OG dimensions.
//
// Personalized variant (restaurant name + projection) lives at
// /api/og/roi (querystring-driven) — used by PDF / mail share links.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Buaze ROI Hesaplayıcı';

interface Params {
  params: Promise<{ locale: string }>;
}

export default async function OgImage({ params }: Params) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const eyebrow = isTr ? 'BUAZE ROI HESAPLAYICI · 12 AY' : 'BUAZE ROI CALCULATOR · 12 MO';
  const title = isTr ? 'Her ₺1, 12 ay sonra ne kadar?' : 'Every $1, where is it in 12 months?';
  const subtitle = isTr
    ? 'Düşük yorum filtreleme · Çoklu platform yönlendirme · AI Co-Pilot zaman tasarrufu'
    : 'Low-rating filter · Multi-platform routing · AI Co-Pilot time savings';
  const cta = isTr ? 'buaze.com/tr/roi' : 'buaze.com/en/roi';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, #0A0A0A 0%, #0A0A0A 60%, #1A1A1A 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        {/* Lime ambient glow — soft Pulse accent */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -180,
            width: 540,
            height: 540,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198,242,78,0.28) 0%, rgba(198,242,78,0) 65%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Top: Buaze wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Asymmetric speech-bubble logo (CLAUDE.md §11) */}
          <svg width="56" height="56" viewBox="0 0 64 64">
            <path
              d="M10 14 C10 11 12 9 15 9 L49 9 C52 9 54 11 54 14 L54 38 C54 41 52 43 49 43 L24 43 L14 53 L16 43 L15 43 C12 43 10 41 10 38 Z"
              fill="#FFFFFF"
            />
            <path
              d="M18 26 L24 26 L27 20 L31 32 L34 24 L37 28 L46 28"
              stroke="#0A0A0A"
              strokeWidth={2.6}
              fill="none"
            />
            <circle cx="51" cy="15" r="5.5" fill="#C6F24E" />
            <circle cx="51" cy="15" r="2.2" fill="#0A0A0A" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: '#FFFFFF',
              }}
            >
              buaze
            </span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: '#C6F24E',
                marginLeft: 1,
              }}
            />
          </div>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            display: 'flex',
            marginTop: 64,
            fontSize: 18,
            letterSpacing: '0.18em',
            color: '#C6F24E',
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </div>

        {/* Title — large, lime accent on currency */}
        <div
          style={{
            display: 'flex',
            marginTop: 18,
            fontSize: 86,
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
            fontWeight: 700,
            color: '#FFFFFF',
            maxWidth: 1080,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 24,
            lineHeight: 1.45,
            color: 'rgba(255,255,255,0.78)',
            maxWidth: 1020,
          }}
        >
          {subtitle}
        </div>

        {/* Bottom row: 3 trust pills + URL */}
        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            {(isTr
              ? ['2.400+ aktif Buaze', 'BrightLocal 2024', '30 gün ücretsiz']
              : ['2,400+ Buaze accounts', 'BrightLocal 2024', '30-day free trial']
            ).map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.86)',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    background: '#A8D62E',
                  }}
                />
                {label}
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
            }}
          >
            {cta}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
