'use client';

/**
 * Coaster — round drink coaster (sits under coffee / cocktail). Wood-grain
 * tabletop backdrop + lime disc. Source: qaxx §12.
 */

import { BuazeQR } from '../BuazeQR';
import { BizMark, PoweredBy } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function Coaster({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;
  return (
    <div
      style={{
        width: 520,
        height: 520,
        background: 'linear-gradient(135deg, #d9c8a8 0%, #ad9c7a 100%)',
        padding: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {/* Wood grain hint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(95deg, rgba(0,0,0,0.04) 0 2px, transparent 2px 14px)',
          pointerEvents: 'none',
        }}
      />
      {/* Glass ring shadow */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          right: 60,
          width: 70,
          height: 70,
          borderRadius: '50%',
          border: '5px solid rgba(0,0,0,0.04)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.04)',
        }}
      />

      {/* Coaster */}
      <div
        style={{
          position: 'relative',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: '#EAF9B8',
          boxShadow:
            '0 18px 30px -10px rgba(10,10,10,0.4), inset 0 0 0 14px #FAFAFA, inset 0 0 0 16px rgba(10,10,10,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 40,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BizMark style="circle" initials={initials} bg="#0A0A0A" fg="#C6F24E" size={22} hint={false} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: -0.2 }}>
            {name}
          </span>
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#0A0A0A',
            margin: '14px 0 4px',
            letterSpacing: -0.5,
            lineHeight: 1.05,
          }}
        >
          Bir kahve daha?
          <br />
          Önce bizi anlat.
        </h2>
        <div style={{ width: 22, height: 1, background: '#0A0A0A', margin: '10px 0 12px' }} />
        <div
          style={{
            background: '#FAFAFA',
            padding: 10,
            borderRadius: 12,
            boxShadow: '0 6px 16px -6px rgba(10,10,10,0.2)',
          }}
        >
          <BuazeQR
            value={qrPayload}
            size={130}
            moduleShape="dot"
            finderShape="rounded"
            fg="#0A0A0A"
            bg="#FAFAFA"
            margin={1}
          />
        </div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2.5,
            fontWeight: 700,
            color: '#525252',
            marginTop: 12,
          }}
        >
          OKUT · TAT · YORUMLA
        </div>
        <div style={{ marginTop: 10 }}>
          <PoweredBy color="#737373" size={7} />
        </div>
      </div>
    </div>
  );
}

export const coasterMeta: TemplateMeta = {
  id: 'coaster',
  name: 'Coaster',
  tag: 'Yuvarlak · Lime',
  category: 'venue',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'dot', finder: 'rounded', surface: '#EAF9B8' },
  print: { widthMm: 95, heightMm: 95, bleedMm: 3 },
  canvas: { width: 520, height: 520 },
  descriptionTr: 'Yuvarlak içecek altlığı — kafe / bar için.',
  descriptionEn: 'Round drink coaster — café / bar use.',
};

export const coasterEntry: TemplateEntry = { meta: coasterMeta, Component: Coaster };
export default Coaster;
