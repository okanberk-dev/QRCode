'use client';

/**
 * DoorHanger / Vitrin Poster — vertical poster with hole on top. Source:
 * qaxx §09. "Yeni açıldık" eyebrow tag stays generic.
 */

import { BuazeQR } from '../BuazeQR';
import { PoweredBy } from '../Brand';
import { Stars } from './_shared';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function DoorHanger({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;
  return (
    <div
      style={{
        width: 420,
        height: 700,
        background: '#FAFAFA',
        border: '1px solid #E5E5E5',
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 30px 60px -22px rgba(10,10,10,0.25)',
      }}
    >
      {/* Hole */}
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#E5E5E5',
          boxShadow: 'inset 0 2px 4px rgba(10,10,10,0.15)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 92,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 80,
          height: 4,
          background: '#E5E5E5',
          borderRadius: 2,
        }}
      />

      <div style={{ padding: '120px 36px 36px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '5px 12px',
            background: '#0A0A0A',
            color: '#C6F24E',
            borderRadius: 999,
            fontSize: 9.5,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          YORUMLARINIZ BİZE YOL GÖSTERİYOR
        </div>
        <h1
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: '#0A0A0A',
            margin: '20px 0 8px',
            letterSpacing: -1.5,
            lineHeight: 0.95,
          }}
        >
          {name}
        </h1>
        <p style={{ fontSize: 12.5, color: '#525252', lineHeight: 1.55, margin: '0 auto', maxWidth: 280 }}>
          Deneyiminizi 30 saniyede paylaşın — bir sonraki ziyaretinizde önerileriniz yansır.
        </p>

        <div style={{ marginTop: 30, position: 'relative', display: 'inline-block' }}>
          {/* Lime backdrop */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: 220,
              height: 220,
              background: '#C6F24E',
              borderRadius: 14,
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 220,
              height: 220,
              background: '#FAFAFA',
              borderRadius: 14,
              padding: 14,
              border: '1px solid #0A0A0A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BuazeQR
              value={qrPayload}
              size={190}
              moduleShape="rounded"
              finderShape="leaf"
              fg="#0A0A0A"
              bg="#FAFAFA"
              logo={
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: 16,
                    letterSpacing: -0.8,
                    color: '#0A0A0A',
                  }}
                >
                  {initials}
                </div>
              }
              logoBg="#C6F24E"
            />
          </div>
        </div>

        <div style={{ marginTop: 26, fontSize: 11, color: '#525252', letterSpacing: 1.5, fontWeight: 600 }}>
          {name.toLocaleUpperCase('tr-TR')}
        </div>
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            alignItems: 'center',
            fontSize: 10,
            color: '#737373',
          }}
        >
          <Stars size={11} color="#0A0A0A" />
          <span>Buaze ile geri bildirim toplanır</span>
        </div>
        <div style={{ marginTop: 18 }}>
          <PoweredBy color="#737373" size={8} />
        </div>
      </div>
    </div>
  );
}

export const doorHangerMeta: TemplateMeta = {
  id: 'door_hanger',
  name: 'Kapı Askısı',
  tag: 'Poster · Vertical',
  category: 'venue',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'rounded', finder: 'leaf', surface: '#C6F24E' },
  print: { widthMm: 100, heightMm: 200, bleedMm: 3 },
  descriptionTr: 'Tepe deliği olan dikey poster — vitrine asılır.',
  descriptionEn: 'Vertical poster with top hole — hangs on door / window.',
};

export const doorHangerEntry: TemplateEntry = { meta: doorHangerMeta, Component: DoorHanger };
export default DoorHanger;
