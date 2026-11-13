import ThreeStage from './ThreeStage';
import AmbientMotionToggle from './AmbientMotionToggle';
import { PlatformOrbitFallback } from './fallbacks';

/**
 * Square box with the platform-orbit scene (CLAUDE.md §50): ten
 * brand-colored nodes for the review platforms whose links Buaze manages,
 * around a lime core. Decorative only — render the platform names as HTML
 * next to it. Server component; the SVG fallback is in the HTML and three.js
 * loads only on capable devices.
 */
export default function PlatformOrbitStage({
  locale,
  theme = 'dark',
  className = '',
  media,
  afterLoad = false,
  id = 'bz-orbit',
}: {
  locale: 'tr' | 'en';
  theme?: 'dark' | 'light';
  /** Sizing of the square box (width / max-width / margins). */
  className?: string;
  /** Only load 3D when this media query matches. */
  media?: string;
  /** Wait for window load first (use near the top of a page). */
  afterLoad?: boolean;
  /** Unique prefix for the fallback's SVG ids. */
  id?: string;
}) {
  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <ThreeStage
        scene="platform-orbit"
        theme={theme}
        media={media}
        afterLoad={afterLoad}
        className="absolute inset-0"
        fallback={<PlatformOrbitFallback theme={theme} id={id} />}
      />
      <AmbientMotionToggle
        locale={locale}
        tone={theme}
        className="absolute bottom-2 right-2 z-10"
      />
    </div>
  );
}
