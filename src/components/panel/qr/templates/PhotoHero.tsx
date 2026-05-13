'use client';

/**
 * PhotoHero — full-bleed image placeholder + QR overlay card. Designed
 * for venues that want a photo backdrop. Source: qaxx §14.
 */

import { BuazeQR } from '../BuazeQR';
import { BizMark } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function PhotoHero({ qrPayload, business }: TemplateProps) {
  const { name, initials, tableNumber } = business;
  return (
    <div
      style={{
        width: 520,
        height: 720,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        borderRadius: 4,
      }}
    >
      {/* Photo placeholder — diagonal striped lime/ink hint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(125deg, #1a1a1a 0 24px, #0A0A0A 24px 48px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 30% 25%, rgba(198,242,78,0.18) 0%, transparent 45%), linear-gradient(180deg, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.85) 75%, #0A0A0A 100%)',
        }}
      />
      {/* Photo crop tag */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: 1,
          padding: '4px 8px',
          border: '1px dashed rgba(255,255,255,0.3)',
        }}
      >
        FOTO PLACEHOLDER · 4:5
      </div>

      <div
        style={{
          position: 'absolute',
          top: 28,
          right: 28,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <BizMark style="circle" initials={initials} bg="#C6F24E" fg="#0A0A0A" size={28} hint={false} />
        <div style={{ fontSize: 14, fontWeight: 800, color: '#FAFAFA', letterSpacing: -0.3 }}>{name}</div>
      </div>

      {/* Bottom content */}
      <div
        style={{
          position: 'absolute',
          left: 28,
          right: 28,
          bottom: 28,
          color: '#FAFAFA',
        }}
      >
        {tableNumber && (
          <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 700, color: '#C6F24E' }}>
            ★ MASA {tableNumber}
          </div>
        )}
        <h2
          style={{
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 0.95,
            margin: tableNumber ? '12px 0' : '0 0 12px',
          }}
        >
          Şefin
          <br />
          özel önerisi
          <br />
          bu akşam.
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 22,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 240,
            }}
          >
            Tabaktan kalkmadan bize 30 saniye ayırır mısın? Mutfakta okuyup gülümseyeceğiz.
          </p>
          <div style={{ background: '#FAFAFA', padding: 10, borderRadius: 14 }}>
            <BuazeQR
              value={qrPayload}
              size={110}
              moduleShape="dot"
              finderShape="rounded"
              fg="#0A0A0A"
              bg="#FAFAFA"
              margin={1}
              logo={
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: 12,
                    color: '#0A0A0A',
                    letterSpacing: -0.5,
                  }}
                >
                  {initials}
                </div>
              }
              logoBg="#C6F24E"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const photoHeroMeta: TemplateMeta = {
  id: 'photo_hero',
  name: 'Foto Hero',
  tag: 'Full-bleed · Karanlık',
  category: 'editorial',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'dot', finder: 'rounded', surface: '#0A0A0A' },
  print: { widthMm: 100, heightMm: 140, bleedMm: 3 },
  canvas: { width: 420, height: 700 },
  descriptionTr: 'Tam taşma fotoğraf + QR overlay — şef önerisi / etkinlik.',
  descriptionEn: 'Full-bleed photo + QR overlay — chef\'s special / event.',
};

export const photoHeroEntry: TemplateEntry = { meta: photoHeroMeta, Component: PhotoHero };
export default PhotoHero;
