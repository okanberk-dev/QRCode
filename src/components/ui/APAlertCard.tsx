'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APAlertCard (~95 satır).
 *
 * Negative review alert with red accent stripe + chip + meta + stars +
 * customer quote + reply/dismiss action row. HANDOFF "NEGATİF UYARI"
 * deneyimi paterni. Mevcut Buaze `<AlertBanner kind="danger">` farklı
 * API (inline banner) — APAlertCard standalone card with structured
 * review data + lime CTA arrow icon dual-tone.
 *
 * Pulse §11 hex map:
 *  - card: APCard with accent="#DC2626" (red 4px stripe)
 *  - header chip: <APChip tone="danger" dot> (NEGATİF UYARI label)
 *  - timestamp: 9px JetBrains Mono + #525252 muted
 *  - stars: <Stars n={1}> equivalent (custom inline lime-deep fill SVG)
 *  - body quote: 12px italic + 1.5 line-height + #737373 muted
 *  - actions: APButton variant="dark" + variant="ghost"
 *
 * Kullanım: admin dashboard / owner inbox sticky negative review alert,
 * push notification fallback panel.
 *
 * A11y: card decorative, action button'lar `aria-label` (ariaLabel prop).
 */

import { type ReactNode } from 'react';
import { Reply } from 'lucide-react';
import { APButton } from './APButton';
import { APCard } from './APCard';
import { APChip } from './APChip';

export interface APAlertCardProps {
  /** Header chip content (e.g. "NEGATİF UYARI" / "NEGATIVE ALERT") */
  alertLabel: ReactNode;
  timestamp: string;
  rating: number;
  customerName: string;
  customerLocation?: string;
  body: ReactNode;
  primaryLabel?: ReactNode;
  onPrimary?: () => void;
  secondaryLabel?: ReactNode;
  onSecondary?: () => void;
  className?: string;
}

function StarsRow({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={12} height={12} viewBox="0 0 24 24">
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

export function APAlertCard({
  alertLabel,
  timestamp,
  rating,
  customerName,
  customerLocation,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  className = '',
}: APAlertCardProps) {
  return (
    <APCard padding={18} accent="#DC2626" className={`max-w-[380px] ${className}`}>
      <div className="pl-2">
        <div className="mb-2.5 flex items-start justify-between">
          <APChip tone="danger" dot>
            {alertLabel}
          </APChip>
          <span
            className="text-[9px] uppercase tracking-[0.18em] text-[#737373]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {timestamp}
          </span>
        </div>
        <div className="mb-1.5 flex items-center gap-2">
          <StarsRow n={rating} />
          <span className="text-[13px] font-semibold text-[#0A0A0A]">{customerName}</span>
          {customerLocation ? (
            <span
              className="text-[10px] uppercase tracking-[0.18em] text-[#737373]"
              style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
            >
              · {customerLocation}
            </span>
          ) : null}
        </div>
        <p className="mb-3.5 text-[12px] italic leading-[1.5] text-[#525252]">{body}</p>
        <div className="flex items-center gap-2">
          {primaryLabel ? (
            <APButton
              variant="dark"
              size="sm"
              icon={<Reply size={12} color="#C6F24E" aria-hidden="true" />}
              onClick={onPrimary}
            >
              {primaryLabel}
            </APButton>
          ) : null}
          {secondaryLabel ? (
            <APButton variant="ghost" size="sm" onClick={onSecondary}>
              {secondaryLabel}
            </APButton>
          ) : null}
        </div>
      </div>
    </APCard>
  );
}
