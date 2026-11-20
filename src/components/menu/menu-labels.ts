// Public menu labels (menu-design-final §9.3, §12.2): badge + allergen names
// and the guest-facing copy, shared by the cards, the product sheet and the
// splash so the tables live in one place. TR first, EN parity.

import {
  CalendarRange, Droplets, Flame, Heart, Leaf, Sparkles, Sprout, Star, Sun, WheatOff,
  type LucideIcon,
} from 'lucide-react';
import type { MenuAllergen, MenuBadge } from '@/lib/validations';

export type MenuLocale = 'tr' | 'en';

export const BADGE_META: Record<MenuBadge, { tr: string; en: string; icon: LucideIcon }> = {
  sef_onerisi: { tr: 'Şef önerisi', en: "Chef's pick", icon: Star },
  populer:     { tr: 'Popüler',     en: 'Popular',     icon: Star },
  yeni:        { tr: 'Yeni',        en: 'New',         icon: Sparkles },
  vegan:       { tr: 'Vegan',       en: 'Vegan',       icon: Leaf },
  vegetaryen:  { tr: 'Vejetaryen',  en: 'Vegetarian',  icon: Leaf },
  aci:         { tr: 'Acı',         en: 'Spicy',       icon: Flame },
  glutensiz:   { tr: 'Glutensiz',   en: 'Gluten-free', icon: WheatOff },
  kahvalti:    { tr: 'Kahvaltı',    en: 'Breakfast',   icon: Sun },
  organik:     { tr: 'Organik',     en: 'Organic',     icon: Sprout },
  taze:        { tr: 'Taze',        en: 'Fresh',       icon: Droplets },
  sezonluk:    { tr: 'Sezonluk',    en: 'Seasonal',    icon: CalendarRange },
  ev_yapimi:   { tr: 'Ev yapımı',   en: 'Homemade',    icon: Heart },
};

// Allergen names shown on every product card. Guests with an allergy need to
// read these at a glance, so they are plain words (not codes behind a
// hover-only tooltip, which a phone cannot show).
export const ALLERGEN_META: Record<MenuAllergen, { tr: string; en: string }> = {
  gluten:    { tr: 'Gluten',              en: 'Gluten' },
  sut:       { tr: 'Süt / laktoz',        en: 'Milk / lactose' },
  yumurta:   { tr: 'Yumurta',             en: 'Egg' },
  findik:    { tr: 'Sert kabuklu yemiş',  en: 'Tree nut' },
  fistik:    { tr: 'Yer fıstığı',         en: 'Peanut' },
  soya:      { tr: 'Soya',                en: 'Soy' },
  balik:     { tr: 'Balık',               en: 'Fish' },
  kabuklu:   { tr: 'Kabuklu deniz ürünü', en: 'Crustacean' },
  yumusakca: { tr: 'Yumuşakça',           en: 'Mollusc' },
  susam:     { tr: 'Susam',               en: 'Sesame' },
  hardal:    { tr: 'Hardal',              en: 'Mustard' },
  kereviz:   { tr: 'Kereviz',             en: 'Celery' },
};

/** Allergen names on a card before "+N" (the full list is read out and shown in the sheet). */
export const ALLERGEN_VISIBLE_COUNT = 3;

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Only allergens we can name (own-property check: no prototype keys). */
export function knownAllergens(list: readonly string[] | null | undefined): MenuAllergen[] {
  return (Array.isArray(list) ? list : []).filter((a): a is MenuAllergen => typeof a === 'string' && hasOwn(ALLERGEN_META, a));
}

/** Only badges we can render, chef's pick first (it is the one loud chip). */
export function knownBadges(list: readonly string[] | null | undefined): MenuBadge[] {
  const known = (Array.isArray(list) ? list : []).filter((b): b is MenuBadge => typeof b === 'string' && hasOwn(BADGE_META, b));
  const chef = known.filter((b) => b === 'sef_onerisi');
  return [...chef, ...known.filter((b) => b !== 'sef_onerisi')];
}

/**
 * First grapheme of a name, upper-cased for the locale (Turkish dotted İ).
 * A grapheme, not a code point: a flag, a ZWJ emoji or a decomposed "Ç" stays
 * whole (spec §9.6). Falls back to the first code point without Segmenter.
 */
export function monogramOf(name: string, locale: MenuLocale): string {
  const tag = locale === 'tr' ? 'tr-TR' : 'en-US';
  const text = (typeof name === 'string' ? name : '').normalize('NFC').trim();
  if (!text) return '·';
  let first: string | undefined;
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    first = new Intl.Segmenter(tag, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next().value?.segment;
  }
  first ??= Array.from(text)[0];
  return first ? first.toLocaleUpperCase(tag) : '·';
}

export interface MenuCopy {
  skip: string;
  navLabel: string;
  menu: string;
  soldOut: string;
  soldOutSheet: string;
  itemCount: (n: number) => string;
  allergen: string;
  allergenInfo: string;
  allergenDisclaimer: string;
  close: string;
  splash: (name: string) => string;
  emptyTitle: string;
  emptyBody: string;
  footer: string;
  call: string;
}

const COPY: Record<MenuLocale, MenuCopy> = {
  tr: {
    skip: 'Menüye geç',
    navLabel: 'Menü kategorileri',
    menu: 'Menü',
    soldOut: 'Tükendi',
    soldOutSheet: 'Bu ürün şu an tükendi',
    itemCount: (n) => `${n} ürün`,
    allergen: 'Alerjen',
    allergenInfo: 'Alerjen bilgisi',
    allergenDisclaimer: 'Bu ürün listelenen alerjenleri içerir veya çapraz bulaşma riski taşır.',
    close: 'Kapat',
    splash: (name) => `${name} menüsü açılıyor`,
    emptyTitle: 'Bu menüde henüz ürün yok',
    emptyBody: 'İşletme yakında menüsünü paylaşacak.',
    footer: 'Powered by Buaze',
    call: 'Ara',
  },
  en: {
    skip: 'Skip to menu',
    navLabel: 'Menu categories',
    menu: 'Menu',
    soldOut: 'Out of stock',
    soldOutSheet: 'This item is currently out of stock',
    itemCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    allergen: 'Allergens',
    allergenInfo: 'Allergen information',
    allergenDisclaimer: 'This item contains or may have come into contact with the listed allergens.',
    close: 'Close',
    splash: (name) => `Opening ${name}'s menu`,
    emptyTitle: 'No items in this menu yet',
    emptyBody: 'The restaurant will share its menu soon.',
    footer: 'Powered by Buaze',
    call: 'Call',
  },
};

export function menuCopy(locale: MenuLocale): MenuCopy {
  return COPY[locale] ?? COPY.tr;
}
