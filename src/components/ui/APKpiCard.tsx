'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APKpiCard (~110 satır).
 *
 * KPI card with label + 38px hero value + suffix + delta + sparkline +
 * icon. HANDOFF dashboard KPI grid temel block. Mevcut Buaze `<StatCard>`
 * (CLAUDE.md §23.3) farklı API — APKpiCard HANDOFF spec birebir
 * (sparkline polygon + circle endpoint, lime gradient fill, italic
 * Space Grotesk hero value).
 *
 * Pulse §11 hex map:
 *  - bg: white + APCard wrapper
 *  - icon container: #EAF9B8 (lime-soft) bg + 26×26 8px radius + 13px icon
 *  - hero value: 38px italic Space Grotesk + tight tracking (CLAUDE.md §38.112 paterni)
 *  - suffix: 14px JetBrains Mono + #525252 muted
 *  - delta: <APChip tone="success" dot> (Pulse Buaze paterni)
 *  - sparkline: linear gradient lime 0.5→0 stop + 1.6px polyline + 3.5px endpoint circle
 *
 * Kullanım: dashboard KPI strip, analytics overview, owner home metrics.
 *
 * A11y: card decorative; sparkline `<svg>` `role="img"` + aria-label
 * (peak/last value summary).
 */

import { type ReactNode, useId } from 'react';
import { APCard } from './APCard';
import { APChip, type APChipTone } from './APChip';

export interface APKpiCardProps {
  label: string;
  value: ReactNode;
  suffix?: string;
  delta?: string;
  deltaTone?: APChipTone;
  /** 5-12 numeric data points; gradient + polyline + endpoint */
  spark?: number[];
  icon?: ReactNode;
  className?: string;
}

export function APKpiCard({
  label,
  value,
  suffix = '',
  delta,
  deltaTone = 'success',
  spark = [3, 4, 3, 5, 6, 5, 7, 8, 7, 9, 10],
  icon,
  className = '',
}: APKpiCardProps) {
  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const W = 130;
  const H = 40;
  const range = max - min || 1;
  const pts = spark
    .map((v, i) => {
      const x = (i / (spark.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(' ');
  const lastX = W;
  const lastY = H - ((spark[spark.length - 1] - min) / range) * H;
  const gradId = useId();

  return (
    <APCard hover padding={18} className={className}>
      <div className="mb-2.5 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon ? (
            <span
              aria-hidden="true"
              className="flex items-center justify-center"
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: '#EAF9B8',
                color: '#0A0A0A',
              }}
            >
              {icon}
            </span>
          ) : null}
          <span
            className="text-[10px] uppercase tracking-[0.18em] text-[#525252]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {label}
          </span>
        </div>
        {delta ? (
          <APChip tone={deltaTone} dot>
            {delta}
          </APChip>
        ) : null}
      </div>
      <div className="mb-3 flex items-baseline gap-1">
        <span
          style={{
            fontFamily: 'var(--font-heading), var(--font-space-grotesk), system-ui, sans-serif',
            fontStyle: 'italic',
            fontSize: 38,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {suffix ? (
          <span
            className="text-[14px] font-semibold text-[#525252]"
            style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace' }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} trendi, son değer ${spark[spark.length - 1]}`}
        className="block w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gradId})`} />
        <polyline
          points={pts}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={lastX} cy={lastY} r="3.5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
      </svg>
    </APCard>
  );
}
