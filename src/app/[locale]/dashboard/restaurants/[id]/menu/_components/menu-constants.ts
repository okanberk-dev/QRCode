import type { MenuAllergen, MenuBadge, MenuTheme } from '@/lib/validations';

export const BADGE_LABELS: Record<MenuBadge, { tr: string; en: string }> = {
  populer: { tr: 'Popüler', en: 'Popular' },
  yeni: { tr: 'Yeni', en: 'New' },
  vegan: { tr: 'Vegan', en: 'Vegan' },
  vegetaryen: { tr: 'Vejetaryen', en: 'Vegetarian' },
  aci: { tr: 'Acı', en: 'Spicy' },
  sef_onerisi: { tr: 'Şef Önerisi', en: "Chef's Pick" },
  glutensiz: { tr: 'Glutensiz', en: 'Gluten-Free' },
  kahvalti: { tr: 'Kahvaltı', en: 'Breakfast' },
  organik: { tr: 'Organik', en: 'Organic' },
  taze: { tr: 'Taze', en: 'Fresh' },
  sezonluk: { tr: 'Sezonluk', en: 'Seasonal' },
  ev_yapimi: { tr: 'Ev Yapımı', en: 'Homemade' },
};

// Inline color hint per badge — consistent with PublicMenuView's BADGE_META so
// the builder previews how a chip will look on the live menu without importing
// the public render module.
export const BADGE_TINTS: Record<MenuBadge, { bg: string; fg: string; border?: string }> = {
  populer:     { bg: '#FFFBEB', fg: '#92400E', border: '#FDE68A' },
  yeni:        { bg: '#EFF6FF', fg: '#1E40AF', border: '#BFDBFE' },
  vegan:       { bg: '#F0FDF4', fg: '#166534', border: '#BBF7D0' },
  vegetaryen:  { bg: '#EAF9B8', fg: '#4D5C00', border: '#D9EE7A' },
  aci:         { bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
  sef_onerisi: { bg: '#0A0A0A', fg: '#C6F24E' },
  glutensiz:   { bg: '#EAF9B8', fg: '#0A0A0A' },
  kahvalti:    { bg: '#FFEDD5', fg: '#9A3412', border: '#FED7AA' },
  organik:     { bg: '#ECFDF5', fg: '#14532D', border: '#A7F3D0' },
  taze:        { bg: '#ECFEFF', fg: '#155E75', border: '#A5F3FC' },
  sezonluk:    { bg: '#F5F3FF', fg: '#5B21B6', border: '#DDD6FE' },
  ev_yapimi:   { bg: '#FEF3C7', fg: '#854D0E', border: '#FDE68A' },
};

// Group badges by intent so the form picker reads as semantic rows instead of
// one wall of pills. Order is meaningful — most-used first.
export const BADGE_GROUPS: { tr: string; en: string; items: MenuBadge[] }[] = [
  { tr: 'Vurgu', en: 'Highlights', items: ['populer', 'yeni', 'sef_onerisi'] },
  { tr: 'Diyet', en: 'Diet', items: ['vegan', 'vegetaryen', 'glutensiz'] },
  { tr: 'Karakter', en: 'Character', items: ['aci', 'kahvalti', 'sezonluk'] },
  { tr: 'Kalite', en: 'Quality', items: ['organik', 'taze', 'ev_yapimi'] },
];

// Allergen labels used in the picker — full TR/EN copy. The public chip uses a
// short 2-letter code (PublicMenuView.ALLERGEN_META.short). Order is the EU
// 1169/2011 disclosure order plus most-frequent-first within groups.
export const ALLERGEN_LABELS: Record<MenuAllergen, { tr: string; en: string }> = {
  gluten:    { tr: 'Gluten',                en: 'Gluten' },
  sut:       { tr: 'Süt / laktoz',          en: 'Milk / lactose' },
  yumurta:   { tr: 'Yumurta',               en: 'Egg' },
  findik:    { tr: 'Sert kabuklu yemiş',    en: 'Tree nut' },
  fistik:    { tr: 'Yer fıstığı',           en: 'Peanut' },
  soya:      { tr: 'Soya',                  en: 'Soy' },
  balik:     { tr: 'Balık',                 en: 'Fish' },
  kabuklu:   { tr: 'Kabuklu deniz ürünü',   en: 'Crustacean' },
  yumusakca: { tr: 'Yumuşakça',             en: 'Mollusc' },
  susam:     { tr: 'Susam',                 en: 'Sesame' },
  hardal:    { tr: 'Hardal',                en: 'Mustard' },
  kereviz:   { tr: 'Kereviz',               en: 'Celery' },
};

export const ALLERGEN_GROUPS: { tr: string; en: string; items: MenuAllergen[] }[] = [
  { tr: 'Tahıl & süt', en: 'Grain & dairy', items: ['gluten', 'sut', 'yumurta'] },
  { tr: 'Yemiş',       en: 'Nuts',          items: ['findik', 'fistik', 'susam'] },
  { tr: 'Deniz',       en: 'Seafood',       items: ['balik', 'kabuklu', 'yumusakca'] },
  { tr: 'Diğer',       en: 'Other',         items: ['soya', 'hardal', 'kereviz'] },
];

// Curated palette covering common venue moods. Grouped visually in the picker
// (lime/warm/dark/herb/floral) so a cafe owner and a fine-dining owner can
// each find a fitting accent without opening the color wheel.
export const THEME_SWATCH_GROUPS: { tr: string; en: string; colors: string[] }[] = [
  { tr: 'Marka', en: 'Brand', colors: ['#C6F24E', '#A8D62E', '#8CB81E'] },
  { tr: 'Sıcak', en: 'Warm', colors: ['#E85A4F', '#D97706', '#F59E0B', '#9A3412'] },
  { tr: 'Koyu', en: 'Dark', colors: ['#0A0A0A', '#1F2937', '#3F3F46'] },
  { tr: 'Bitki', en: 'Herb', colors: ['#0E7C66', '#15803D', '#65A30D'] },
  { tr: 'Soğuk', en: 'Cool', colors: ['#0EA5E9', '#1D4ED8', '#0F766E'] },
  { tr: 'Zarif', en: 'Soft', colors: ['#8B5CF6', '#EC4899', '#BE185D', '#A16207'] },
];

// Hint per theme — small TR/EN copy chip on the card so a brand-new owner can
// pick the layout that fits their venue without opening the public preview.
export const THEME_VIBES: Record<MenuTheme, { tr: string; en: string }> = {
  classic:    { tr: 'Restoran · Aile',         en: 'Restaurant · Family' },
  modern:     { tr: 'Fast food · Burger',      en: 'Fast food · Burger' },
  elegant:    { tr: 'Fine dining',             en: 'Fine dining' },
  gastronomy: { tr: 'Şef · Bar · Gece',        en: 'Chef · Bar · Night' },
  minimal:    { tr: 'Cafe · Pastane',          en: 'Cafe · Bakery' },
  bistro:     { tr: 'Bistro · Kahvaltı',       en: 'Bistro · Brunch' },
  pulse:      { tr: 'Pulse · Marka uyumlu',    en: 'Pulse · Brand-aligned' },
};
