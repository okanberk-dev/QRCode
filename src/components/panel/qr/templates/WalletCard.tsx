'use client';

/**
 * WalletCard — credit-card-sized loyalty/review card with QR on the back.
 * Shown as front+back pair. Source: qaxx §07. Loyalty stats (28 ziyaret,
 * Tier 02) kept as printable placeholders — owners can swap in design.
 */

import { BuazeQR } from '../BuazeQR';
import { BizMark } from '../Brand';
import type { TemplateEntry, TemplateMeta, TemplateProps } from './types';

export function WalletCard({ qrPayload, business }: TemplateProps) {
  const { name, initials } = business;
  return (
    <div
      style={{
        width: 760,
        height: 460,
        background: '#F4F4F1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        fontFamily: "'Inter', sans-serif",
        padding: 32,
      }}
    >
      {/* FRONT */}
      <div
        style={{
          width: 320,
          height: 200,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #C6F24E 0%, #A8D62E 100%)',
          padding: 22,
          position: 'relative',
          boxShadow: '0 20px 40px -12px rgba(10,10,10,0.3)',
          color: '#0A0A0A',
        }}
      >
        {/* Chip */}
        <div
          style={{
            width: 36,
            height: 26,
            background: 'linear-gradient(135deg, #FAFAFA 0%, #d4d4cf 100%)',
            borderRadius: 4,
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(10,10,10,0.2)', borderRadius: 2 }} />
        </div>
        <div style={{ position: 'absolute', top: 22, right: 22, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BizMark style="circle" initials={initials} bg="#C6F24E" fg="#0A0A0A" size={28} hint={false} />
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: -0.3 }}>
            {name}
          </div>
        </div>
        <div style={{ marginTop: 36, fontSize: 11, letterSpacing: 1.5, fontWeight: 600, opacity: 0.7 }}>
          SADAKAT · KART
        </div>
        <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>MİSAFİR</div>
        <div
          style={{
            position: 'absolute',
            bottom: 18,
            left: 22,
            right: 22,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          <span>QR · TARA</span>
          <span>★ YORUM = HEDİYE</span>
        </div>
      </div>

      {/* BACK */}
      <div
        style={{
          width: 320,
          height: 200,
          borderRadius: 16,
          background: '#0A0A0A',
          padding: 18,
          position: 'relative',
          boxShadow: '0 20px 40px -12px rgba(10,10,10,0.3)',
          color: '#FAFAFA',
          display: 'flex',
          gap: 14,
        }}
      >
        {/* Mag stripe */}
        <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: 28, background: '#1a1a1a' }} />
        <div
          style={{
            width: 130,
            marginTop: 56,
            background: '#FAFAFA',
            borderRadius: 6,
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BuazeQR
            value={qrPayload}
            size={114}
            moduleShape="dot"
            finderShape="rounded"
            fg="#0A0A0A"
            bg="#FAFAFA"
            margin={1}
          />
        </div>
        <div
          style={{
            flex: 1,
            marginTop: 56,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#C6F24E', fontWeight: 700 }}>
              YORUM YAP, TEŞEKKÜRÜNÜ AL
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, lineHeight: 1.15, letterSpacing: -0.3 }}>
              QR&apos;ı tara, deneyimini bize bırak.
            </div>
          </div>
          <div style={{ fontSize: 8.5, color: '#737373', lineHeight: 1.5 }}>
            Anonim seçenek mevcut · KVKK uyumlu · veriler sadece işletme ile paylaşılır.
          </div>
        </div>
      </div>
    </div>
  );
}

export const walletCardMeta: TemplateMeta = {
  id: 'wallet_card',
  name: 'Cüzdan Kartı',
  tag: 'Sadakat · Ön/Arka',
  category: 'loyalty',
  preview: { fg: '#0A0A0A', bg: '#FAFAFA', module: 'dot', finder: 'rounded', surface: '#C6F24E' },
  print: { widthMm: 86, heightMm: 54, bleedMm: 3 },
  descriptionTr: 'Kartvizit ölçeğinde sadakat / yorum kartı (ön + arka).',
  descriptionEn: 'Credit-card-sized loyalty / review card (front + back).',
};

export const walletCardEntry: TemplateEntry = { meta: walletCardMeta, Component: WalletCard };
export default WalletCard;
