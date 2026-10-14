/**
 * PulseMenu rows are 35 px tall. On touch-sized screens (below `lg`) every row
 * of every survey menu gets the 44 px minimum touch target (CLAUDE.md §40.3);
 * desktop keeps the compact rows. Add this to the menu's `className` — the
 * menu renders in a portal, so the rule targets the rows from the menu itself.
 */
export const MENU_TOUCH = 'max-lg:[&_.bz-menu-item]:min-h-11';
