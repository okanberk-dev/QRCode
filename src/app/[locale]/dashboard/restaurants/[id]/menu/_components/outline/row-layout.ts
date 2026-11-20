/**
 * Item-row grid tiers (spec §3.3, G1), shared by `ItemRow`, `ServiceRow` and
 * `loading.tsx` so the skeleton has the rows' exact geometry.
 *
 * Tiers switch on the OUTLINE's width (container `outline`), never the
 * viewport, and only for fine pointers — touch always gets the two-line
 * narrow row with 44 px targets.
 *   narrow  <480 or coarse: [48 photo][name][⋯] / [price … status]
 *   medium  480–671 fine:   [20][40 photo][name][84 price][46 status][32 ⋯]
 *   full    ≥672 fine:      [20][20][40 photo][name][96 price][120 status][32 eye][32 ⋯]
 * The 20 px columns hold the selection checkbox and the drag grip (chunk 3);
 * they keep their width when empty.
 *
 * Tailwind reads these strings from source, so every class is written out in full.
 */

export const ROW_BASE =
  'scroll-mt-[124px] lg:scroll-mt-[180px] scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+var(--menu-stack,0px)+16px)]';

export const ROW_NARROW =
  'grid grid-cols-[48px_minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-3 gap-y-1.5 px-3 py-3 min-h-[76px]';

export const ROW_MEDIUM =
  'pointer-fine:@min-[480px]/outline:grid-cols-[20px_40px_minmax(0,1fr)_84px_46px_32px] pointer-fine:@min-[480px]/outline:grid-rows-1 pointer-fine:@min-[480px]/outline:items-center pointer-fine:@min-[480px]/outline:gap-x-2 pointer-fine:@min-[480px]/outline:py-2 pointer-fine:@min-[480px]/outline:min-h-[60px]';

export const ROW_FULL =
  'pointer-fine:@2xl/outline:grid-cols-[20px_20px_40px_minmax(0,1fr)_96px_120px_32px_32px] pointer-fine:@2xl/outline:min-h-[56px]';

/** Selection mode in the narrow tier: a 28 px checkbox column first (chunk 3). */
export const ROW_NARROW_SELECT = 'grid-cols-[28px_48px_minmax(0,1fr)_auto]';

// ── Cell placement per tier ──

/** Photo: narrow col 1 over both lines; medium col 2; full col 3. */
export const CELL_PHOTO =
  'col-start-1 row-start-1 row-span-2 self-start pointer-fine:@min-[480px]/outline:col-start-2 pointer-fine:@min-[480px]/outline:row-span-1 pointer-fine:@min-[480px]/outline:self-center pointer-fine:@2xl/outline:col-start-3';

/** Name block: narrow col 2 line 1; medium col 3; full col 4. */
export const CELL_NAME =
  'col-start-2 row-start-1 min-w-0 pointer-fine:@min-[480px]/outline:col-start-3 pointer-fine:@2xl/outline:col-start-4';

/** Narrow line 2 (price … status); its children become grid cells in medium / full. */
export const CELL_LINE2 =
  'col-start-2 col-span-2 row-start-2 flex min-w-0 items-center gap-3 pointer-fine:@min-[480px]/outline:contents';

/** Price: medium col 4; full col 5. */
export const CELL_PRICE =
  'relative min-w-0 pointer-fine:@min-[480px]/outline:col-start-4 pointer-fine:@min-[480px]/outline:row-start-1 pointer-fine:@min-[480px]/outline:justify-self-end pointer-fine:@2xl/outline:col-start-5';

/** Status: narrow pushed right; medium col 5; full col 6. */
export const CELL_STATUS =
  'ml-auto flex min-w-0 items-center pointer-fine:@min-[480px]/outline:col-start-5 pointer-fine:@min-[480px]/outline:row-start-1 pointer-fine:@min-[480px]/outline:ml-0 pointer-fine:@min-[480px]/outline:justify-self-center pointer-fine:@2xl/outline:col-start-6 pointer-fine:@2xl/outline:justify-self-start';

/** Eye (hide) button: full tier only, col 7. */
export const CELL_EYE =
  'hidden pointer-fine:@2xl/outline:col-start-7 pointer-fine:@2xl/outline:row-start-1 pointer-fine:@2xl/outline:flex pointer-fine:@2xl/outline:justify-center';

/** ⋯: narrow col 3 line 1; medium col 6; full col 8. */
export const CELL_MENU =
  'col-start-3 row-start-1 self-start justify-self-end pointer-fine:@min-[480px]/outline:col-start-6 pointer-fine:@min-[480px]/outline:self-center pointer-fine:@2xl/outline:col-start-8';

/** Shown only in the medium tier (e.g. the inline "Tükendi" badge). */
export const ONLY_MEDIUM = 'hidden pointer-fine:@min-[480px]/outline:inline-flex pointer-fine:@2xl/outline:hidden';
/** Shown from the medium tier up (description line). */
export const FROM_MEDIUM = 'hidden pointer-fine:@min-[480px]/outline:block';
/** Shown only in the full tier. */
export const ONLY_FULL = 'hidden pointer-fine:@2xl/outline:inline-flex';
/** Visible text in narrow + full, screen-reader only in medium. */
export const SR_IN_MEDIUM = 'pointer-fine:@min-[480px]/outline:sr-only pointer-fine:@2xl/outline:not-sr-only';
