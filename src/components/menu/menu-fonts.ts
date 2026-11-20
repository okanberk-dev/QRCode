import { Bricolage_Grotesque, Fraunces, Instrument_Serif, Newsreader, Playfair_Display } from 'next/font/google';

// OFL fonts for restaurant menus (customers' content). Clash Display (ITF
// licence) must never be offered here — CLAUDE.md §11. Files download only
// when a menu actually uses the family (preload: false); latin-ext covers
// Turkish ğ/ş/İ. next/font needs literal options: no spreads, no variables.
// Space Grotesk, Inter and JetBrains Mono come from src/components/root/fonts.ts.

// Fraunces and Newsreader: pinned static weights instead of the variable
// font with opsz (menu-design-final §10.3 budget gate: the variable files were
// 274 KB / 450 KB for latin + latin-ext, normal + italic; the cap is 150 KB).
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600'], style: ['normal', 'italic'],
  display: 'swap', preload: false, variable: '--font-m-fraunces',
});
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600'], style: ['normal', 'italic'],
  display: 'swap', preload: false, variable: '--font-m-newsreader',
});
const instrumentSerif = Instrument_Serif({
  subsets: ['latin', 'latin-ext'], weight: '400', style: ['normal', 'italic'],
  display: 'swap', preload: false, variable: '--font-m-instrument',
});
const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'], axes: ['opsz'],
  display: 'swap', preload: false, variable: '--font-m-bricolage',
});
const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'], style: ['normal', 'italic'],
  display: 'swap', preload: false, variable: '--font-m-playfair',
});

/** Class names that define the five `--font-m-*` variables (scope root + Studio samples). */
export const MENU_FONT_VARIABLES =
  `${fraunces.variable} ${newsreader.variable} ${instrumentSerif.variable} ${bricolage.variable} ${playfair.variable}`;
