'use client';

/**
 * PremiumBlack — upscale dining room aesthetic; gold-lime strip + italic
 * serif typography + framed QR. Source: qaxx §04.
 */

import { BuazeQR } from '../BuazeQR';
import { BizMark, PoweredBy } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function PremiumBlack({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;

  return (
    <div
      style={{
        width: 560,
        height: 720,
        background: '#0A0A0A',
        padding: 56,
        color: '#FAFAFA',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Lime hair strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background:
            'linear-gradient(90deg, transparent 0%, #C6F24E 20%, #C6F24E 80%, transparent 100%)',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
            fontSize: 14,
            fontStyle: 'italic',
            letterSpacing: 1,
          }}
        >
          Est.
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BizMark style="circle" initials={initials} bg="#C6F24E" fg="#0A0A0A" size={32} hint={false} />
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 16,
              fontStyle: 'italic',
              color: '#FAFAFA',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {name}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 90, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 44,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            fontWeight: 400,
          }}
        >
          Bir akşam
        </div>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 44,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            fontWeight: 400,
            color: '#C6F24E',
          }}
        >
          üzerine sohbet.
        </div>
        <div style={{ width: 40, height: 1, background: '#525252', margin: '24px auto' }} />
        <p style={{ fontSize: 12, color: '#A1A1AA', letterSpacing: 1, textTransform: 'uppercase' }}>
          Deneyiminizi anlatın · 30 sn
        </p>
      </div>

      <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            padding: 18,
            background: '#FAFAFA',
            borderRadius: 4,
            boxShadow: '0 0 0 1px #C6F24E, 0 0 0 5px #0A0A0A, 0 0 0 6px #C6F24E',
          }}
        >
          <BuazeQR
            value={qrPayload}
            size={200}
            moduleShape="square"
            finderShape="square"
            fg="#0A0A0A"
            bg="#FAFAFA"
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 56,
          right: 56,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          color: '#737373',
          letterSpacing: 2,
        }}
      >
        <span style={{ textTransform: 'uppercase' }}>{name}</span>
        <PoweredBy color="#737373" size={7} />
      </div>
    </div>
  );
}

export const premiumBlackMeta: TemplateMeta = {
  id: 'premium_black',
  name: 'Premium Siyah',
  tag: 'Italic serif · Lime strip',
  category: 'editorial',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'square', finder: 'square', surface: '#0A0A0A' },
  print: { widthMm: 105, heightMm: 148, bleedMm: 3 },
  descriptionTr: 'Lüks restoran / fine dining için italik serif tasarım.',
  descriptionEn: 'Italic serif design for fine-dining venues.',
};

export const premiumBlackEntry: TemplateEntry = { meta: premiumBlackMeta, Component: PremiumBlack };
export default PremiumBlack;
