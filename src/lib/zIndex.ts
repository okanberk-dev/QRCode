/**
 * Named z-index layers for Buaze UI — single source of truth to keep
 * drawers, navbars, and modals from colliding.
 *
 * Use inline Tailwind (`z-40`, `z-50`, `z-[60]`) consistent with the
 * numeric values below. The `Z` object exists so components can import
 * constants instead of re-deriving precedence rules.
 */

export const Z = {
  /** Section-level decoration behind content (blurred blobs, grids) */
  BEHIND: 0,
  /** In-flow layered cards (stacked testimonials, feature tiles) */
  RAISED: 10,
  /** Floating UI inside the page flow (stats overlays, badges) */
  FLOATING: 20,
  /** Sticky/desktop sidebars fixed to the viewport */
  SIDEBAR: 30,
  /** Top navbars (sticky mobile bar, marketing navbar) */
  NAVBAR: 40,
  /** Mobile drawers + bottom-nav overlays */
  DRAWER: 50,
  /** Modal dialogs, confirmation prompts */
  MODAL: 60,
  /** Toasts, error banners, snackbars — always visible */
  TOAST: 70,
} as const;

export type ZLayer = keyof typeof Z;
