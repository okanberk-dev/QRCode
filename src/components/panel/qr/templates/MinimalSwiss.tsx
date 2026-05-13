'use client';

/**
 * MinimalSwiss — tight grid, Helvetica-heavy, asymmetric typography.
 * Source: qaxx §10.
 */

import { BuazeQR } from '../BuazeQR';
import { BizMark, PoweredBy } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function MinimalSwiss({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;
  return (
    <div
      style={{
        width: 520,
        height: 720,
        background: '#FAFAFA',
        padding: 40,
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        color: '#0A0A0A',
        position: 'relative',
      }}
    >
      {/* 12-col grid hint */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          right: 40,
          bottom: 40,
          pointerEvents: 'none',
          borderTop: '1px solid #0A0A0A',
        }}
      />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 14 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BizMark style="circle" initials={initials} bg="#0A0A0A" fg="#C6F24E" size={26} hint={false} />
          <div style={{ fontSize: 11, letterSpacing: 1, fontWeight: 800, color: '#0A0A0A' }}>
            {name.toLocaleUpperCase('tr-TR')}
          </div>
        </div>
        <div style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 600 }}>№ 01 / 01</div>
      </div>

      {/* Huge editorial number */}
      <div
        style={{
          marginTop: 36,
          fontSize: 220,
          fontWeight: 900,
          letterSpacing: -14,
          lineHeight: 0.85,
          color: '#0A0A0A',
        }}
      >
        30
        <span
          style={{
            fontSize: 80,
            verticalAlign: 'top',
            lineHeight: 1.4,
            marginLeft: 6,
            letterSpacing: -2,
          }}
        >
          sn
        </span>
      </div>

      {/* QR + meta row */}
      <div
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 24,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ background: '#FAFAFA' }}>
          <BuazeQR
            value={qrPayload}
            size={180}
            moduleShape="square"
            finderShape="square"
            fg="#0A0A0A"
            bg="#FAFAFA"
            margin={0}
          />
        </div>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, lineHeight: 1.0, margin: 0 }}>
            Geri bildirim ricamızdır.
          </h2>
          <div style={{ height: 1, background: '#0A0A0A', margin: '16px 0' }} />
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1,
              fontWeight: 600,
              color: '#525252',
              display: 'grid',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>HEDEF</span>
              <span>YEMEK · SERVİS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SÜRE</span>
              <span>~30 SANİYE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>FORMAT</span>
              <span>ANONİM</span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          right: 40,
          borderTop: '1px solid #0A0A0A',
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          letterSpacing: 1,
          fontWeight: 600,
        }}
      >
        <span style={{ textTransform: 'uppercase' }}>{name}</span>
        <PoweredBy color="#525252" size={8} />
      </div>
    </div>
  );
}

export const minimalSwissMeta: TemplateMeta = {
  id: 'minimal_swiss',
  name: 'Swiss Minimal',
  tag: 'Helvetica · Editorial',
  category: 'editorial',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'square', finder: 'square', surface: '#FAFAFA' },
  print: { widthMm: 100, heightMm: 140, bleedMm: 3 },
  canvas: { width: 520, height: 720 },
  descriptionTr: 'Sıkı grid + büyük tipografi — sade ve teknik.',
  descriptionEn: 'Tight grid + oversized type — clean and technical.',
};

export const minimalSwissEntry: TemplateEntry = { meta: minimalSwissMeta, Component: MinimalSwiss };
export default MinimalSwiss;
