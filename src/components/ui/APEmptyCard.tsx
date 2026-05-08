'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APEmptyCard (~80 satır).
 *
 * Empty state with halo-pulsing icon + italic title + body + CTA. HANDOFF
 * "Henüz yorum yok" deneyimi paterni. Mevcut Buaze `<EmptyState>` farklı
 * API ama Pulse-compliant — APEmptyCard hero icon halo pulse animation
 * + italic display title ile daha "premium editorial" hissi taşır.
 *
 * Pulse §11 hex map:
 *  - icon container: 64×64 32px radius + #EAF9B8 (lime-soft) bg
 *  - halo: -6 inset + 38px radius + #C6F24E + opacity 0.12 + 2.4s pulse
 *  - title: italic Space Grotesk 24px (CLAUDE.md §38.112 paterni)
 *  - body: 12.5px #525252 muted, line-height 1.5
 *  - centered text-align, 32px padding, 360 max-width
 *
 * Kullanım: yeni hesap onboarding empty state, no-data fallback (analytics
 * boş periyot), feed boş.
 *
 * Pulse-Heartbeat: existing keyframe `bz-pulse-dot`/.pulse-heartbeat
 * (CLAUDE.md §38.61 reduced-motion blanket'i kapsar).
 */

import { type ReactNode } from 'react';
import { APButton } from './APButton';
import { APCard } from './APCard';

export interface APEmptyCardProps {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  /** Primary CTA button content */
  ctaLabel?: ReactNode;
  ctaIcon?: ReactNode;
  onCtaClick?: () => void;
  className?: string;
}

export function APEmptyCard({
  icon,
  title,
  body,
  ctaLabel,
  ctaIcon,
  onCtaClick,
  className = '',
}: APEmptyCardProps) {
  return (
    <APCard padding={32} className={`max-w-[360px] text-center ${className}`}>
      <div
        aria-hidden="true"
        className="relative mb-4 inline-flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: '#EAF9B8',
          color: '#0A0A0A',
        }}
      >
        <span
          className="pulse-heartbeat absolute"
          style={{
            inset: -6,
            borderRadius: 38,
            background: '#C6F24E',
            opacity: 0.12,
            pointerEvents: 'none',
          }}
        />
        {icon}
      </div>
      <h4
        className="mb-1.5 text-[24px] font-normal tracking-[-0.01em]"
        style={{
          fontFamily: 'var(--font-heading), var(--font-space-grotesk), system-ui, sans-serif',
          fontStyle: 'italic',
        }}
      >
        {title}
      </h4>
      {body ? (
        <p className="mb-5 text-[12.5px] leading-[1.5] text-[#525252]">{body}</p>
      ) : null}
      {ctaLabel ? (
        <APButton variant="primary" size="md" icon={ctaIcon} onClick={onCtaClick}>
          {ctaLabel}
        </APButton>
      ) : null}
    </APCard>
  );
}
