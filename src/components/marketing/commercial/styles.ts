/**
 * "Ritim" design (CLAUDE.md §62): these names now map to rt- classes.
 * Shared class strings for the commercial marketing pages (pricing, ROI,
 * comparisons, how it works, platform links, Google rules). Plain strings,
 * not a Button component (CLAUDE.md §7): every page still writes its own
 * <Link>/<a>, these only keep the spacing, radius and focus ring identical.
 */

export const CONTAINER = 'rt-container';

/** Narrow reading column (FAQ, long-form text). */
export const CONTAINER_NARROW = 'rt-container rt-container--narrow';

export const SECTION_Y = 'py-[64px] lg:py-[112px]';

export const CARD = 'rounded-[var(--rt-r-lg)] border border-[var(--rt-line)] bg-[image:var(--rt-grad-plan-card)] p-6 sm:p-8';


export const BTN_LIME = 'rt-btn rt-btn--primary';

export const BTN_DARK = 'rt-btn rt-btn--solid';

export const BTN_OUTLINE = 'rt-btn rt-btn--outline';

/** Outline button on a graphite background. */
export const BTN_OUTLINE_ON_DARK = 'rt-btn rt-btn--ghost-white';

/** Lime button on a graphite background (ring offset matches the surface). */
export const BTN_LIME_ON_DARK = 'rt-btn rt-btn--white';

/** Inline text link with the lime underline used across the marketing site. */
export const TEXT_LINK = 'rt-link';
