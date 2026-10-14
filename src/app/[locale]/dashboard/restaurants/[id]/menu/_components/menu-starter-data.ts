import type { SectorKey } from '@/lib/sector-platforms';

// Quick-start category presets so a new owner doesn't stare at an empty list.
// Picking one POSTs ~6 categories with sensible Turkish names; the user can
// rename / delete after. English mirror is included for the EN locale.
export type StarterPreset = {
  id: 'restaurant' | 'cafe' | 'fastfood' | 'bakery' | 'bar' | 'hotel' | 'winebar' | 'foodtruck' | 'catering';
  tr: { label: string; hint: string; categories: string[] };
  en: { label: string; hint: string; categories: string[] };
};
export const STARTER_PRESETS: StarterPreset[] = [
  {
    id: 'restaurant',
    tr: {
      label: 'Restoran',
      hint: 'Klasik yemek menüsü',
      categories: ['Başlangıçlar', 'Çorbalar', 'Salatalar', 'Ana Yemekler', 'Tatlılar', 'İçecekler'],
    },
    en: {
      label: 'Restaurant',
      hint: 'Classic dining menu',
      categories: ['Starters', 'Soups', 'Salads', 'Mains', 'Desserts', 'Beverages'],
    },
  },
  {
    id: 'cafe',
    tr: {
      label: 'Cafe',
      hint: 'Kahve, çay, tatlı',
      categories: ['Kahveler', 'Sıcak İçecekler', 'Soğuk İçecekler', 'Atıştırmalıklar', 'Tatlılar', 'Kahvaltı'],
    },
    en: {
      label: 'Cafe',
      hint: 'Coffee, tea, treats',
      categories: ['Coffee', 'Hot Drinks', 'Cold Drinks', 'Snacks', 'Desserts', 'Breakfast'],
    },
  },
  {
    id: 'fastfood',
    tr: {
      label: 'Fast Food',
      hint: 'Burger, pizza, döner',
      categories: ['Burgerler', 'Pizzalar', 'Tavuk', 'Wraplar', 'Yan Ürünler', 'İçecekler'],
    },
    en: {
      label: 'Fast Food',
      hint: 'Burger, pizza, wraps',
      categories: ['Burgers', 'Pizzas', 'Chicken', 'Wraps', 'Sides', 'Beverages'],
    },
  },
  {
    id: 'bakery',
    tr: {
      label: 'Pastane',
      hint: 'Hamur işi & tatlı',
      categories: ['Pastalar', 'Kurabiyeler', 'Tuzlular', 'Ekmek', 'Sıcak İçecekler', 'Soğuk İçecekler'],
    },
    en: {
      label: 'Bakery',
      hint: 'Pastry & dessert',
      categories: ['Cakes', 'Cookies', 'Savory', 'Bread', 'Hot Drinks', 'Cold Drinks'],
    },
  },
  {
    id: 'bar',
    tr: {
      label: 'Bar',
      hint: 'Kokteyl & meze',
      categories: ['Kokteyller', 'Şaraplar', 'Biralar', 'Mezeler', 'Atıştırmalıklar', 'Alkolsüzler'],
    },
    en: {
      label: 'Bar',
      hint: 'Cocktails & snacks',
      categories: ['Cocktails', 'Wines', 'Beers', 'Mezze', 'Snacks', 'Soft Drinks'],
    },
  },
  {
    id: 'hotel',
    tr: {
      label: 'Otel · Oda Servisi',
      hint: '24 saat oda menüsü',
      categories: ['Kahvaltı', 'Sandviçler', 'Ana Yemekler', 'Tatlılar', 'İçecekler', 'Gece Menüsü'],
    },
    en: {
      label: 'Hotel · Room Service',
      hint: '24-hour in-room menu',
      categories: ['Breakfast', 'Sandwiches', 'Mains', 'Desserts', 'Beverages', 'Late Night'],
    },
  },
  {
    id: 'winebar',
    tr: {
      label: 'Şarap Bar',
      hint: 'Şarap, peynir, kuru meze',
      categories: ['Beyaz Şaraplar', 'Kırmızı Şaraplar', 'Köpüklü', 'Peynir Tabağı', 'Şarküteri', 'Bar Atıştırmalıkları'],
    },
    en: {
      label: 'Wine Bar',
      hint: 'Wine, cheese, charcuterie',
      categories: ['White Wines', 'Red Wines', 'Sparkling', 'Cheese Board', 'Charcuterie', 'Bar Bites'],
    },
  },
  {
    id: 'foodtruck',
    tr: {
      label: 'Food Truck',
      hint: 'Mobil servis, kısa menü',
      categories: ['İmza Tabaklar', 'Tacolar / Wraplar', 'Patates Çeşitleri', 'Soslar', 'İçecekler'],
    },
    en: {
      label: 'Food Truck',
      hint: 'Street menu, short list',
      categories: ['Signatures', 'Tacos / Wraps', 'Fries & Sides', 'Sauces', 'Drinks'],
    },
  },
  {
    id: 'catering',
    tr: {
      label: 'Catering',
      hint: 'Etkinlik & toplu sipariş',
      categories: ['Açık Büfe', 'Soğuk Tabaklar', 'Sıcak Tabaklar', 'Kanepeler', 'Tatlı Standı', 'Servis İçecekleri'],
    },
    en: {
      label: 'Catering',
      hint: 'Events & bulk orders',
      categories: ['Buffet', 'Cold Plates', 'Hot Plates', 'Canapés', 'Dessert Station', 'Drink Service'],
    },
  },
];

/** How many presets are shown up front; the rest sit behind "More templates". */
export const STARTER_FEATURED_COUNT = 4;

// Which presets lead for a business sector (spec 4.3). Everything not listed
// follows in the original order, so no preset is ever lost or repeated.
const FEATURED_BY_SECTOR: Partial<Record<SectorKey, StarterPreset['id'][]>> = {
  food: ['restaurant', 'cafe', 'fastfood', 'bakery'],
  delivery: ['fastfood', 'restaurant', 'foodtruck', 'bakery'],
  hospitality: ['hotel', 'restaurant', 'cafe', 'bar'],
};
const DEFAULT_FEATURED: StarterPreset['id'][] = ['restaurant', 'cafe', 'fastfood', 'bakery'];

/**
 * All presets, best match for the business first. The first
 * `STARTER_FEATURED_COUNT` are the visible suggestions.
 */
export function orderStarterPresets(sector: SectorKey | null | undefined): StarterPreset[] {
  const lead = (sector && FEATURED_BY_SECTOR[sector]) || DEFAULT_FEATURED;
  const byId = new Map(STARTER_PRESETS.map((p) => [p.id, p] as const));
  const head = lead.map((id) => byId.get(id)).filter((p): p is StarterPreset => !!p);
  const headIds = new Set(head.map((p) => p.id));
  return [...head, ...STARTER_PRESETS.filter((p) => !headIds.has(p.id))];
}
