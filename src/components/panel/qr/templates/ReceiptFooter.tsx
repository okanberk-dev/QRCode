'use client';

/**
 * ReceiptFooter — thermal-printer mock with QR at the bottom (POS / café).
 * Source: qaxx §03. Mock numbers stay generic — owners can swap in print.
 */

import type { ReactNode } from 'react';
import { BuazeQR } from '../BuazeQR';
import { PoweredBy } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

interface RowProps {
  a: ReactNode;
  b: ReactNode;
}

const Row = ({ a, b }: RowProps) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#0A0A0A' }}>
    <span>{a}</span>
    <span>{b}</span>
  </div>
);

export function ReceiptFooter({ qrPayload, business }: TemplateProps) {
  const { name, tableNumber } = business;
  const headline = name.toLocaleUpperCase('tr-TR');

  return (
    <div
      style={{
        width: 480,
        height: 720,
        background: '#E8E5DE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      }}
    >
      <div
        style={{
          width: 280,
          background: '#FAFAFA',
          padding: '24px 22px 8px',
          boxShadow: '0 30px 50px -20px rgba(10,10,10,0.35)',
          position: 'relative',
        }}
      >
        {/* Torn top edge */}
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: 0,
            right: 0,
            height: 8,
            background:
              'repeating-linear-gradient(135deg, #E8E5DE 0 6px, transparent 6px 12px), repeating-linear-gradient(45deg, #E8E5DE 0 6px, transparent 6px 12px)',
            backgroundColor: '#FAFAFA',
          }}
        />
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#0A0A0A', letterSpacing: 1 }}>
          {headline}
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#525252', marginTop: 4 }}>
          Adres bilgisi yazıcı şablonundan gelir
        </div>
        <div style={{ borderTop: '1px dashed #0A0A0A', margin: '12px 0' }} />
        <div style={{ display: 'grid', gap: 4 }}>
          <Row a="Ürün 1" b="₺ 0,00" />
          <Row a="Ürün 2" b="₺ 0,00" />
          <Row a="Servis" b="₺ 0,00" />
        </div>
        <div style={{ borderTop: '1px dashed #0A0A0A', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
          <span>TOPLAM</span>
          <span>₺ 0,00</span>
        </div>
        <div style={{ borderTop: '2px solid #0A0A0A', margin: '16px 0 14px' }} />

        {/* Buaze CTA block */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              background: '#C6F24E',
              padding: '4px 12px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: '#0A0A0A',
            }}
          >
            BİR İSTEĞİMİZ VAR
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '10px 0 4px', letterSpacing: 0.3 }}>
            Yemek nasıldı?
          </div>
          <div style={{ fontSize: 10, color: '#525252', lineHeight: 1.5, marginBottom: 14 }}>
            QR&apos;ı taratın, deneyiminizi paylaşın.
            <br />
            30 saniyenizi rica ederiz.
          </div>
          <div style={{ display: 'inline-block', padding: 8, border: '2px solid #0A0A0A', borderRadius: 6 }}>
            <BuazeQR
              value={qrPayload}
              size={160}
              moduleShape="square"
              finderShape="square"
              fg="#0A0A0A"
              bg="#FAFAFA"
              margin={1}
            />
          </div>
          {tableNumber && (
            <div style={{ marginTop: 10, fontSize: 9, color: '#737373', letterSpacing: 1 }}>MASA {tableNumber}</div>
          )}
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <PoweredBy color="#737373" size={7} />
          </div>
        </div>

        {/* Torn bottom edge */}
        <div
          style={{
            height: 14,
            marginTop: 16,
            marginLeft: -22,
            marginRight: -22,
            marginBottom: -8,
            background: 'repeating-linear-gradient(135deg, transparent 0 8px, #E8E5DE 8px 16px)',
          }}
        />
      </div>
    </div>
  );
}

export const receiptFooterMeta: TemplateMeta = {
  id: 'receipt_footer',
  name: 'Adisyon Footer',
  tag: 'Termal · Mono',
  category: 'print',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'square', finder: 'square', surface: '#E8E5DE' },
  print: { widthMm: 80, heightMm: 200, bleedMm: 0 },
  canvas: { width: 480, height: 720 },
  descriptionTr: 'Termal yazıcı adisyon altlığı — POS entegrasyonu için.',
  descriptionEn: 'Thermal receipt footer — for POS integrations.',
};

export const receiptFooterEntry: TemplateEntry = { meta: receiptFooterMeta, Component: ReceiptFooter };
export default ReceiptFooter;
