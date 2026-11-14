/**
 * Shared class strings for the commercial marketing pages (pricing, ROI,
 * comparisons, how it works, platform links, Google rules). Plain strings,
 * not a Button component (CLAUDE.md §7): every page still writes its own
 * <Link>/<a>, these only keep the spacing, radius and focus ring identical.
 */

export const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-10';

/** Narrow reading column (FAQ, long-form text). */
export const CONTAINER_NARROW = 'mx-auto w-full max-w-[920px] px-5 sm:px-10';

export const SECTION_Y = 'py-[60px] sm:py-24';

export const CARD = 'rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8';

const BTN_BASE =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2';

export const BTN_LIME = `${BTN_BASE} bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]`;

export const BTN_DARK = `${BTN_BASE} bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]`;

export const BTN_OUTLINE = `${BTN_BASE} border border-[#0A0A0A] bg-white text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white`;

/** Outline button on a graphite background. */
export const BTN_OUTLINE_ON_DARK = `${BTN_BASE} border border-white/30 text-white hover:bg-white/10 focus-visible:ring-offset-[#0A0A0A]`;

/** Lime button on a graphite background (ring offset matches the surface). */
export const BTN_LIME_ON_DARK = `${BTN_LIME} focus-visible:ring-offset-[#0A0A0A]`;

/** Inline text link with the lime underline used across the marketing site. */
export const TEXT_LINK =
  'font-medium text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 rounded-sm';
