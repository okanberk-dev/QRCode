import type { ReactNode } from 'react';
import ThreeStage from './ThreeStage';
import AmbientMotionToggle from './AmbientMotionToggle';
import { PulseFieldFallback } from './fallbacks';

/**
 * Footer "pulse horizon" band (CLAUDE.md §50): the pulse-field scene behind
 * an optional overlay. Server component — the band, its scrims and the SVG
 * fallback are in the HTML; three.js only loads on capable devices when the
 * footer comes near the viewport.
 *
 * `children` is real HTML drawn above the scene (e.g. a brand line). Keep it
 * inside the scrimmed areas so text contrast stays ≥ 4.5:1.
 */
export default function FooterPulseHorizon({
  locale,
  children,
  className = 'h-[168px] sm:h-[220px] lg:h-[260px]',
}: {
  locale: 'tr' | 'en';
  children?: ReactNode;
  /** Height (and any extra layout) of the band. */
  className?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-[#0A0A0A] ${className}`}>
      <ThreeStage
        scene="pulse-field"
        theme="dark"
        className="absolute inset-0"
        fallback={<PulseFieldFallback id="bz-footer-pulse" />}
      />
      {/* Scrims blend the band into the footer and keep overlay text legible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#0A0A0A] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#0A0A0A] to-transparent"
      />
      {children ? <div className="relative z-10 h-full">{children}</div> : null}
      <AmbientMotionToggle locale={locale} className="absolute bottom-3 right-4 z-20 sm:right-6" />
    </div>
  );
}
