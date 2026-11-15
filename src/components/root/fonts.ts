import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';

// Site fonts (CLAUDE.md §11). Panels add Geist on top (src/lib/panel-fonts.ts).
//
// Space Grotesk 600 is unused (Stage 27 §38.103); Google Fonts has no italic
// for it, so italic headings are synthetic (Stage 32 §38.112).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

// Inter 900 has no callsite (CSS Performance §38.60); 800 stays for the menu
// splash and decorative numbers.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

// Mono is only used for small eyebrows / numbers — never the LCP text — so
// it isn't preloaded on every page (it still loads, just not with priority).
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-jetbrains-mono',
});

export const rootFontClassName = `${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`;
export const rootBodyFontClassName = inter.className;
