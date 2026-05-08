'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APLocationCard (~85 satır).
 *
 * Restaurant/branch card: pin icon + name + address + active toggle +
 * stars + count + arrow CTA. HANDOFF "Buaze Karaköy" branch list paterni.
 * Mevcut Buaze counterpart yok — yeni primitive.
 *
 * Pulse §11 hex map:
 *  - card: APCard with hover lift, 18px padding, 320 max-width
 *  - icon container: 44×44 14px radius + #EAF9B8 (lime-soft) bg + Pin icon
 *  - title: 15px font-semibold + #0A0A0A
 *  - address: 11px #525252 muted, 14px mb
 *  - footer separator: 1px rgba(10,10,10,0.06) border-top
 *  - rating row: stars + 12px font-bold rating + 9px count meta
 *
 * Kullanım: owner restaurants list, admin restaurant grid, multi-branch
 * picker.
 *
 * A11y: card decorative; toggle aria-label "İşletmeyi aktif et/durdur";
 * arrow button aria-label "Detayları görüntüle".
 */

import { type ReactNode } from 'react';
import { ArrowRight, Pin } from 'lucide-react';
import { APCard } from './APCard';
import { APIconButton } from './APIconButton';
import { APSwitch } from './APSwitch';

function StarsRow({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={11} height={11} viewBox="0 0 24 24">
          <path
            d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"
            fill={n >= i ? '#A8D62E' : 'rgba(10,10,10,0.1)'}
            stroke={n >= i ? '#A8D62E' : 'rgba(10,10,10,0.2)'}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export interface APLocationCardProps {
  name: ReactNode;
  address: ReactNode;
  rating: number;
  reviewCount: number;
  active?: boolean;
  onActiveChange?: (next: boolean) => void;
  onOpen?: () => void;
  /** Sol icon override (default Pin) */
  icon?: ReactNode;
  className?: string;
}

export function APLocationCard({
  name,
  address,
  rating,
  reviewCount,
  active = true,
  onActiveChange,
  onOpen,
  icon,
  className = '',
}: APLocationCardProps) {
  return (
    <APCard hover padding={18} className={`max-w-[320px] ${className}`}>
      <div className="mb-3.5 flex items-start justify-between">
        <span
          aria-hidden="true"
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: '#EAF9B8',
            color: '#0A0A0A',
          }}
        >
          {icon ?? <Pin size={20} color="#0A0A0A" strokeWidth={1.8} />}
        </span>
        <APSwitch
          checked={active}
          onChange={onActiveChange}
          size="sm"
          ariaLabel={active ? 'İşletmeyi durdur' : 'İşletmeyi aktif et'}
        />
      </div>
      <h4 className="mb-1 text-[15px] font-semibold text-[#0A0A0A]">{name}</h4>
      <p className="mb-3.5 text-[11px] text-[#525252]">{address}</p>
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid rgba(10,10,10,0.06)' }}
      >
        <div className="flex items-center gap-1.5">
          <StarsRow n={Math.round(rating)} />
          <span
            className="text-[12px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {rating.toFixed(1)}
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.18em] text-[#525252]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            · {reviewCount}
          </span>
        </div>
        <APIconButton
          ariaLabel="Detayları görüntüle"
          size="sm"
          tone="ghost"
          onClick={onOpen}
        >
          <ArrowRight size={14} color="#0A0A0A" strokeWidth={1.8} aria-hidden="true" />
        </APIconButton>
      </div>
    </APCard>
  );
}
