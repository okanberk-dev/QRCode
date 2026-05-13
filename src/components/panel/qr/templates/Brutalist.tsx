'use client';

/**
 * Brutalist — heavy borders, oversized sans, high contrast. Source: qaxx
 * §11. Mock metrics (+128 yorum / 4.7 ortalama) replaced with generic copy
 * — printable artefact carries no fabricated cohort numbers.
 */

import { BuazeQR } from '../BuazeQR';
import { PoweredBy } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function Brutalist({ qrPayload, business }: TemplateProps) {
  const { name, tableNumber } = business;
  const eyebrow = tableNumber
    ? `${name.toLocaleUpperCase('tr-TR')} · MASA ${tableNumber}`
    : name.toLocaleUpperCase('tr-TR');

  return (
    <div
      style={{
        width: 520,
        height: 640,
        background: '#FAFAFA',
        padding: 28,
        fontFamily: "'Inter', sans-serif",
        color: '#0A0A0A',
      }}
    >
      <div style={{ border: '3px solid #0A0A0A', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Top headline bar */}
        <div
          style={{
            borderBottom: '3px solid #0A0A0A',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#C6F24E',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>★ FİKRİN VAR MI? ★</span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>{eyebrow}</span>
        </div>

        {/* Title */}
        <div style={{ padding: '20px 18px 0', borderBottom: '3px solid #0A0A0A' }}>
          <div style={{ fontSize: 84, fontWeight: 900, letterSpacing: -4, lineHeight: 0.85 }}>YORUM</div>
          <div style={{ fontSize: 84, fontWeight: 900, letterSpacing: -4, lineHeight: 0.85, textAlign: 'right' }}>
            YAZ.
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, padding: '14px 0', maxWidth: 360 }}>
            Sevdiysen birkaç cümle, sevmediysen birkaç gerçek. Dürüstçe yaz, dinleyelim.
          </div>
        </div>

        {/* QR + tagline blocks */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: '3px solid #0A0A0A',
          }}
        >
          <div
            style={{
              borderRight: '3px solid #0A0A0A',
              padding: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FAFAFA',
            }}
          >
            <BuazeQR
              value={qrPayload}
              size={170}
              moduleShape="square"
              finderShape="square"
              fg="#0A0A0A"
              bg="#FAFAFA"
              margin={1}
            />
          </div>
          <div
            style={{
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: '#0A0A0A',
              color: '#C6F24E',
            }}
          >
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, fontWeight: 700 }}>NASIL</div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1 }}>OKUT</div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  fontWeight: 600,
                  color: '#A1A1AA',
                  marginTop: 2,
                }}
              >
                · KAMERAYA TUT
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, fontWeight: 700 }}>SÜRE</div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1 }}>30sn</div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  fontWeight: 600,
                  color: '#A1A1AA',
                  marginTop: 2,
                }}
              >
                · YETER
              </div>
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div
          style={{
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          <span style={{ textTransform: 'uppercase' }}>{name}</span>
          <PoweredBy color="#525252" size={8} />
        </div>
      </div>
    </div>
  );
}

export const brutalistMeta: TemplateMeta = {
  id: 'brutalist',
  name: 'Brutalist',
  tag: 'Heavy border · Mono',
  category: 'editorial',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'square', finder: 'square', surface: '#C6F24E' },
  print: { widthMm: 100, heightMm: 130, bleedMm: 3 },
  descriptionTr: 'Kalın çerçeveler + büyük sans — yüksek kontrast.',
  descriptionEn: 'Heavy borders + oversize sans — high contrast.',
};

export const brutalistEntry: TemplateEntry = { meta: brutalistMeta, Component: Brutalist };
export default Brutalist;
