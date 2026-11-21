// Panel typography (owner + admin panels only — docs/design/panel-design-system.md, CLAUDE.md §53).
//
// The panels use DM Sans (SIL Open Font License, Google Fonts): the NICKLPASS
// adaptation's type. The marketing site keeps Clash Display + Inter (§11), so
// this font is declared here and imported only by the panel layouts; its
// @font-face rules ship with panel routes only.
//
// `PanelTheme` writes the generated family name into a CSS variable; the
// `:root:has(.bz-panel)` block in globals.css maps it onto --font-body /
// --font-heading. Restaurant menus (Studio preview included) never use it:
// they read their own --m-* / --font-inter stacks.
import { DM_Sans } from 'next/font/google';

// Turkish ğ / ş / İ live in latin-ext, which nearly every panel screen shows.
export const panelSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
