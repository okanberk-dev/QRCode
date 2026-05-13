'use client';

/**
 * CounterPlaque — acrylic block sitting next to the till. Source: qaxx §06.
 * Mock rating (4.8/5) replaced with generic "Bizi puanla" — the printable
 * artefact carries no fabricated numbers (CLAUDE.md §35.8 cohort rule).
 */

import { BuazeQR } from '../BuazeQR';
import { PoweredBy } from '../Brand';
import { Stars } from './_shared';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function CounterPlaque({ qrPayload, business }: TemplateProps) {
  const { name } = business;
  return (
    <div
      style={{
        width: 560,
        height: 480,
        background: 'linear-gradient(180deg, #ECEEE7 0%, #d2d8c8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {/* Acrylic block */}
      <div
        style={{
          width: 380,
          height: 320,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.25) 100%)',
          border: '2px solid rgba(255,255,255,0.7)',
          borderRadius: 10,
          padding: 28,
          display: 'flex',
          gap: 22,
          boxShadow: '0 30px 50px -15px rgba(10,10,10,0.25), inset 0 1px 0 rgba(255,255,255,0.9)',
          // `backdropFilter` removed — html-to-image capture (Wave C
          // client-side download) doesn't reliably reproduce CSS
          // `backdrop-filter` across browsers, and the parent gradient
          // is already smooth so the blur effect is imperceptible.
        }}
      >
        {/* Left text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: '#C6F24E',
                borderRadius: 4,
                fontSize: 9.5,
                letterSpacing: 1.5,
                fontWeight: 700,
                color: '#0A0A0A',
              }}
            >
              BUGÜN NASILDIK?
            </div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#0A0A0A',
                margin: '16px 0 8px',
                letterSpacing: -0.6,
                lineHeight: 1.05,
              }}
            >
              {name}
            </h2>
            <p style={{ fontSize: 11.5, color: '#525252', lineHeight: 1.5, margin: 0 }}>
              30 saniyede bizi puanla. Önerilerin bir sonraki ziyaretine geri döner.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#525252', fontWeight: 500 }}>
            <Stars size={11} color="#0A0A0A" />
          </div>
        </div>

        {/* Right QR */}
        <div
          style={{
            width: 200,
            background: '#FAFAFA',
            borderRadius: 6,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <BuazeQR
            value={qrPayload}
            size={170}
            moduleShape="rounded"
            finderShape="rounded"
            fg="#0A0A0A"
            bg="#FAFAFA"
          />
          <PoweredBy color="#737373" size={8} />
        </div>
      </div>

      {/* Base shadow / mount */}
      <div
        style={{
          position: 'absolute',
          bottom: 70,
          width: 380,
          height: 14,
          background: 'rgba(10,10,10,0.2)',
          filter: 'blur(8px)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

export const counterPlaqueMeta: TemplateMeta = {
  id: 'counter_plaque',
  name: 'Kasa Plakası',
  tag: 'Akrilik · Yatay',
  category: 'venue',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'rounded', finder: 'rounded', surface: '#ECEEE7' },
  print: { widthMm: 150, heightMm: 100, bleedMm: 3 },
  canvas: { width: 560, height: 480 },
  descriptionTr: 'Kasa yanında duran akrilik blok — kafe & take-away için.',
  descriptionEn: 'Acrylic block by the till — café / take-away use.',
};

export const counterPlaqueEntry: TemplateEntry = { meta: counterPlaqueMeta, Component: CounterPlaque };
export default CounterPlaque;
