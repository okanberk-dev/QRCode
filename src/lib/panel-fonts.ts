// Panel typography (owner + admin panels only — CLAUDE.md §49).
//
// The panels use Geist / Geist Mono (the shadcn dashboard type pair). The
// marketing site keeps Space Grotesk + Inter + JetBrains Mono (§11), so these
// fonts are declared here and imported only by the panel layouts: the
// @font-face rules and the preload links ship with panel routes only.
//
// `PanelTheme` writes the generated family names into CSS variables; the
// `:root:has(.bz-panel)` block in globals.css maps them onto
// --font-body / --font-heading / --font-mono.
import { Geist, Geist_Mono } from 'next/font/google';

// Turkish ğ / ş / İ live in latin-ext, which nearly every panel screen shows.
export const panelSans = Geist({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

// Mono is only used for small eyebrows and numbers — never the LCP text.
export const panelMono = Geist_Mono({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: false,
});
