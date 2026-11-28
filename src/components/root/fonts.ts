import { Space_Grotesk, Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import localFont from 'next/font/local';

// Site fonts (CLAUDE.md §11): Clash Display (headings) + Inter (body) +
// JetBrains Mono (eyebrows / numbers), on every surface including the
// owner + admin panels (§49).

// Clash Display — Indian Type Foundry, ITF Free Font License (Fontshare).
// The license allows self-hosting for Buaze's own site but forbids
// modifying the files (no subsetting / format conversion) and forbids
// offering the font to customers for THEIR content. So:
// - the woff2 files in src/fonts/clash-display are the official Fontshare
//   files, byte for byte; next/font/local serves them as-is;
// - public restaurant menus and the QR generator's downloadable images keep
//   Space Grotesk (--font-menu-heading / --font-space-grotesk), never this.
const clashDisplay = localFont({
  src: [
    { path: '../../fonts/clash-display/ClashDisplay-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../fonts/clash-display/ClashDisplay-Semibold.woff2', weight: '600', style: 'normal' },
    { path: '../../fonts/clash-display/ClashDisplay-Bold.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-clash-display',
});

// Only the public menu themes, the menu splash and the QR generator's canvas
// use Space Grotesk now, so it is not preloaded on every page.
// Space Grotesk 600 is unused (Stage 27 §38.103); Google Fonts has no italic
// for it, so italic headings are synthetic (Stage 32 §38.112).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-space-grotesk',
});

// Turkish ğ / ş / İ live in latin-ext; with 'latin' alone they fell back to
// the system font on every page.
// Inter 900 has no callsite (CSS Performance §38.60); 800 stays for the menu
// splash and decorative numbers.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

// Mono is only used for small eyebrows / numbers — never the LCP text — so
// it isn't preloaded on every page (it still loads, just not with priority).
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-jetbrains-mono',
});

// Owner + admin panels ("Pano" design system, docs/design/DASHBOARD_DESIGN.md):
// Plus Jakarta Sans (OFL), variable 200–800. The panel scope (`pano.css`)
// points --font-body / --font-heading at it; no other surface uses it, so it
// is not preloaded.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: false,
  variable: '--font-jakarta',
});

export const rootFontClassName = `${clashDisplay.variable} ${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable} ${jakarta.variable}`;
export const rootBodyFontClassName = inter.className;
