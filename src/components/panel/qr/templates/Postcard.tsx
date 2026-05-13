'use client';

/**
 * Postcard — vintage postcard / direct-mail aesthetic, two-tone print
 * (cream + brick). Source: qaxx §13. Mock no/locale strings made
 * deterministic (no Math.random — re-render stability for previews).
 */

import { BuazeQR } from '../BuazeQR';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function Postcard({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;
  return (
    <div
      style={{
        width: 700,
        height: 460,
        background: '#e9e1d0',
        padding: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: 640,
          height: 400,
          background: '#F6F1E4',
          padding: 26,
          position: 'relative',
          boxShadow: '0 20px 40px -16px rgba(10,10,10,0.3), 0 0 0 1px rgba(10,10,10,0.08)',
        }}
      >
        {/* Two-column postcard layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1px 1fr',
            gap: 20,
            height: '100%',
          }}
        >
          {/* Left — message */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              paddingRight: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 10, letterSpacing: 3, fontWeight: 700, color: '#9d3a1a' }}>
                ★ DEAR GUEST ★
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 42,
                  fontStyle: 'italic',
                  color: '#9d3a1a',
                  margin: '10px 0 6px',
                  letterSpacing: -1,
                  lineHeight: 1.0,
                  fontWeight: 600,
                }}
              >
                greetings
                <br />
                from
                <br />
                our kitchen.
              </h2>
              <p
                style={{
                  fontSize: 11.5,
                  color: '#3E2A14',
                  lineHeight: 1.55,
                  margin: '12px 0 0',
                }}
              >
                Bu küçük kart bir özür değil — bir teşekkür. Bize kısa bir mesaj bırakırsan, bir sonraki ziyaretinde
                kalbinden hediye var.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 4,
                  background: '#9d3a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F6F1E4',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {initials.slice(0, 1)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  color: '#3E2A14',
                }}
              >
                <div style={{ fontWeight: 600 }}>{name}</div>
              </div>
            </div>
          </div>
          {/* Divider */}
          <div style={{ background: '#9d3a1a', opacity: 0.4 }} />
          {/* Right — stamps + QR */}
          <div style={{ position: 'relative', paddingLeft: 8 }}>
            {/* Stamp */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 110,
                height: 130,
                padding: 8,
                background: '#F6F1E4',
                border: '1px dashed #9d3a1a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                clipPath:
                  'polygon(0 5%, 5% 0, 95% 0, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0 95%)',
              }}
            >
              <div style={{ fontSize: 8, letterSpacing: 1.5, fontWeight: 700, color: '#9d3a1a' }}>
                POSTA
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontSize: 26,
                  color: '#9d3a1a',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                30sn
              </div>
              <div style={{ fontSize: 7, letterSpacing: 1.5, color: '#3E2A14', marginTop: 4 }}>TR</div>
            </div>
            {/* Address lines */}
            <div style={{ marginTop: 40, fontSize: 10, color: '#3E2A14', lineHeight: 2 }}>
              <div style={{ borderBottom: '1px solid #9d3a1a', paddingBottom: 2 }}>Sayın Misafir</div>
              <div style={{ borderBottom: '1px solid #9d3a1a', paddingBottom: 2 }}>Yorum sokağı no. 30</div>
              <div style={{ borderBottom: '1px solid #9d3a1a', paddingBottom: 2 }}>{name}</div>
            </div>
            {/* QR bottom right */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#F6F1E4',
                padding: 6,
                border: '1px solid #9d3a1a',
              }}
            >
              <BuazeQR
                value={qrPayload}
                size={100}
                moduleShape="dot"
                finderShape="rounded"
                fg="#9d3a1a"
                bg="#F6F1E4"
                margin={1}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const postcardMeta: TemplateMeta = {
  id: 'postcard',
  name: 'Postcard',
  tag: 'Vintage · İki ton',
  category: 'editorial',
  preview: { fg: '#9d3a1a', bg: '#F6F1E4', module: 'dot', finder: 'rounded', surface: '#e9e1d0' },
  print: { widthMm: 148, heightMm: 105, bleedMm: 3 },
  canvas: { width: 700, height: 460 },
  descriptionTr: 'Vintage postcart — otel / butik / restoran için.',
  descriptionEn: 'Vintage postcard — hotel / boutique / restaurant.',
};

export const postcardEntry: TemplateEntry = { meta: postcardMeta, Component: Postcard };
export default Postcard;
