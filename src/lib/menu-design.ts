// Public menu design — presets, knobs and the pure resolver
// (menu-design-final.md §3–§7).
//
// What owners store (restaurants.menu_theme + restaurants.menu_design JSON +
// menu_accent_color + a cover) is turned here into ONE object: the effective
// preset, the knob values, the AA-safe colour roles and a closed set of CSS
// custom properties (`style`) — the only design data the public menu writes
// into the DOM. Every value comes from the enum tables below or from the
// normalised `#RRGGBB` output of the contrast resolver (menu-palette.ts), so
// owner input can never inject CSS.
//
// Client-safe and pure: no zod (that lives in menu-design-schema.ts, server
// only), no React, no next/font, no Prisma, no Date / randomness / locale
// calls — the server render and hydration always agree.
//
// Fonts: menus use OFL Google fonts only (CLAUDE.md §11). The stacks below are
// plain strings; the faces are loaded by src/components/menu/menu-fonts.ts.
// Clash Display (licence forbids it for customers' content) and the site-wide
// --font-heading must never appear in a stack.

import { MENU_THEMES, type MenuBadge, type MenuTheme } from '@/lib/validations';
import { normaliseHex } from '@/lib/qr-colors';
import { resolveAccentRoles, type MenuScheme, type SurfaceDef } from './menu-palette';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const MENU_DESIGN_VERSION = 1 as const;
export const MENU_TAGLINE_MAX = 80;

export const MENU_PRESETS = [
  'classic', 'modern', 'elegant', 'gastronomy', 'minimal', 'bistro', 'pulse',
  'sokak', 'atelier', 'gallery', 'meyhane', 'noir',
] as const;
export type MenuPresetId = (typeof MENU_PRESETS)[number];

/** Gallery order in the Studio panel (also the roving-focus order). */
export const MENU_PRESET_ORDER: readonly MenuPresetId[] = [
  'classic', 'modern', 'sokak', 'bistro', 'atelier', 'gallery',
  'meyhane', 'elegant', 'gastronomy', 'noir', 'minimal', 'pulse',
];

export const MENU_SURFACES = ['white', 'ivory', 'cream', 'stone', 'sage', 'ink', 'night', 'forest'] as const;
export const MENU_TYPEFACES = ['grotesk', 'soft-serif', 'book-serif', 'display-serif', 'bold-sans', 'classic-serif'] as const;
export const MENU_ITEM_LAYOUTS = ['list', 'grid', 'feature', 'text'] as const;
export const MENU_HEADERS = ['banner', 'centered', 'cover', 'compact'] as const;
export const MENU_NAVS = ['pills', 'underline'] as const;
export const MENU_CARD_STYLES = ['cards', 'rows'] as const;
export const MENU_DENSITIES = ['airy', 'regular', 'compact'] as const;
export const MENU_CORNERS = ['sharp', 'soft', 'round'] as const;
export const MENU_PRICE_STYLES = ['plain', 'accent', 'mono'] as const;
export const MENU_BADGE_STYLES = ['quiet', 'color'] as const;

/** Canonical knob order (also the stored key order). */
export const MENU_KNOB_KEYS = [
  'surface', 'typeface', 'items', 'header', 'nav', 'cardStyle',
  'density', 'corners', 'price', 'badges',
] as const;

export type MenuSurface = (typeof MENU_SURFACES)[number];
export type MenuTypeface = (typeof MENU_TYPEFACES)[number];
export type MenuItemLayout = (typeof MENU_ITEM_LAYOUTS)[number];
export type MenuHeader = (typeof MENU_HEADERS)[number];
export type MenuNav = (typeof MENU_NAVS)[number];
export type MenuCardStyle = (typeof MENU_CARD_STYLES)[number];
export type MenuDensity = (typeof MENU_DENSITIES)[number];
export type MenuCorners = (typeof MENU_CORNERS)[number];
export type MenuPriceStyle = (typeof MENU_PRICE_STYLES)[number];
export type MenuBadgeStyle = (typeof MENU_BADGE_STYLES)[number];
export type MenuKnobKey = (typeof MENU_KNOB_KEYS)[number];

export interface MenuKnobs {
  surface: MenuSurface;
  typeface: MenuTypeface;
  items: MenuItemLayout;
  header: MenuHeader;
  nav: MenuNav;
  cardStyle: MenuCardStyle;
  density: MenuDensity;
  corners: MenuCorners;
  price: MenuPriceStyle;
  badges: MenuBadgeStyle;
}

/** What `restaurants.menu_design` holds (v1). Absent knob = the preset's default. */
export interface MenuDesign extends Partial<MenuKnobs> {
  v: 1;
  preset: MenuPresetId;
  tagline?: string;
}

const KNOB_VALUES: { readonly [K in MenuKnobKey]: readonly MenuKnobs[K][] } = {
  surface: MENU_SURFACES,
  typeface: MENU_TYPEFACES,
  items: MENU_ITEM_LAYOUTS,
  header: MENU_HEADERS,
  nav: MENU_NAVS,
  cardStyle: MENU_CARD_STYLES,
  density: MENU_DENSITIES,
  corners: MENU_CORNERS,
  price: MENU_PRICE_STYLES,
  badges: MENU_BADGE_STYLES,
};

function isKnobValue<K extends MenuKnobKey>(key: K, value: unknown): value is MenuKnobs[K] {
  return typeof value === 'string' && (KNOB_VALUES[key] as readonly string[]).includes(value);
}

function isPresetId(value: unknown): value is MenuPresetId {
  return typeof value === 'string' && (MENU_PRESETS as readonly string[]).includes(value);
}

function clampFamily(menuTheme: string | null | undefined): MenuTheme {
  return typeof menuTheme === 'string' && (MENU_THEMES as readonly string[]).includes(menuTheme)
    ? (menuTheme as MenuTheme)
    : 'classic';
}

const hasOwn = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);

// ─── Surfaces (§3.1) ────────────────────────────────────────────────────────

export interface MenuSurfaceDef extends SurfaceDef {
  labelTr: string;
  labelEn: string;
}

export const SURFACES: Record<MenuSurface, MenuSurfaceDef> = {
  white:  { labelTr: 'Beyaz',       labelEn: 'White',      scheme: 'light', bg: '#FFFFFF', surface: '#FFFFFF', surface2: '#F4F3F1', ink: '#141210', ink2: '#46423D', muted: '#6B665F', rule: '#E7E4DF', ruleStrong: '#8E877E' },
  ivory:  { labelTr: 'Fildişi',     labelEn: 'Ivory',      scheme: 'light', bg: '#FBF8F1', surface: '#FFFDF8', surface2: '#F1ECE1', ink: '#1D1A15', ink2: '#4A443A', muted: '#6B6355', rule: '#E6DFD0', ruleStrong: '#8C8271' },
  cream:  { labelTr: 'Krem',        labelEn: 'Cream',      scheme: 'light', bg: '#F5EEE0', surface: '#FBF7EE', surface2: '#EBE2CF', ink: '#241D14', ink2: '#4C4234', muted: '#675B48', rule: '#DFD3BC', ruleStrong: '#8A7D66' },
  stone:  { labelTr: 'Taş',         labelEn: 'Stone',      scheme: 'light', bg: '#EEECE7', surface: '#F8F7F4', surface2: '#E3E0D9', ink: '#1A1917', ink2: '#44413C', muted: '#625E57', rule: '#D8D4CC', ruleStrong: '#7E796F' },
  sage:   { labelTr: 'Adaçayı',     labelEn: 'Sage',       scheme: 'light', bg: '#EEF2EA', surface: '#F9FBF6', surface2: '#E2E8DC', ink: '#18211A', ink2: '#3F4A41', muted: '#5A665C', rule: '#D5DDCF', ruleStrong: '#77837A' },
  ink:    { labelTr: 'Mürekkep',    labelEn: 'Ink',        scheme: 'dark',  bg: '#0F0E0D', surface: '#181715', surface2: '#23211F', ink: '#F3EFE7', ink2: '#C8C2B7', muted: '#A39D92', rule: '#2E2C29', ruleStrong: '#78726A' },
  night:  { labelTr: 'Gece mavisi', labelEn: 'Night blue', scheme: 'dark',  bg: '#0C1220', surface: '#131A2A', surface2: '#1B2436', ink: '#EFF2F7', ink2: '#C2C9D5', muted: '#9AA3B4', rule: '#253049', ruleStrong: '#67738C' },
  forest: { labelTr: 'Orman',       labelEn: 'Forest',     scheme: 'dark',  bg: '#0D1A15', surface: '#13241D', surface2: '#1A2E26', ink: '#EEF3EC', ink2: '#C3CFC6', muted: '#9AAAA0', rule: '#24392F', ruleStrong: '#62786C' },
};

// ─── Typefaces (§3.2) ───────────────────────────────────────────────────────

const SANS = "var(--font-inter, system-ui), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
/** Price style "mono" (also a whitelisted stack literal). */
export const MENU_MONO_STACK = 'var(--font-jetbrains-mono, ui-monospace), ui-monospace, SFMono-Regular, Menlo, monospace';
export const MENU_SANS_STACK = SANS;

interface Size { fs: number; lh: number }

export interface TypefaceDef {
  labelTr: string;
  labelEn: string;
  /** Human name of the display family (Studio cards). */
  family: string;
  /** Display face stack: masthead, section titles and item names. */
  display: string;
  /** Body face stack: descriptions, prices, meta. */
  body: string;
  /** True when the display family ships real italic files (catdesc + tagline italic). */
  italic: boolean;
  displaySize: Size & { fsLg: number; lhLg: number; weight: number; track: number };
  /** Banner / compact masthead name. */
  name: Size & { fsLg: number; lhLg: number };
  section: Size & { weight: number };
  item: Size & { weight: number; track: number };
  itemGrid: Size;
  itemFeature: Size;
  desc: Size;
  price: Size & { weight: number };
  /** Category description + tagline. */
  catdesc: Size & { face: 'display' | 'body'; italic: boolean };
}

export const TYPEFACES: Record<MenuTypeface, TypefaceDef> = {
  grotesk: {
    labelTr: 'Çağdaş', labelEn: 'Contemporary', family: 'Space Grotesk',
    display: 'var(--font-space-grotesk, var(--font-inter, system-ui)), ' + SANS,
    body: SANS, italic: false,
    displaySize: { fs: 34, lh: 38, fsLg: 48, lhLg: 52, weight: 500, track: -0.025 },
    name: { fs: 28, lh: 32, fsLg: 36, lhLg: 40 },
    section: { fs: 22, lh: 28, weight: 500 },
    item: { fs: 16, lh: 22, weight: 500, track: -0.01 },
    itemGrid: { fs: 15, lh: 20 }, itemFeature: { fs: 20, lh: 24 },
    desc: { fs: 14, lh: 21 }, price: { fs: 16, lh: 22, weight: 600 },
    catdesc: { fs: 14, lh: 21, face: 'body', italic: false },
  },
  'soft-serif': {
    labelTr: 'Sıcak', labelEn: 'Warm', family: 'Fraunces',
    display: 'var(--font-m-fraunces, Georgia), ' + SERIF,
    body: SANS, italic: true,
    displaySize: { fs: 40, lh: 44, fsLg: 60, lhLg: 62, weight: 450, track: -0.02 },
    name: { fs: 30, lh: 34, fsLg: 40, lhLg: 44 },
    section: { fs: 28, lh: 32, weight: 500 },
    item: { fs: 18, lh: 23, weight: 500, track: 0 },
    itemGrid: { fs: 17, lh: 21 }, itemFeature: { fs: 22, lh: 26 },
    desc: { fs: 14, lh: 21 }, price: { fs: 16, lh: 22, weight: 600 },
    catdesc: { fs: 15, lh: 22, face: 'display', italic: true },
  },
  'book-serif': {
    labelTr: 'Zarif', labelEn: 'Refined', family: 'Newsreader',
    display: 'var(--font-m-newsreader, Georgia), ' + SERIF,
    body: 'var(--font-m-newsreader, Georgia), ' + SERIF, italic: true,
    displaySize: { fs: 40, lh: 44, fsLg: 58, lhLg: 60, weight: 400, track: -0.015 },
    name: { fs: 30, lh: 34, fsLg: 40, lhLg: 44 },
    section: { fs: 28, lh: 32, weight: 500 },
    item: { fs: 18, lh: 23, weight: 500, track: 0 },
    itemGrid: { fs: 17, lh: 21 }, itemFeature: { fs: 22, lh: 26 },
    desc: { fs: 15, lh: 22 }, price: { fs: 17, lh: 22, weight: 500 },
    catdesc: { fs: 16, lh: 23, face: 'display', italic: true },
  },
  'display-serif': {
    labelTr: 'Dergi', labelEn: 'Magazine', family: 'Instrument Serif',
    display: 'var(--font-m-instrument, Georgia), ' + SERIF,
    body: SANS, italic: true,
    displaySize: { fs: 46, lh: 46, fsLg: 68, lhLg: 66, weight: 400, track: -0.01 },
    name: { fs: 34, lh: 36, fsLg: 44, lhLg: 46 },
    section: { fs: 32, lh: 34, weight: 400 },
    item: { fs: 21, lh: 24, weight: 400, track: 0 },
    itemGrid: { fs: 19, lh: 22 }, itemFeature: { fs: 26, lh: 28 },
    desc: { fs: 14, lh: 21 }, price: { fs: 16, lh: 22, weight: 500 },
    catdesc: { fs: 17, lh: 22, face: 'display', italic: true },
  },
  'bold-sans': {
    labelTr: 'Güçlü', labelEn: 'Bold', family: 'Bricolage Grotesque',
    display: 'var(--font-m-bricolage, var(--font-space-grotesk, system-ui)), ' + SANS,
    body: SANS, italic: false,
    displaySize: { fs: 36, lh: 38, fsLg: 52, lhLg: 54, weight: 700, track: -0.03 },
    name: { fs: 28, lh: 32, fsLg: 38, lhLg: 40 },
    section: { fs: 24, lh: 28, weight: 650 },
    item: { fs: 17, lh: 22, weight: 600, track: -0.01 },
    itemGrid: { fs: 16, lh: 20 }, itemFeature: { fs: 21, lh: 25 },
    desc: { fs: 14, lh: 21 }, price: { fs: 16, lh: 22, weight: 700 },
    catdesc: { fs: 14, lh: 21, face: 'body', italic: false },
  },
  'classic-serif': {
    labelTr: 'Klasik serif', labelEn: 'Classic serif', family: 'Playfair Display',
    display: 'var(--font-m-playfair, Georgia), ' + SERIF,
    body: SANS, italic: true,
    displaySize: { fs: 38, lh: 42, fsLg: 56, lhLg: 58, weight: 600, track: -0.01 },
    name: { fs: 30, lh: 34, fsLg: 40, lhLg: 44 },
    section: { fs: 26, lh: 30, weight: 600 },
    item: { fs: 18, lh: 23, weight: 500, track: 0 },
    itemGrid: { fs: 17, lh: 21 }, itemFeature: { fs: 22, lh: 26 },
    desc: { fs: 14, lh: 21 }, price: { fs: 16, lh: 22, weight: 600 },
    catdesc: { fs: 15, lh: 22, face: 'display', italic: true },
  },
};

/** Every font stack literal the resolver may write into `style` (tests whitelist these). */
export const MENU_FONT_STACKS: readonly string[] = Array.from(
  new Set([SANS, MENU_MONO_STACK, ...MENU_TYPEFACES.flatMap((k) => [TYPEFACES[k].display, TYPEFACES[k].body])]),
);

// ─── Density + corners (§3.3, §3.4) ─────────────────────────────────────────

export interface DensityDef {
  labelTr: string;
  labelEn: string;
  rowPy: number;
  sectionGap: number;
  thumb: number;
  gridGap: number;
  clamp: number;
  mastheadPt: number;
  mastheadPb: number;
}

export const DENSITIES: Record<MenuDensity, DensityDef> = {
  airy:    { labelTr: 'Ferah',   labelEn: 'Airy',    rowPy: 22, sectionGap: 72, thumb: 96, gridGap: 16, clamp: 3, mastheadPt: 64, mastheadPb: 48 },
  regular: { labelTr: 'Dengeli', labelEn: 'Regular', rowPy: 18, sectionGap: 56, thumb: 84, gridGap: 12, clamp: 2, mastheadPt: 48, mastheadPb: 36 },
  compact: { labelTr: 'Sıkı',    labelEn: 'Compact', rowPy: 12, sectionGap: 40, thumb: 64, gridGap: 10, clamp: 2, mastheadPt: 32, mastheadPb: 24 },
};

export interface CornersDef {
  labelTr: string;
  labelEn: string;
  img: number;
  card: number;
  pill: number;
  sheet: number;
}

export const CORNERS: Record<MenuCorners, CornersDef> = {
  sharp: { labelTr: 'Keskin',   labelEn: 'Sharp', img: 2,  card: 4,  pill: 6,   sheet: 12 },
  soft:  { labelTr: 'Yumuşak',  labelEn: 'Soft',  img: 12, card: 16, pill: 999, sheet: 24 },
  round: { labelTr: 'Yuvarlak', labelEn: 'Round', img: 20, card: 24, pill: 999, sheet: 28 },
};

/** Fixed nav heights (PhonePreview's 64 px follow offset relies on ≤ 56). */
export const MENU_NAV_HEIGHT: Record<MenuNav, number> = { pills: 56, underline: 52 };

// ─── Presets (§4) ───────────────────────────────────────────────────────────

export interface PresetStructure {
  section: 'rule' | 'chapter' | 'numbered' | 'plain';
  thumbShape: 'rounded' | 'circle' | 'arch';
  thumbSide: 'start' | 'end';
  gridAspect: '1/1' | '4/5' | '4/3';
  priceOverlay: boolean;
  bannerTone: 'accent' | 'ink';
  showCount: boolean;
}

export interface PresetDef {
  family: MenuTheme;
  knobs: MenuKnobs;
  structure: PresetStructure;
  /** Offered as a one-tap chip in the Studio, never applied automatically. */
  suggestedAccent: string | null;
}

function preset(
  family: MenuTheme,
  k: [MenuSurface, MenuTypeface, MenuItemLayout, MenuHeader, MenuNav, MenuCardStyle, MenuDensity, MenuCorners, MenuPriceStyle, MenuBadgeStyle],
  structure: PresetStructure,
  suggestedAccent: string | null,
): PresetDef {
  const [surface, typeface, items, header, nav, cardStyle, density, corners, price, badges] = k;
  return {
    family,
    knobs: { surface, typeface, items, header, nav, cardStyle, density, corners, price, badges },
    structure,
    suggestedAccent,
  };
}

export const PRESETS: Record<MenuPresetId, PresetDef> = {
  classic: preset('classic', ['white', 'grotesk', 'list', 'banner', 'pills', 'cards', 'regular', 'soft', 'accent', 'color'],
    { section: 'rule', thumbShape: 'rounded', thumbSide: 'start', gridAspect: '1/1', priceOverlay: false, bannerTone: 'accent', showCount: false }, null),
  modern: preset('modern', ['white', 'grotesk', 'grid', 'compact', 'pills', 'cards', 'regular', 'soft', 'accent', 'color'],
    { section: 'rule', thumbShape: 'rounded', thumbSide: 'end', gridAspect: '1/1', priceOverlay: true, bannerTone: 'accent', showCount: false }, null),
  elegant: preset('elegant', ['ivory', 'book-serif', 'list', 'centered', 'underline', 'rows', 'airy', 'sharp', 'plain', 'quiet'],
    { section: 'chapter', thumbShape: 'rounded', thumbSide: 'end', gridAspect: '4/5', priceOverlay: false, bannerTone: 'accent', showCount: false }, '#1F2937'),
  gastronomy: preset('gastronomy', ['ink', 'display-serif', 'list', 'centered', 'pills', 'rows', 'airy', 'soft', 'accent', 'quiet'],
    { section: 'chapter', thumbShape: 'circle', thumbSide: 'end', gridAspect: '1/1', priceOverlay: false, bannerTone: 'accent', showCount: false }, '#D97706'),
  minimal: preset('minimal', ['white', 'grotesk', 'list', 'compact', 'underline', 'rows', 'compact', 'sharp', 'mono', 'quiet'],
    { section: 'plain', thumbShape: 'rounded', thumbSide: 'end', gridAspect: '1/1', priceOverlay: false, bannerTone: 'accent', showCount: true }, '#0A0A0A'),
  bistro: preset('bistro', ['cream', 'soft-serif', 'grid', 'centered', 'pills', 'cards', 'regular', 'round', 'plain', 'color'],
    { section: 'rule', thumbShape: 'rounded', thumbSide: 'end', gridAspect: '4/3', priceOverlay: false, bannerTone: 'accent', showCount: false }, '#9A3412'),
  pulse: preset('pulse', ['white', 'grotesk', 'list', 'banner', 'pills', 'cards', 'regular', 'soft', 'mono', 'color'],
    { section: 'numbered', thumbShape: 'rounded', thumbSide: 'start', gridAspect: '1/1', priceOverlay: false, bannerTone: 'ink', showCount: false }, '#C6F24E'),
  sokak: preset('modern', ['stone', 'bold-sans', 'feature', 'compact', 'pills', 'cards', 'compact', 'round', 'accent', 'color'],
    { section: 'rule', thumbShape: 'rounded', thumbSide: 'end', gridAspect: '4/3', priceOverlay: true, bannerTone: 'accent', showCount: false }, '#E85A4F'),
  atelier: preset('bistro', ['ivory', 'soft-serif', 'list', 'centered', 'pills', 'rows', 'airy', 'round', 'plain', 'quiet'],
    { section: 'rule', thumbShape: 'arch', thumbSide: 'end', gridAspect: '4/5', priceOverlay: false, bannerTone: 'accent', showCount: false }, '#D97706'),
  gallery: preset('modern', ['white', 'display-serif', 'grid', 'cover', 'underline', 'rows', 'regular', 'soft', 'plain', 'quiet'],
    { section: 'numbered', thumbShape: 'rounded', thumbSide: 'end', gridAspect: '4/5', priceOverlay: false, bannerTone: 'accent', showCount: false }, '#1F2937'),
  meyhane: preset('elegant', ['cream', 'classic-serif', 'text', 'centered', 'underline', 'rows', 'regular', 'sharp', 'plain', 'quiet'],
    { section: 'chapter', thumbShape: 'circle', thumbSide: 'end', gridAspect: '4/3', priceOverlay: false, bannerTone: 'accent', showCount: false }, '#9A3412'),
  noir: preset('gastronomy', ['night', 'book-serif', 'text', 'centered', 'underline', 'rows', 'airy', 'sharp', 'accent', 'quiet'],
    { section: 'numbered', thumbShape: 'circle', thumbSide: 'end', gridAspect: '4/3', priceOverlay: false, bannerTone: 'accent', showCount: false }, '#D97706'),
};

export const MENU_PRESET_LABELS: Record<MenuPresetId, { tr: string; en: string; vibeTr: string; vibeEn: string }> = {
  classic:    { tr: 'Klasik',     en: 'Classic',    vibeTr: 'Restoran · Aile',          vibeEn: 'Restaurant · Family' },
  modern:     { tr: 'Modern',     en: 'Modern',     vibeTr: 'Fast food · Burger',       vibeEn: 'Fast food · Burger' },
  elegant:    { tr: 'Şık',        en: 'Elegant',    vibeTr: 'Fine dining',              vibeEn: 'Fine dining' },
  gastronomy: { tr: 'Gastronomi', en: 'Gastronomy', vibeTr: 'Şef · Bar · Gece',         vibeEn: 'Chef · Bar · Night' },
  minimal:    { tr: 'Minimal',    en: 'Minimal',    vibeTr: 'Cafe · Pastane',           vibeEn: 'Cafe · Bakery' },
  bistro:     { tr: 'Bistro',     en: 'Bistro',     vibeTr: 'Bistro · Kahvaltı',        vibeEn: 'Bistro · Brunch' },
  pulse:      { tr: 'Pulse',      en: 'Pulse',      vibeTr: 'Grafit · Canlı vurgu',     vibeEn: 'Graphite · Vivid accent' },
  sokak:      { tr: 'Sokak',      en: 'Street',     vibeTr: 'Burger · Döner · Pizza',   vibeEn: 'Burger · Döner · Pizza' },
  atelier:    { tr: 'Atölye',     en: 'Atelier',    vibeTr: 'Fırın · Kahve · Tatlı',    vibeEn: 'Bakery · Coffee · Dessert' },
  gallery:    { tr: 'Galeri',     en: 'Gallery',    vibeTr: 'Brunch · Tatlı · Fotoğraflı', vibeEn: 'Brunch · Dessert · Photo-led' },
  meyhane:    { tr: 'Meyhane',    en: 'Tavern',     vibeTr: 'Meze · Rakı · Ocakbaşı',   vibeEn: 'Meze · Grill · Tavern' },
  noir:       { tr: 'Gece',       en: 'Noir',       vibeTr: 'Kokteyl · Şarap · Bar',    vibeEn: 'Cocktails · Wine · Bar' },
};

// ─── Badges (§3.5) ──────────────────────────────────────────────────────────

/** `sef_onerisi` is always the accent chip; these are the other 11 badges. */
export type MenuToneBadge = Exclude<MenuBadge, 'sef_onerisi'>;

/** Style "quiet" (Sade): icon tint per scheme on a neutral chip. */
export const QUIET_BADGE_HUES: Record<MenuToneBadge, { light: string; dark: string }> = {
  populer:    { light: '#A15C07', dark: '#F2B84B' },
  yeni:       { light: '#1D4ED8', dark: '#8DB0FF' },
  vegan:      { light: '#2F7A3A', dark: '#7FCF8C' },
  vegetaryen: { light: '#4D7C0F', dark: '#A8D66A' },
  aci:        { light: '#B42318', dark: '#FF8A7A' },
  glutensiz:  { light: '#8A5A00', dark: '#E3B65A' },
  kahvalti:   { light: '#B4540A', dark: '#F6A85C' },
  organik:    { light: '#166534', dark: '#6FD39A' },
  taze:       { light: '#0E7490', dark: '#67D4EA' },
  sezonluk:   { light: '#6D28D9', dark: '#C4A8FF' },
  ev_yapimi:  { light: '#9F1239', dark: '#F59AB4' },
};

/** Style "color" (Renkli): self-contained chip pairs; dark adds a 30 % `fg` border. */
export const COLOR_BADGE_PAIRS: Record<MenuToneBadge, { light: { bg: string; fg: string }; dark: { bg: string; fg: string; border: string } }> = {
  populer:    { light: { bg: '#FFFBEB', fg: '#92400E' }, dark: { bg: '#2B2110', fg: '#FCD34D', border: '#FCD34D4D' } },
  yeni:       { light: { bg: '#EFF6FF', fg: '#1E40AF' }, dark: { bg: '#14213D', fg: '#93C5FD', border: '#93C5FD4D' } },
  vegan:      { light: { bg: '#F0FDF4', fg: '#166534' }, dark: { bg: '#102A1A', fg: '#86EFAC', border: '#86EFAC4D' } },
  vegetaryen: { light: { bg: '#EAF9B8', fg: '#4D5C00' }, dark: { bg: '#1F2A0E', fg: '#C6F24E', border: '#C6F24E4D' } },
  aci:        { light: { bg: '#FEF2F2', fg: '#991B1B' }, dark: { bg: '#2E1414', fg: '#FCA5A5', border: '#FCA5A54D' } },
  glutensiz:  { light: { bg: '#EAF9B8', fg: '#0A0A0A' }, dark: { bg: '#24300F', fg: '#D9F99D', border: '#D9F99D4D' } },
  kahvalti:   { light: { bg: '#FFEDD5', fg: '#9A3412' }, dark: { bg: '#2E1C0E', fg: '#FDBA74', border: '#FDBA744D' } },
  organik:    { light: { bg: '#ECFDF5', fg: '#14532D' }, dark: { bg: '#0F2A20', fg: '#6EE7B7', border: '#6EE7B74D' } },
  taze:       { light: { bg: '#ECFEFF', fg: '#155E75' }, dark: { bg: '#0E2A30', fg: '#67E8F9', border: '#67E8F94D' } },
  sezonluk:   { light: { bg: '#F5F3FF', fg: '#5B21B6' }, dark: { bg: '#221A3A', fg: '#C4B5FD', border: '#C4B5FD4D' } },
  ev_yapimi:  { light: { bg: '#FEF3C7', fg: '#854D0E' }, dark: { bg: '#2B2310', fg: '#FDE68A', border: '#FDE68A4D' } },
};

// ─── Reading, normalising, comparing ────────────────────────────────────────

/**
 * Owner tagline → safe plain text, or null. NFC, control / format characters
 * and line/paragraph separators become spaces, whitespace collapses, trimmed;
 * empty or longer than MENU_TAGLINE_MAX → null. Rendered as a React text node
 * only (never dangerouslySetInnerHTML, never an attribute other than `title`).
 */
export function sanitizeTagline(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!s || s.length > MENU_TAGLINE_MAX) return null;
  return s;
}

/**
 * Tolerant reader for `restaurants.menu_design`. Never throws:
 * non-object / array / JSON null / `v !== 1` / unknown preset → null; invalid
 * knobs and unknown keys are dropped; the tagline is re-sanitised.
 */
export function readMenuDesign(raw: unknown): MenuDesign | null {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const o = raw as Record<string, unknown>;
    if (o.v !== MENU_DESIGN_VERSION) return null; // a future v2 adds an upgrade branch here
    if (!hasOwn(o, 'preset') || !isPresetId(o.preset)) return null;
    const d: MenuDesign = { v: 1, preset: o.preset };
    for (const key of MENU_KNOB_KEYS) {
      if (hasOwn(o, key) && isKnobValue(key, o[key])) (d as unknown as Record<string, unknown>)[key] = o[key];
    }
    const tagline = hasOwn(o, 'tagline') ? sanitizeTagline(o.tagline) : null;
    if (tagline) d.tagline = tagline;
    return d;
  } catch {
    return null;
  }
}

/** The preset that renders: the design's preset when it belongs to `menuTheme`'s family, else the family's own. */
export function effectivePresetId(menuTheme: string | null | undefined, d: MenuDesign | null): MenuPresetId {
  const family = clampFamily(menuTheme);
  return d && isPresetId(d.preset) && PRESETS[d.preset].family === family ? d.preset : family;
}

/** Only the style knobs present (and valid) in `d`. */
export function styleKnobsOf(d: MenuDesign | null): Partial<MenuKnobs> {
  const out: Partial<MenuKnobs> = {};
  if (!d) return out;
  for (const key of MENU_KNOB_KEYS) {
    const value = d[key];
    if (value !== undefined && isKnobValue(key, value)) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

function canonical(d: MenuDesign): MenuDesign {
  const out: MenuDesign = { v: 1, preset: d.preset };
  const rec = out as unknown as Record<string, unknown>;
  for (const key of MENU_KNOB_KEYS) if (d[key] !== undefined) rec[key] = d[key];
  if (d.tagline !== undefined) out.tagline = d.tagline;
  return out;
}

/**
 * The stored form (client and server use the same function): knobs equal to
 * the preset's default are dropped, the tagline is kept only when non-empty
 * after sanitising, a pure legacy look (`preset === family`, nothing else) is
 * `null` (SQL NULL), and keys come in canonical order.
 */
export function normalizeMenuDesign(family: MenuTheme, d: MenuDesign | null): MenuDesign | null {
  if (!d || !isPresetId(d.preset)) return null;
  const defaults = PRESETS[d.preset].knobs;
  const out: MenuDesign = { v: 1, preset: d.preset };
  const rec = out as unknown as Record<string, unknown>;
  let knobs = 0;
  for (const key of MENU_KNOB_KEYS) {
    const value = d[key];
    if (value === undefined || !isKnobValue(key, value) || value === defaults[key]) continue;
    rec[key] = value;
    knobs += 1;
  }
  const tagline = sanitizeTagline(d.tagline);
  if (tagline) out.tagline = tagline;
  if (d.preset === family && knobs === 0 && !tagline) return null;
  return out;
}

/** Order-independent identity of a design (`'null'` for none). */
export function designKey(d: MenuDesign | null): string {
  return d ? JSON.stringify(canonical(d)) : 'null';
}

/** Number of style knobs present (the admin summary line). */
export function countOverrides(d: MenuDesign | null): number {
  return Object.keys(styleKnobsOf(d)).length;
}

// ─── Resolver (§5.2, §7.4) ──────────────────────────────────────────────────

/** The closed set of custom properties the menu scope may carry. */
export type MenuStyleVar =
  // fonts (MenuFontScope contract)
  | '--font-heading' | '--font-menu-heading'
  | '--m-font-body' | '--m-font-item' | '--m-font-price' | '--m-font-catdesc' | '--m-catdesc-style'
  | '--m-fw-display' | '--m-fw-section' | '--m-fw-item' | '--m-fw-price'
  | '--m-fs-display' | '--m-lh-display' | '--m-fs-display-lg' | '--m-lh-display-lg' | '--m-track-display'
  | '--m-fs-name' | '--m-lh-name' | '--m-fs-name-lg' | '--m-lh-name-lg'
  | '--m-fs-section' | '--m-lh-section' | '--m-fs-item' | '--m-lh-item'
  | '--m-fs-item-grid' | '--m-lh-item-grid' | '--m-fs-item-feature' | '--m-lh-item-feature' | '--m-track-item'
  | '--m-fs-desc' | '--m-lh-desc' | '--m-fs-catdesc' | '--m-lh-catdesc' | '--m-fs-price' | '--m-lh-price'
  // colours
  | '--m-bg' | '--m-surface' | '--m-surface-2' | '--m-ink' | '--m-ink-2' | '--m-muted' | '--m-rule' | '--m-rule-strong'
  | '--m-accent-text' | '--m-accent-ui' | '--m-accent-fill' | '--m-on-accent' | '--m-accent-edge'
  | '--m-accent-soft' | '--m-on-accent-soft' | '--m-accent-mark'
  | '--m-banner' | '--m-banner-end' | '--m-on-banner' | '--m-glow' | '--m-focus'
  // shape + rhythm
  | '--m-row-py' | '--m-section-gap' | '--m-thumb' | '--m-grid-gap' | '--m-clamp'
  | '--m-masthead-pt' | '--m-masthead-pb' | '--m-nav-h'
  | '--m-r-img' | '--m-r-thumb' | '--m-r-card' | '--m-r-pill' | '--m-r-sheet';

export type MenuScopeStyle = { [K in MenuStyleVar]: string } & { colorScheme: MenuScheme };

/**
 * Every `style` value matches this, or is one of `MENU_FONT_STACKS`. No value
 * can contain `;`, braces, angle brackets, `url(` or `expression`.
 */
export const STYLE_VALUE_RE =
  /^(#[0-9A-F]{6}|-?\d+(\.\d+)?(px|em)?|\d+px \d+px \d+px \d+px|999px 999px \d+px \d+px|normal|italic|light|dark|var\(--[a-z0-9-]+\))$/;

export interface MenuColors {
  bg: string; surface: string; surface2: string; ink: string; ink2: string; muted: string; rule: string; ruleStrong: string;
  accent: string; accentText: string; accentUi: string; accentFill: string; onAccent: string; accentEdge: string;
  accentSoft: string; onAccentSoft: string; accentMark: string;
  banner: string; bannerEnd: string; onBanner: string; glow: string; focus: string;
}

export interface ResolvedMenuDesign {
  presetId: MenuPresetId;
  family: MenuTheme;
  scheme: MenuScheme;
  /** Effective knobs (preset defaults + owner overrides). */
  knobs: MenuKnobs;
  /** `header` is effective here: `cover` without a cover photo renders `centered`. */
  structure: PresetStructure & { header: MenuHeader };
  tagline: string | null;
  typeface: TypefaceDef;
  colors: MenuColors;
  adjusted: { text: boolean; ui: boolean; fill: boolean; banner: boolean };
  /** `<meta name="theme-color">`: the banner when the masthead is a banner, else the page. */
  themeColor: string;
  /** The ONLY design object written into the DOM (scope `style`). */
  style: MenuScopeStyle;
}

export const DEFAULT_MENU_ACCENT = '#1A73E8';

const px = (n: number) => `${n}px`;
const em = (n: number) => `${n}em`;
const num = (n: number) => String(n);

/**
 * Resolve everything the public menu needs from the stored row. Pure and
 * deterministic: the same input always yields a deep-equal result.
 */
export function resolveMenuDesign(input: {
  menuTheme: string | null | undefined;
  menuAccentColor: string | null | undefined;
  primaryColor: string | null | undefined;
  menuDesign: unknown;
  hasCover: boolean;
}): ResolvedMenuDesign {
  const family = clampFamily(input.menuTheme);
  const design = readMenuDesign(input.menuDesign);
  const presetId = effectivePresetId(family, design);
  const presetDef = PRESETS[presetId];
  const knobs: MenuKnobs = { ...presetDef.knobs, ...styleKnobsOf(design) };
  const tagline = design?.tagline ?? null;
  const accent =
    normaliseHex(typeof input.menuAccentColor === 'string' ? input.menuAccentColor : '') ??
    normaliseHex(typeof input.primaryColor === 'string' ? input.primaryColor : '') ??
    DEFAULT_MENU_ACCENT;
  const header: MenuHeader = knobs.header === 'cover' && !input.hasCover ? 'centered' : knobs.header;
  const structure = { ...presetDef.structure, header };

  const surface = SURFACES[knobs.surface];
  const roles = resolveAccentRoles(accent, surface, structure.bannerTone);
  const colors: MenuColors = {
    bg: surface.bg, surface: surface.surface, surface2: surface.surface2, ink: surface.ink, ink2: surface.ink2,
    muted: surface.muted, rule: surface.rule, ruleStrong: surface.ruleStrong,
    accent,
    accentText: roles.accentText, accentUi: roles.accentUi, accentFill: roles.accentFill, onAccent: roles.onAccent,
    accentEdge: roles.accentEdge, accentSoft: roles.accentSoft, onAccentSoft: roles.onAccentSoft, accentMark: roles.accentMark,
    banner: roles.banner, bannerEnd: roles.bannerEnd, onBanner: roles.onBanner, glow: roles.glow, focus: roles.focus,
  };

  const tf = TYPEFACES[knobs.typeface];
  const dn = DENSITIES[knobs.density];
  const cr = CORNERS[knobs.corners];
  const mono = knobs.price === 'mono';
  const thumbRadius =
    structure.thumbShape === 'circle'
      ? '999px'
      : structure.thumbShape === 'arch'
        ? `999px 999px ${cr.img}px ${cr.img}px`
        : px(cr.img);

  const style: MenuScopeStyle = {
    '--font-heading': 'var(--font-menu-heading)',
    '--font-menu-heading': tf.display,
    '--m-font-body': tf.body,
    '--m-font-item': tf.display,
    '--m-font-price': mono ? MENU_MONO_STACK : tf.body,
    '--m-font-catdesc': tf.catdesc.face === 'display' ? tf.display : tf.body,
    '--m-catdesc-style': tf.catdesc.italic ? 'italic' : 'normal',
    '--m-fw-display': num(tf.displaySize.weight),
    '--m-fw-section': num(tf.section.weight),
    '--m-fw-item': num(tf.item.weight),
    '--m-fw-price': num(mono ? 500 : tf.price.weight),
    '--m-fs-display': px(tf.displaySize.fs),
    '--m-lh-display': px(tf.displaySize.lh),
    '--m-fs-display-lg': px(tf.displaySize.fsLg),
    '--m-lh-display-lg': px(tf.displaySize.lhLg),
    '--m-track-display': em(tf.displaySize.track),
    '--m-fs-name': px(tf.name.fs),
    '--m-lh-name': px(tf.name.lh),
    '--m-fs-name-lg': px(tf.name.fsLg),
    '--m-lh-name-lg': px(tf.name.lhLg),
    '--m-fs-section': px(tf.section.fs),
    '--m-lh-section': px(tf.section.lh),
    '--m-fs-item': px(tf.item.fs),
    '--m-lh-item': px(tf.item.lh),
    '--m-fs-item-grid': px(tf.itemGrid.fs),
    '--m-lh-item-grid': px(tf.itemGrid.lh),
    '--m-fs-item-feature': px(tf.itemFeature.fs),
    '--m-lh-item-feature': px(tf.itemFeature.lh),
    '--m-track-item': em(tf.item.track),
    '--m-fs-desc': px(tf.desc.fs),
    '--m-lh-desc': px(tf.desc.lh),
    '--m-fs-catdesc': px(tf.catdesc.fs),
    '--m-lh-catdesc': px(tf.catdesc.lh),
    '--m-fs-price': px(mono ? 15 : tf.price.fs),
    '--m-lh-price': px(mono ? 22 : tf.price.lh),

    '--m-bg': colors.bg,
    '--m-surface': colors.surface,
    '--m-surface-2': colors.surface2,
    '--m-ink': colors.ink,
    '--m-ink-2': colors.ink2,
    '--m-muted': colors.muted,
    '--m-rule': colors.rule,
    '--m-rule-strong': colors.ruleStrong,
    '--m-accent-text': colors.accentText,
    '--m-accent-ui': colors.accentUi,
    '--m-accent-fill': colors.accentFill,
    '--m-on-accent': colors.onAccent,
    '--m-accent-edge': colors.accentEdge,
    '--m-accent-soft': colors.accentSoft,
    '--m-on-accent-soft': colors.onAccentSoft,
    '--m-accent-mark': colors.accentMark,
    '--m-banner': colors.banner,
    '--m-banner-end': colors.bannerEnd,
    '--m-on-banner': colors.onBanner,
    '--m-glow': colors.glow,
    '--m-focus': colors.focus,

    '--m-row-py': px(dn.rowPy),
    '--m-section-gap': px(dn.sectionGap),
    '--m-thumb': px(dn.thumb),
    '--m-grid-gap': px(dn.gridGap),
    '--m-clamp': num(dn.clamp),
    '--m-masthead-pt': px(dn.mastheadPt),
    '--m-masthead-pb': px(dn.mastheadPb),
    '--m-nav-h': px(MENU_NAV_HEIGHT[knobs.nav]),
    '--m-r-img': px(cr.img),
    '--m-r-thumb': thumbRadius,
    '--m-r-card': px(cr.card),
    '--m-r-pill': px(cr.pill),
    '--m-r-sheet': px(cr.sheet),
    colorScheme: surface.scheme,
  };

  return {
    presetId,
    family,
    scheme: surface.scheme,
    knobs,
    structure,
    tagline,
    typeface: tf,
    colors,
    adjusted: roles.adjusted,
    themeColor: header === 'banner' ? colors.banner : colors.bg,
    style,
  };
}
