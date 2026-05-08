'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APQRCard (~75 satır).
 *
 * QR code display card with header + QR placeholder + download/share
 * action row. HANDOFF "QR KOD · TABLE-04" preview paterni. Mevcut Buaze
 * counterpart yok (qr/page.tsx inline grid item) — yeni primitive.
 *
 * Pulse §11 hex map:
 *  - card: APCard 18px padding, 280 max-width
 *  - QR container: #FAFAFA bg + 14px radius + 16px padding + light border
 *  - download button: APButton variant="secondary" size="sm" full
 *  - share button: APIconButton size="md" tone="default"
 *  - header label: 10px JetBrains Mono uppercase + 0.18em tracking
 *
 * QR rendering: bu primitive children olarak QR component kabul eder
 * (qrcode lib ile üretilen <canvas>/<img>); component-agnostic. HANDOFF
 * `<QRCode size={160} />` placeholder yerine caller'ın kendi QR'ı.
 *
 * Kullanım: owner /qr list, admin QR generation result preview, public
 * print sheet QR card.
 *
 * A11y: card decorative; download/share button explicit aria-label.
 */

import { type ReactNode } from 'react';
import { Download, Share2 } from 'lucide-react';
import { APButton } from './APButton';
import { APCard } from './APCard';
import { APIconButton } from './APIconButton';

export interface APQRCardProps {
  /** Header label (e.g. "QR KOD · TABLE-04" / "QR CODE · TABLE-04") */
  label: ReactNode;
  /** QR rendering — caller-provided component (qrcode lib output) */
  qrSlot: ReactNode;
  downloadLabel?: ReactNode;
  onDownload?: () => void;
  onShare?: () => void;
  shareAriaLabel?: string;
  /** Trailing icon-only menu trigger (more) */
  onMore?: () => void;
  moreAriaLabel?: string;
  className?: string;
}

export function APQRCard({
  label,
  qrSlot,
  downloadLabel = 'İNDİR',
  onDownload,
  onShare,
  shareAriaLabel = 'Paylaş',
  onMore,
  moreAriaLabel = 'Daha fazla seçenek',
  className = '',
}: APQRCardProps) {
  return (
    <APCard padding={18} className={`max-w-[280px] ${className}`}>
      <div className="mb-3.5 flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.18em] text-[#525252]"
          style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
        >
          {label}
        </span>
        {onMore ? (
          <APIconButton ariaLabel={moreAriaLabel} size="sm" tone="ghost" onClick={onMore}>
            <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="6" cy="12" r="1.4" fill="#0A0A0A" />
              <circle cx="12" cy="12" r="1.4" fill="#0A0A0A" />
              <circle cx="18" cy="12" r="1.4" fill="#0A0A0A" />
            </svg>
          </APIconButton>
        ) : null}
      </div>
      <div
        className="mb-3.5 flex items-center justify-center"
        style={{
          background: '#FAFAFA',
          borderRadius: 14,
          padding: 16,
          border: '1px solid rgba(10,10,10,0.05)',
        }}
      >
        {qrSlot}
      </div>
      <div className="flex items-center gap-2">
        <APButton
          variant="secondary"
          size="sm"
          icon={<Download size={12} aria-hidden="true" />}
          full
          onClick={onDownload}
        >
          {downloadLabel}
        </APButton>
        <APIconButton ariaLabel={shareAriaLabel} size="md" tone="default" onClick={onShare}>
          <Share2 size={16} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
        </APIconButton>
      </div>
    </APCard>
  );
}
