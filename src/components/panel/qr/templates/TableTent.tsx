'use client';

/**
 * TableTent — folded standee mock. Black ink front + lime back; high
 * visibility for restaurant tables. Source: qaxx §01 TableTent.
 */

import type { CSSProperties, ReactNode } from 'react';
import { BuazeQR } from '../BuazeQR';
import { PoweredBy } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

interface PanelProps {
  children: ReactNode;
  style?: CSSProperties;
}

const Panel = ({ children, style }: PanelProps) => (
  <div
    style={{
      width: 320,
      height: 440,
      borderRadius: '10px 10px 6px 6px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 30px 60px -22px rgba(10,10,10,0.35)',
      ...style,
    }}
  >
    {children}
  </div>
);

export function TableTent({ qrPayload, business }: TemplateProps) {
  const { name, tableNumber } = business;
  const eyebrow = tableNumber
    ? `${name.toLocaleUpperCase('tr-TR')} · MASA ${tableNumber}`
    : name.toLocaleUpperCase('tr-TR');

  return (
    <div
      style={{
        width: 760,
        height: 540,
        background: '#F4F4F1',
        padding: 40,
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        display: 'flex',
        gap: 32,
        alignItems: 'center',
        justifyContent: 'center',
        perspective: 1400,
      }}
    >
      {/* Front panel — black ink */}
      <Panel style={{ background: '#0A0A0A', transform: 'rotateY(-12deg)', transformOrigin: 'right center' }}>
        <div
          style={{
            padding: 26,
            color: '#FAFAFA',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2.5,
                fontWeight: 700,
                color: '#C6F24E',
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                margin: '14px 0 6px',
                letterSpacing: -1,
                lineHeight: 1.05,
              }}
            >
              Bir çay
              <br />
              ısmarladık.
              <br />
              <span style={{ color: '#C6F24E' }}>Sen anlat.</span>
            </h1>
            <p style={{ fontSize: 12, color: '#A1A1AA', margin: 0, lineHeight: 1.45 }}>
              Telefonunla kodu okut, 30 saniyede deneyimini paylaş.
            </p>
          </div>
          <div style={{ background: '#FAFAFA', borderRadius: 14, padding: 16, alignSelf: 'flex-start' }}>
            <BuazeQR
              value={qrPayload}
              size={150}
              moduleShape="square"
              finderShape="square"
              fg="#0A0A0A"
              bg="#FAFAFA"
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: 10,
              color: '#737373',
            }}
          >
            {tableNumber ? (
              <span>
                Masa <span style={{ color: '#FAFAFA', fontWeight: 700 }}>{tableNumber}</span>
              </span>
            ) : (
              <span />
            )}
            <PoweredBy color="#737373" size={8} />
          </div>
        </div>
      </Panel>

      {/* Back panel — lime */}
      <Panel style={{ background: '#C6F24E', transform: 'rotateY(12deg)', transformOrigin: 'left center' }}>
        <div
          style={{
            padding: 26,
            color: '#0A0A0A',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#0A0A0A',
              }}
            >
              1 · 2 · 3
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 16px', letterSpacing: -0.5, lineHeight: 1.1 }}>
              Nasıl çalışır?
            </h2>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
              {["Kamerayı QR'a tut", 'Yıldız ver, yorum yaz', 'Teşekkürünü al'].map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#0A0A0A',
                      color: '#C6F24E',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      flex: '0 0 auto',
                    }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#0A0A0A',
                color: '#C6F24E',
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 6, height: 6, background: '#C6F24E', borderRadius: '50%' }} /> Anonim · 30 sn
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export const tableTentMeta: TemplateMeta = {
  id: 'table_tent',
  name: 'Masa Standı',
  tag: 'Lime · Mat siyah',
  category: 'venue',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'square', finder: 'square', surface: '#0A0A0A' },
  print: { widthMm: 100, heightMm: 150, bleedMm: 3 },
  canvas: { width: 320, height: 440 },
  descriptionTr: 'Katlanır masa standı — sıcak servis sırasında dikkat çeker.',
  descriptionEn: 'Folded table tent — catches attention during table service.',
};

export const tableTentEntry: TemplateEntry = { meta: tableTentMeta, Component: TableTent };
export default TableTent;
