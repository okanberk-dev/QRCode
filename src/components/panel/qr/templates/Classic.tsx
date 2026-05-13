'use client';

/**
 * Classic — the polished default. Lime blob backdrop, white card with QR,
 * pill CTA, "powered by buaze." footer. Suited to most venues; first card
 * in the picker grid + default for the `cafe` / fallback sector.
 *
 * Source: `qaxx/qr-templates.jsx` §00 HeroPolished. Inline styles preserved
 * verbatim (CLAUDE.md §23.7 wave decision — print artefacts use inline,
 * panel chrome uses bz-* tokens).
 */

import { BuazeQR } from '../BuazeQR';
import { PoweredBy } from '../Brand';
import { Stars } from './_shared';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function Classic({ qrPayload, business }: TemplateProps) {
  const { name, initials, tableNumber } = business;
  const eyebrow = tableNumber
    ? `${name.toLocaleUpperCase('tr-TR')} · MASA ${tableNumber}`
    : name.toLocaleUpperCase('tr-TR');

  return (
    <div
      style={{
        width: 720,
        height: 900,
        background: '#EAF9B8',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Decorative lime blobs */}
      <div
        style={{
          position: 'absolute',
          top: -90,
          left: -60,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: '#C6F24E',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -120,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: '#C6F24E',
          opacity: 0.55,
        }}
      />

      <div
        style={{
          position: 'relative',
          padding: '56px 56px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            fontWeight: 600,
            color: '#525252',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#0A0A0A',
            margin: '16px 0 8px',
            letterSpacing: -1,
            lineHeight: 1.1,
          }}
        >
          Yemek nasıldı?
          <br />
          <span style={{ color: '#525252', fontWeight: 500 }}>30 saniyede anlat.</span>
        </h1>

        {/* QR card */}
        <div
          style={{
            marginTop: 28,
            background: '#FFFFFF',
            borderRadius: 28,
            padding: 28,
            boxShadow: '0 24px 60px -20px rgba(10,10,10,0.22), 0 2px 0 rgba(10,10,10,0.04)',
          }}
        >
          <BuazeQR
            value={qrPayload}
            size={360}
            moduleShape="dot"
            finderShape="rounded"
            fg="#0A0A0A"
            bg="#FFFFFF"
            logo={
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: 22,
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

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Stars size={16} />
          <span style={{ fontSize: 13, color: '#525252', fontWeight: 500 }}>
            30 saniyede deneyimini paylaş
          </span>
        </div>

        {/* Pill CTA */}
        <div
          style={{
            marginTop: 24,
            background: '#FFFFFF',
            borderRadius: 999,
            padding: '10px 22px 10px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid #0A0A0A',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#C6F24E',
              boxShadow: '0 0 0 4px rgba(198,242,78,0.35)',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>
            Telefonun kamerasıyla taratın
          </span>
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
          gap: 10,
        }}
      >
        <div style={{ height: 1, width: 36, background: '#0A0A0A', opacity: 0.2 }} />
        <PoweredBy color="#525252" />
      </div>
    </div>
  );
}

export const classicMeta: TemplateMeta = {
  id: 'classic',
  name: 'Klasik',
  tag: 'Lime · Nokta',
  category: 'venue',
  preview: {
    fg: '#0A0A0A',
    bg: '#FFFFFF',
    module: 'dot',
    finder: 'rounded',
    surface: '#EAF9B8',
  },
  print: { widthMm: 100, heightMm: 125, bleedMm: 3 },
  descriptionTr: 'Genel amaçlı — masaüstü standı, vitrin posteri, broşür.',
  descriptionEn: 'General purpose — table tent, window poster, flyer.',
};

export const classicEntry: TemplateEntry = {
  meta: classicMeta,
  Component: Classic,
};

export default Classic;
