'use client';

/**
 * PulseLine — Stage 66 §38.147 PR0 base.
 *
 * ECG-style nabız çizgisi (logo motif). SVG path drawing + lime accent
 * dot moving along path. Pure SVG SMIL animation (animateMotion +
 * strokeDashoffset CSS) — framer-motion gerekmez (LazyMount viewport
 * gating'i yeterli).
 *
 * Pulse §11 disipline: graphite ink stroke + lime accent dot.
 * Reduced-motion: LazyMount tarafından handle edilir (parent wrapper).
 *
 * Original: site-library.jsx 1.PulseLine. Konversiyon: inline style →
 * brand-* utility, animation → CSS @keyframes (brand-draw config'te).
 */

interface PulseLineProps {
  /** SVG genişliği (default 240). */
  width?: number;
  /** Çizgi rengi (default brand-ink #0A0A0A). */
  color?: string;
  /** Hareket eden nokta rengi (default brand-lime #C6F24E). */
  accent?: string;
  /** Animasyon süresi saniye (default 2.4). */
  durationSec?: number;
  /** Tailwind className override (boyut/margin override). */
  className?: string;
}

const ECG_PATH =
  'M 0 25 L 60 25 L 75 10 L 95 40 L 115 18 L 135 30 L 155 25 L 240 25';

export default function PulseLine({
  width = 240,
  color = '#0A0A0A',
  accent = '#C6F24E',
  durationSec = 2.4,
  className,
}: PulseLineProps) {
  return (
    <svg
      width={width}
      height={50}
      viewBox="0 0 240 50"
      style={{ overflow: 'visible' }}
      className={className}
      aria-hidden="true"
      role="img"
    >
      <path
        d={ECG_PATH}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="500"
        strokeDashoffset="500"
        style={{
          animation: `brand-draw ${durationSec}s ease-out infinite`,
        }}
      />
      <circle r="4" fill={accent}>
        <animateMotion
          dur={`${durationSec}s`}
          repeatCount="indefinite"
          path={ECG_PATH}
        />
      </circle>
    </svg>
  );
}
