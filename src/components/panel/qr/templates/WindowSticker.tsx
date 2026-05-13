'use client';

/**
 * WindowSticker — circular die-cut clinging for door/window glass.
 * Source: qaxx §02. Google-specific wording neutralised (CLAUDE.md §19.1.1
 * — review-platform routing happens server-side, not in customer-facing
 * print artefact).
 */

import { BuazeQR } from '../BuazeQR';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function WindowSticker({ qrPayload }: TemplateProps) {
  return (
    <div
      style={{
        width: 540,
        height: 540,
        background: 'linear-gradient(135deg, #d8e6e3 0%, #f0f2eb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        position: 'relative',
      }}
    >
      {/* Glass reflection */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(115deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.25) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', width: 380, height: 380 }}>
        {/* Outer ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#0A0A0A',
            boxShadow: '0 30px 60px -20px rgba(10,10,10,0.4), inset 0 0 0 12px #C6F24E',
          }}
        />
        {/* Curved label — top */}
        <svg viewBox="0 0 380 380" width={380} height={380} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <path id="topArc" d="M 50 190 A 140 140 0 0 1 330 190" fill="none" />
            <path id="botArc" d="M 50 190 A 140 140 0 0 0 330 190" fill="none" />
          </defs>
          <text fill="#C6F24E" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="16" letterSpacing="3">
            <textPath href="#topArc" startOffset="50%" textAnchor="middle">
              ★ DENEYİMİNİ PAYLAŞ ★ 30 SANİYE ★ TEŞEKKÜRLER ★
            </textPath>
          </text>
          <text fill="#FAFAFA" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="12" letterSpacing="2.5">
            <textPath href="#botArc" startOffset="50%" textAnchor="middle">
              ★ ANONİM SEÇENEK MEVCUTTUR · KAMERAYLA OKUT ★
            </textPath>
          </text>
        </svg>
        {/* Inner white plate with QR */}
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 70,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            boxShadow: 'inset 0 0 0 4px #EAF9B8',
          }}
        >
          <BuazeQR
            value={qrPayload}
            size={170}
            moduleShape="dot"
            finderShape="circle"
            fg="#0A0A0A"
            bg="#FAFAFA"
          />
          <div style={{ marginTop: 6, fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: '#525252' }}>
            SCAN · OKUT
          </div>
        </div>
      </div>
    </div>
  );
}

export const windowStickerMeta: TemplateMeta = {
  id: 'window_sticker',
  name: 'Vitrin Stickerı',
  tag: 'Lime ring · Daire',
  category: 'venue',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'dot', finder: 'circle', surface: '#0A0A0A' },
  print: { widthMm: 120, heightMm: 120, bleedMm: 2 },
  canvas: { width: 540, height: 540 },
  descriptionTr: 'Vitrin/kapı için yuvarlak die-cut sticker.',
  descriptionEn: 'Round die-cut decal for storefront door / window.',
};

export const windowStickerEntry: TemplateEntry = { meta: windowStickerMeta, Component: WindowSticker };
export default WindowSticker;
