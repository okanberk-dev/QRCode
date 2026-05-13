'use client';

/**
 * MenuInsert — cream paper + serif type + small QR. Slips into a menu
 * folder. Source: qaxx §05.
 */

import { BuazeQR } from '../BuazeQR';
import { PoweredBy } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function MenuInsert({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;
  return (
    <div
      style={{
        width: 460,
        height: 640,
        background: '#F6F1E4',
        padding: 44,
        fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
        color: '#3E2A14',
        position: 'relative',
      }}
    >
      {/* Paper grain */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 30%, rgba(62,42,20,0.04) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(62,42,20,0.04) 0%, transparent 40%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          borderTop: '1px solid #3E2A14',
          borderBottom: '1px solid #3E2A14',
          padding: '16px 0',
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: 4,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
        }}
      >
        BİR İKRAM DAHA
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <h2 style={{ fontSize: 38, fontStyle: 'italic', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
          Tarif değil,
          <br />
          hatırayız.
        </h2>
        <div style={{ width: 30, height: 1, background: '#3E2A14', margin: '20px auto' }} />
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11.5,
            lineHeight: 1.6,
            color: '#3E2A14',
            maxWidth: 280,
            margin: '0 auto',
          }}
        >
          Bu akşamı sizden duymak isteriz. Aşağıdaki kodu telefonunuza okutmanız yeterli — 30 saniyenizi rica
          ederiz.
        </p>
      </div>

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: 14, background: '#FAF7EC', border: '1px solid rgba(62,42,20,0.2)' }}>
          <BuazeQR
            value={qrPayload}
            size={170}
            moduleShape="dot"
            finderShape="rounded"
            fg="#3E2A14"
            bg="#FAF7EC"
            logo={
              <div
                style={{
                  fontSize: 16,
                  fontStyle: 'italic',
                  fontFamily: "'Cormorant Garamond', serif",
                  color: '#3E2A14',
                  fontWeight: 600,
                }}
              >
                {initials.slice(0, 1)}
              </div>
            }
            logoBg="#F6F1E4"
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ fontSize: 9, letterSpacing: 2.5, color: '#3E2A14', fontWeight: 600 }}>
          {name.toLocaleUpperCase('tr-TR')}
        </div>
        <PoweredBy color="#7d6b4a" size={7} />
      </div>
    </div>
  );
}

export const menuInsertMeta: TemplateMeta = {
  id: 'menu_insert',
  name: 'Menü Ekartı',
  tag: 'Krem · Serif',
  category: 'editorial',
  preview: { fg: '#3E2A14', bg: '#FAF7EC', module: 'dot', finder: 'rounded', surface: '#F6F1E4' },
  print: { widthMm: 90, heightMm: 130, bleedMm: 3 },
  descriptionTr: 'Menünün arasına sıkıştırılan krem renkli ekart.',
  descriptionEn: 'Cream-paper insert slipped between menu pages.',
};

export const menuInsertEntry: TemplateEntry = { meta: menuInsertMeta, Component: MenuInsert };
export default MenuInsert;
