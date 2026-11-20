/**
 * Status card geometry shared by `MenuStatusCard` and the loading skeleton
 * (`loading.tsx`), so both lay out the same way (no shift on load).
 *
 * Text column of the draft / live row (≥1024): it keeps 300px, so at
 * 1024–1279 the actions wrap onto a second line instead of squeezing the copy
 * to ~130px, and the draft and live bodies both take two lines.
 */
export const STATUS_TEXT_COLUMN = 'min-w-0 lg:min-w-[300px] lg:flex-1';
