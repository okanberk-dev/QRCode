'use client';

/**
 * SocialPost — Instagram-square frame for stories/posts. Source: qaxx §08.
 * Owners screenshot/export and reshare on social — QR still scannable.
 */

import { BuazeQR } from '../BuazeQR';
import { BizMark } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function SocialPost({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;
  return (
    <div
      style={{
        width: 520,
        height: 520,
        background: '#C6F24E',
        padding: 36,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* big rotated background text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 240,
            fontWeight: 900,
            color: 'rgba(10,10,10,0.07)',
            letterSpacing: -16,
            transform: 'rotate(-12deg)',
            lineHeight: 0.85,
            whiteSpace: 'nowrap',
          }}
        >
          NASIL?
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#0A0A0A',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BizMark style="circle" initials={initials} bg="#0A0A0A" fg="#C6F24E" size={28} hint={false} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.3 }}>{name}</span>
          </div>
          <span style={{ fontSize: 10, letterSpacing: 2, fontWeight: 600 }}>#YEMEKNASILDI</span>
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 2,
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Bizden bir rica.
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 800, letterSpacing: -3, lineHeight: 0.9, margin: 0 }}>
            Bu akşam
            <br />
            nasıldık?
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ maxWidth: 240 }}>
            <p style={{ fontSize: 12, color: '#0A0A0A', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              QR&apos;ı taratıp 30 saniyede deneyimini paylaşan misafirlerimize küçük bir teşekkür ikramımız var.
            </p>
            <div
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#0A0A0A',
                color: '#C6F24E',
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ width: 6, height: 6, background: '#C6F24E', borderRadius: '50%' }} /> Bağlantıyı
              bio&apos;da bul
            </div>
          </div>
          <div style={{ background: '#0A0A0A', borderRadius: 16, padding: 12 }}>
            <BuazeQR
              value={qrPayload}
              size={130}
              moduleShape="dot"
              finderShape="rounded"
              fg="#C6F24E"
              bg="#0A0A0A"
              margin={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const socialPostMeta: TemplateMeta = {
  id: 'social_post',
  name: 'Sosyal Post',
  tag: 'IG Square · Lime',
  category: 'editorial',
  preview: { fg: '#C6F24E', bg: '#0A0A0A', module: 'dot', finder: 'rounded', surface: '#C6F24E' },
  print: { widthMm: 100, heightMm: 100, bleedMm: 0 },
  descriptionTr: '1080×1080 Instagram kare formatı — story/post için.',
  descriptionEn: '1080×1080 Instagram square — feed / story.',
};

export const socialPostEntry: TemplateEntry = { meta: socialPostMeta, Component: SocialPost };
export default SocialPost;
