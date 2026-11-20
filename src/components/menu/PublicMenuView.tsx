'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Clock, MapPin, Phone, Flame, Leaf, Star, Sparkles, WheatOff,
  Sun, Sprout, Heart, CalendarRange, Droplets,
} from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { MenuAllergen, MenuBadge, MenuTheme } from '@/lib/validations';
import type { MenuDesign } from '@/lib/menu-design';
import { useMenuAnalytics, useProductViewTracking } from '@/hooks/useMenuAnalytics';
import ProductDetailModal from './ProductDetailModal';
import MenuSplash from './MenuSplash';

export interface MenuItemView {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  badges: string[];
  allergens?: string[];
  isAvailable: boolean;
  isOutOfStock: boolean;
  sortOrder: number;
}

export interface MenuCategoryView {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  items: MenuItemView[];
}

export interface RestaurantView {
  id: string;
  slug: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  workingHours: string | null;
  primaryColor: string;
  menuTheme: MenuTheme;
  menuAccentColor: string | null;
  menuLogoUrl: string | null;
  /** Stored design (menu-design-final §5); rendered by chunk 2, ignored until then. */
  menuDesign?: MenuDesign | null;
  /** Public cover src (the image route), or null. */
  menuCoverUrl?: string | null;
}

interface PublicMenuViewProps {
  restaurant: RestaurantView;
  categories: MenuCategoryView[];
  locale?: 'tr' | 'en';
  disableAnalytics?: boolean; // true for admin preview mode
}

const BADGE_META: Record<MenuBadge, { tr: string; en: string; icon: typeof Flame; cls: string }> = {
  populer:     { tr: 'Popüler',       en: 'Popular',       icon: Star,     cls: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]' },
  yeni:        { tr: 'Yeni',          en: 'New',           icon: Sparkles, cls: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]' },
  vegan:       { tr: 'Vegan',         en: 'Vegan',         icon: Leaf,     cls: 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]' },
  vegetaryen:  { tr: 'Vejetaryen',    en: 'Vegetarian',    icon: Leaf,     cls: 'bg-[#EAF9B8] text-[#4D5C00] border border-[#D9EE7A]' },
  aci:         { tr: 'Acı',           en: 'Spicy',         icon: Flame,    cls: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' },
  sef_onerisi: { tr: 'Şef Önerisi',   en: "Chef's Pick",   icon: Star,     cls: 'bg-[#0A0A0A] text-[#C6F24E]' },
  glutensiz:   { tr: 'Glutensiz',     en: 'Gluten-Free',   icon: WheatOff, cls: 'bg-[#EAF9B8] text-[#0A0A0A]' },
  kahvalti:    { tr: 'Kahvaltı',      en: 'Breakfast',     icon: Sun,            cls: 'bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]' },
  organik:     { tr: 'Organik',       en: 'Organic',       icon: Sprout,         cls: 'bg-[#ECFDF5] text-[#14532D] border border-[#A7F3D0]' },
  taze:        { tr: 'Taze',          en: 'Fresh',         icon: Droplets,       cls: 'bg-[#ECFEFF] text-[#155E75] border border-[#A5F3FC]' },
  sezonluk:    { tr: 'Sezonluk',      en: 'Seasonal',      icon: CalendarRange,  cls: 'bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]' },
  ev_yapimi:   { tr: 'Ev Yapımı',     en: 'Homemade',      icon: Heart,          cls: 'bg-[#FEF3C7] text-[#854D0E] border border-[#FDE68A]' },
};

// Single source of truth for the badge chip glyph size — keep icon size
// equal to the surrounding text size (10px) so the chip renders crisply.
// If chip text size changes, bump this in lockstep.
const BADGE_ICON_SIZE = 10;

function BadgeChip({ badge, locale }: { badge: string; locale: 'tr' | 'en' }) {
  const meta = BADGE_META[badge as MenuBadge];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}>
      <Icon size={BADGE_ICON_SIZE} strokeWidth={2} />
      {meta[locale]}
    </span>
  );
}

function BadgeChipOnDark({ badge, locale, accent }: { badge: string; locale: 'tr' | 'en'; accent: string }) {
  const meta = BADGE_META[badge as MenuBadge];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/85"
      style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}1A` }}
    >
      <Icon size={BADGE_ICON_SIZE} strokeWidth={2} />
      {meta[locale]}
    </span>
  );
}

// Allergen names shown on every product card. Guests with an allergy need to
// read these at a glance, so they are plain words (not 2-letter codes with a
// hover-only tooltip, which a phone cannot show).
const ALLERGEN_META: Record<MenuAllergen, { tr: string; en: string }> = {
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

// How many allergen names fit on a card before "+N". The full list is in the
// element's `title` and in the product detail sheet.
const ALLERGEN_VISIBLE_COUNT = 3;

// One quiet line under the product: "Alerjen: Gluten, Süt / laktoz, Yumurta +2".
// Deliberately NOT truncated / line-clamped — a clipped "+N" would hide an
// allergen; on a narrow card the line simply wraps.
function AllergenList({
  allergens, locale, dark = false, className = '',
}: {
  allergens: string[] | undefined;
  locale: 'tr' | 'en';
  dark?: boolean;
  className?: string;
}) {
  const known = (allergens ?? []).filter((a): a is MenuAllergen =>
    Object.prototype.hasOwnProperty.call(ALLERGEN_META, a),
  );
  if (known.length === 0) return null;
  const label = locale === 'tr' ? 'Alerjen' : 'Allergens';
  const names = known.map((a) => ALLERGEN_META[a][locale]);
  const hidden = names.length - ALLERGEN_VISIBLE_COUNT;
  return (
    <p
      title={`${label}: ${names.join(', ')}`}
      className={`text-[11px] leading-snug ${dark ? 'text-white/65' : 'text-[#525252]'} ${className}`}
    >
      <span className={`font-semibold ${dark ? 'text-white/85' : 'text-[#0A0A0A]'}`}>{label}:</span>{' '}
      {names.slice(0, ALLERGEN_VISIBLE_COUNT).join(', ')}
      {hidden > 0 ? ` +${hidden}` : ''}
    </p>
  );
}

function Placeholder({ accent }: { accent: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${accent}14, ${accent}26)` }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V11z" opacity="0.3" />
        <path d="M6 13h12M6 17h8" />
      </svg>
    </div>
  );
}

type LayoutProps = {
  restaurant: RestaurantView;
  visibleCategories: MenuCategoryView[];
  activeId: string | null;
  accent: string;
  locale: 'tr' | 'en';
  copy: { emptyTitle: string; emptyBody: string; outOfStock: string; menuOf: string };
  priceLocale: string;
  setProductRef: (productId: string, el: HTMLElement | null) => void;
  onCategoryClick: (categoryId: string) => void;
  onProductClick: (item: MenuItemView, categoryId: string | null) => void;
};

export default function PublicMenuView({ restaurant, categories, locale = 'tr', disableAnalytics }: PublicMenuViewProps) {
  const visibleCategories = useMemo(
    () =>
      (Array.isArray(categories) ? categories : []).filter(
        (c) => c?.isVisible && Array.isArray(c.items) && c.items.some((i) => i?.isAvailable),
      ),
    [categories],
  );
  const [activeId, setActiveId] = useState<string | null>(visibleCategories[0]?.id ?? null);
  const [detailItem, setDetailItem] = useState<MenuItemView | null>(null);
  // QR-sourced visits see a 3-second branded splash. We initialize lazily so
  // SSR -> CSR doesn't flash the splash on non-QR visits.
  const [showSplash, setShowSplash] = useState(false);
  const [splashReady, setSplashReady] = useState(false);

  const analyticsEnabled = !disableAnalytics;
  const analytics = useMenuAnalytics({ slug: restaurant.slug, enabled: analyticsEnabled });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!disableAnalytics && params.get('source') === 'qr') {
      setShowSplash(true);
      // Remove ?source=qr so a refresh doesn't re-trigger the splash.
      params.delete('source');
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState(null, '', url);
    }
    setSplashReady(true);
  }, [disableAnalytics]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    analytics.trackMenuView();
    // Only on mount; the hook dedupes subsequent fires anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsEnabled]);

  const trackedProducts = useMemo(
    () =>
      visibleCategories.flatMap((c) =>
        c.items.filter((i) => i.isAvailable).map((i) => ({ productId: i.id, categoryId: c.id })),
      ),
    [visibleCategories],
  );
  const setProductRef = useProductViewTracking({
    enabled: analyticsEnabled,
    track: analytics.trackProductView,
    products: trackedProducts,
  });

  const onCategoryClick = (categoryId: string) => {
    if (analyticsEnabled) analytics.trackCategoryClick(categoryId);
  };
  const onProductClick = (item: MenuItemView, categoryId: string | null) => {
    setDetailItem(item);
    if (analyticsEnabled) analytics.trackProductClick(item.id, categoryId);
  };

  useEffect(() => {
    if (!visibleCategories.length) return;
    const ids = visibleCategories.map((c) => c.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.catId;
            if (id) setActiveId(id);
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.querySelector(`[data-cat-id="${id}"]`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visibleCategories]);

  const accent = restaurant.menuAccentColor || restaurant.primaryColor;

  const copy = {
    emptyTitle: locale === 'tr' ? 'Bu menüde henüz ürün yok' : 'No items in this menu yet',
    emptyBody: locale === 'tr' ? 'İşletme yakında menüsünü paylaşacak.' : 'The restaurant will share its menu soon.',
    outOfStock: locale === 'tr' ? 'Tükendi' : 'Out of stock',
    menuOf: locale === 'tr' ? 'Menü' : 'Menu',
  };
  const priceLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

  const layoutProps: LayoutProps = {
    restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale,
    setProductRef, onCategoryClick, onProductClick,
  };

  const renderLayout = () => {
    switch (restaurant.menuTheme) {
      case 'modern':     return <ModernLayout {...layoutProps} />;
      case 'elegant':    return <ElegantLayout {...layoutProps} />;
      case 'gastronomy': return <GastronomyLayout {...layoutProps} />;
      case 'minimal':    return <MinimalLayout {...layoutProps} />;
      case 'bistro':     return <BistroLayout {...layoutProps} />;
      case 'pulse':      return <PulseLayout {...layoutProps} />;
      case 'classic':
      default:           return <ClassicLayout {...layoutProps} />;
    }
  };

  if (!splashReady) {
    // Render the layout during SSR. Once mounted, we know whether to overlay the splash.
    return <MenuFontScope>{renderLayout()}</MenuFontScope>;
  }

  if (showSplash) {
    return (
      <MenuFontScope>
        <MenuSplash
          name={restaurant.name}
          accent={accent}
          logoUrl={restaurant.menuLogoUrl}
          onDone={() => setShowSplash(false)}
        />
      </MenuFontScope>
    );
  }

  return (
    <MenuFontScope>
      {renderLayout()}
      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          accent={accent}
          locale={locale}
          onClose={() => setDetailItem(null)}
        />
      )}
    </MenuFontScope>
  );
}

// Restaurant menus are the owner's content, so they keep Space Grotesk: the
// Clash Display license (site heading font, §11) forbids offering it for
// customers' content. Re-pointing --font-heading here also covers the global
// h1–h6 rule. `display: contents` adds no box, so layouts are unchanged.
const MENU_FONT_SCOPE = { '--font-heading': 'var(--font-menu-heading)', display: 'contents' } as CSSProperties;

function MenuFontScope({ children }: { children: ReactNode }) {
  return <div style={MENU_FONT_SCOPE}>{children}</div>;
}

// ──────────────────────────────────────────────────────────────────────────
// Classic (default) — original design

function ClassicLayout({ restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale, setProductRef, onCategoryClick, onProductClick }: LayoutProps) {
  return (
    <div className="min-h-full bg-white">
      {/* Hero — gradient + darker overlay for text contrast, refined depth */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}d9 60%, ${accent}99 100%)` }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
        <div className="relative px-5 pt-12 pb-10 sm:px-8 sm:pt-16 sm:pb-12">
          <div className="mx-auto flex max-w-2xl items-start gap-4 sm:gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-[28px] font-medium shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)] sm:h-20 sm:w-20 sm:text-[36px]"
              style={{ color: accent }}
            >
              {restaurant.menuLogoUrl ? (
                <img src={restaurant.menuLogoUrl} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
              ) : (
                restaurant.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1 text-white">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/80">{restaurant.category}</p>
              <h1 className="mt-1.5 text-[26px] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[34px]">{restaurant.name}</h1>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/70">{copy.menuOf}</p>
            </div>
          </div>
          <RestaurantMeta restaurant={restaurant} variant="light" />
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <>
          <nav className="sticky top-0 z-30 border-b border-[#EDEDED] bg-white/95 backdrop-blur">
            <div className="mx-auto max-w-2xl overflow-x-auto px-3 py-3 no-scrollbar">
              <div className="flex gap-2">
                {visibleCategories.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#cat-${c.id}`}
                      onClick={() => onCategoryClick(c.id)}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all ${
                        isActive ? 'text-white shadow-sm' : 'border border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                      }`}
                      style={isActive ? { backgroundColor: accent } : undefined}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-2xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-24">
                  <div className="mb-5">
                    <h2 className="text-[22px] font-medium leading-tight tracking-[-0.02em] text-[#0A0A0A] sm:text-[26px]">{category.name}</h2>
                    {category.description && (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#525252]">{category.description}</p>
                    )}
                    <div className="mt-3 h-[3px] w-12 rounded-full" style={{ backgroundColor: accent }} />
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        data-pid={item.id}
                        ref={(el) => setProductRef(item.id, el)}
                        onClick={() => onProductClick(item, category.id)}
                        className={`flex cursor-pointer gap-4 rounded-2xl border border-[#EDEDED] bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D4D4D4] hover:shadow-md active:scale-[0.99] sm:p-4 ${
                          item.isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5] sm:h-28 sm:w-28">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                          ) : (
                            <Placeholder accent={accent} />
                          )}
                          {item.isOutOfStock && (
                            <span className="absolute inset-x-0 bottom-0 bg-black/75 py-1 text-center text-[9px] font-medium uppercase tracking-[0.2em] text-white">
                              {copy.outOfStock}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[15px] font-medium leading-tight text-[#0A0A0A]">{item.name}</h3>
                            <span
                              className="shrink-0 text-[15px] font-medium tabular-nums sm:text-base"
                              style={{ color: accent, fontFamily: 'var(--font-mono)' }}
                            >
                              {formatPrice(item.priceCents, item.currency, priceLocale)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-[#525252] sm:text-[13px]">{item.description}</p>
                          )}
                          {item.badges.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.badges.map((b) => (
                                <BadgeChip key={b} badge={b} locale={locale} />
                              ))}
                            </div>
                          )}
                          {item.allergens?.length ? <AllergenList allergens={item.allergens} locale={locale} className="mt-2" /> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
            <Footer />
          </main>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Modern — grid cards with image-forward design, overlay price

function ModernLayout({ restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale, setProductRef, onCategoryClick, onProductClick }: LayoutProps) {
  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-[#EDEDED] bg-white">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[22px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.2)]"
              style={{ backgroundColor: accent }}
            >
              {restaurant.menuLogoUrl ? (
                <img src={restaurant.menuLogoUrl} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
              ) : (
                restaurant.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#737373]">{restaurant.category}</p>
              <h1 className="truncate text-[26px] font-medium leading-tight tracking-[-0.02em] text-[#0A0A0A] sm:text-[30px]">{restaurant.name}</h1>
            </div>
          </div>
          <RestaurantMeta restaurant={restaurant} variant="dark" />
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <>
          <nav className="sticky top-0 z-30 border-b border-[#EDEDED] bg-white/95 backdrop-blur">
            <div className="mx-auto max-w-5xl overflow-x-auto px-3 py-3 no-scrollbar">
              <div className="flex gap-2">
                {visibleCategories.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#cat-${c.id}`}
                      onClick={() => onCategoryClick(c.id)}
                      className="shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all"
                      style={{
                        borderColor: isActive ? accent : '#EDEDED',
                        backgroundColor: isActive ? accent : 'white',
                        color: isActive ? '#fff' : '#525252',
                      }}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6 sm:py-14">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-24">
                  <div className="mb-5 flex items-baseline gap-3">
                    <h2 className="text-[24px] font-medium leading-tight tracking-[-0.02em] text-[#0A0A0A] sm:text-[28px]">{category.name}</h2>
                    <div
                      aria-hidden
                      className="h-px flex-1 self-end"
                      style={{ background: `linear-gradient(to right, ${accent}66, transparent)` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        data-pid={item.id}
                        ref={(el) => setProductRef(item.id, el)}
                        onClick={() => onProductClick(item, category.id)}
                        className={`group cursor-pointer overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[#D4D4D4] hover:shadow-lg active:scale-[0.99] ${
                          item.isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-[#F5F5F5]">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <Placeholder accent={accent} />
                          )}
                          <span
                            className="absolute bottom-2 right-2 rounded-lg px-2.5 py-1 text-[12px] font-medium tabular-nums shadow-[0_4px_12px_-2px_rgba(0,0,0,0.25)] backdrop-blur-md"
                            style={{ backgroundColor: `${accent}f2`, color: '#fff', fontFamily: 'var(--font-mono)' }}
                          >
                            {formatPrice(item.priceCents, item.currency, priceLocale)}
                          </span>
                          {item.isOutOfStock && (
                            <span className="absolute inset-x-0 top-0 bg-black/75 py-1 text-center text-[9px] font-medium uppercase tracking-[0.22em] text-white">
                              {copy.outOfStock}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5 p-3 sm:p-4">
                          <h3 className="text-[13px] font-medium leading-tight text-[#0A0A0A] sm:text-[14px]">{item.name}</h3>
                          {item.description && (
                            <p className="line-clamp-2 text-[11px] leading-relaxed text-[#737373]">{item.description}</p>
                          )}
                          {item.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.badges.map((b) => (
                                <BadgeChip key={b} badge={b} locale={locale} />
                              ))}
                            </div>
                          )}
                          {item.allergens?.length ? <AllergenList allergens={item.allergens} locale={locale} /> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
            <Footer />
          </main>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Elegant — magazine, single column, minimal dividers

function ElegantLayout({ restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale, setProductRef, onCategoryClick, onProductClick }: LayoutProps) {
  return (
    <div className="min-h-full bg-[#FCFBF8]">
      {/* Magazine masthead — quiet, centered, breathing space */}
      <header className="border-b border-[#E7E2D6] bg-[#FCFBF8]">
        <div className="mx-auto max-w-2xl px-6 py-14 text-center sm:py-20">
          {restaurant.menuLogoUrl && (
            <div className="mx-auto mb-5 h-16 w-16 overflow-hidden rounded-full border border-[#E7E2D6] bg-white shadow-[0_8px_20px_-12px_rgba(0,0,0,0.15)] sm:h-20 sm:w-20">
              <img src={restaurant.menuLogoUrl} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
            </div>
          )}
          <p className="text-[9.5px] font-medium uppercase tracking-[0.42em] text-[#8C7E66]">{restaurant.category}</p>
          <h1 className="mt-4 text-[40px] font-medium leading-[0.95] tracking-[-0.025em] text-[#1A1208] sm:text-[56px]">
            {restaurant.name}
          </h1>
          <div className="mx-auto mt-5 h-px w-16 rounded" style={{ backgroundColor: accent }} />
          <p className="mt-5 text-[10px] font-medium uppercase italic tracking-[0.32em] text-[#8C7E66]">{copy.menuOf}</p>
          <div className="mt-7 flex justify-center">
            <RestaurantMeta restaurant={restaurant} variant="dark" centered />
          </div>
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <>
          <nav className="sticky top-0 z-30 border-b border-[#E7E2D6] bg-[#FCFBF8]/95 backdrop-blur">
            <div className="mx-auto max-w-2xl overflow-x-auto px-3 py-3 no-scrollbar">
              <div className="flex justify-center gap-5 sm:gap-6">
                {visibleCategories.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#cat-${c.id}`}
                      onClick={() => onCategoryClick(c.id)}
                      className="shrink-0 border-b-2 px-1 py-2 text-[10px] font-medium uppercase tracking-[0.3em] transition-all"
                      style={{
                        borderColor: isActive ? accent : 'transparent',
                        color: isActive ? '#1A1208' : '#8C7E66',
                      }}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-2xl space-y-16 px-6 py-14 sm:py-20">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-24">
                  <div className="mb-10 text-center">
                    <p className="text-[9px] font-medium uppercase italic tracking-[0.4em] text-[#8C7E66]">— {locale === 'tr' ? 'BÖLÜM' : 'CHAPTER'} —</p>
                    <h2 className="mt-2.5 text-[28px] font-medium leading-tight tracking-[-0.02em] text-[#1A1208] sm:text-[34px]">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="mx-auto mt-3 max-w-md text-[14px] italic leading-relaxed text-[#8C7E66]">{category.description}</p>
                    )}
                    <div className="mx-auto mt-4 h-px w-12 rounded" style={{ backgroundColor: accent }} />
                  </div>
                  <div className="divide-y divide-[#E7E2D6]">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        data-pid={item.id}
                        ref={(el) => setProductRef(item.id, el)}
                        onClick={() => onProductClick(item, category.id)}
                        className={`flex cursor-pointer items-start gap-5 py-6 transition-colors hover:bg-[#F5F0E2]/40 sm:py-7 ${item.isOutOfStock ? 'opacity-60' : ''}`}
                      >
                        {item.imageUrl && (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded sm:h-24 sm:w-24">
                            <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h3 className="text-[18px] font-medium leading-tight tracking-[-0.015em] text-[#1A1208] sm:text-[19px]">{item.name}</h3>
                            <div aria-hidden className="hidden flex-1 border-b border-dotted border-[#8C7E66]/40 sm:block" />
                            <span
                              className="shrink-0 text-[16px] font-medium tabular-nums sm:text-[17px]"
                              style={{ color: accent, fontFamily: 'var(--font-mono)' }}
                            >
                              {formatPrice(item.priceCents, item.currency, priceLocale)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-2 text-[13px] italic leading-relaxed text-[#8C7E66]">{item.description}</p>
                          )}
                          {item.isOutOfStock && (
                            <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.3em] text-[#991B1B]">{copy.outOfStock}</p>
                          )}
                          {item.badges.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {item.badges.map((b) => (
                                <BadgeChip key={b} badge={b} locale={locale} />
                              ))}
                            </div>
                          )}
                          {item.allergens?.length ? <AllergenList allergens={item.allergens} locale={locale} className="mt-2" /> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
            <Footer />
          </main>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Gastronomy — dark theme, gold/accent details, chef-driven

function GastronomyLayout({ restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale, setProductRef, onCategoryClick, onProductClick }: LayoutProps) {
  return (
    <div className="min-h-full bg-[#0A0A0A] text-white">
      {/* Hero — radial glow + sumptuous spacing, chef-driven dark */}
      <header className="relative overflow-hidden border-b border-white/10">
        <div aria-hidden className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 20% 0%, ${accent}55, transparent 55%)` }} />
        <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 80% 100%, ${accent}33, transparent 60%)` }} />
        <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
          {restaurant.menuLogoUrl && (
            <div
              className="mx-auto mb-6 h-20 w-20 overflow-hidden rounded-full p-[2px] shadow-[0_18px_44px_-12px_rgba(0,0,0,0.6)] sm:h-24 sm:w-24"
              style={{ backgroundColor: accent }}
            >
              <div className="h-full w-full overflow-hidden rounded-full bg-[#0A0A0A]">
                <img src={restaurant.menuLogoUrl} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
          <p className="text-[10px] font-medium uppercase tracking-[0.42em]" style={{ color: accent }}>{restaurant.category}</p>
          <h1 className="mt-5 text-[44px] font-medium leading-[0.92] tracking-[-0.025em] sm:text-[68px]">
            {restaurant.name}
          </h1>
          <div className="mx-auto mt-6 h-px w-20 rounded" style={{ backgroundColor: accent }} />
          <p className="mt-5 text-[10px] font-medium uppercase italic tracking-[0.32em] text-white/55">{copy.menuOf}</p>
          <div className="mt-7 flex justify-center">
            <RestaurantMeta restaurant={restaurant} variant="ondark" accent={accent} centered />
          </div>
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <EmptyState copy={copy} dark />
      ) : (
        <>
          <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
            <div className="mx-auto max-w-3xl overflow-x-auto px-3 py-3 no-scrollbar">
              <div className="flex justify-center gap-2">
                {visibleCategories.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#cat-${c.id}`}
                      onClick={() => onCategoryClick(c.id)}
                      className="shrink-0 rounded-full border px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] transition-all"
                      style={{
                        borderColor: isActive ? accent : 'rgba(255,255,255,0.18)',
                        backgroundColor: isActive ? accent : 'transparent',
                        color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-3xl space-y-16 px-6 py-14 sm:py-20">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-24">
                  <div className="mb-10 text-center">
                    <p className="text-[9px] font-medium uppercase tracking-[0.45em]" style={{ color: accent }}>
                      — {locale === 'tr' ? 'BÖLÜM' : 'CHAPTER'} —
                    </p>
                    <h2 className="mt-3 text-[32px] font-medium leading-tight tracking-[-0.02em] sm:text-[42px]">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="mx-auto mt-3 max-w-md text-[14px] italic leading-relaxed text-white/55">{category.description}</p>
                    )}
                  </div>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        data-pid={item.id}
                        ref={(el) => setProductRef(item.id, el)}
                        onClick={() => onProductClick(item, category.id)}
                        className={`group flex cursor-pointer gap-4 rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition-all hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99] sm:p-5 ${
                          item.isOutOfStock ? 'opacity-60' : ''
                        }`}
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
                      >
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-28 sm:w-28">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${accent}1A` }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" aria-hidden>
                                <path d="M12 2v4M8 6h8M6 9c0 2 2 3 6 3s6-1 6-3M6 9v9a2 2 0 002 2h8a2 2 0 002-2V9" />
                              </svg>
                            </div>
                          )}
                          {item.isOutOfStock && (
                            <span className="absolute inset-x-0 bottom-0 bg-black/85 py-1 text-center text-[9px] font-medium uppercase tracking-[0.22em] text-white">
                              {copy.outOfStock}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-[17px] font-medium leading-tight tracking-[-0.015em] text-white sm:text-[19px]">
                              {item.name}
                            </h3>
                            <span
                              className="shrink-0 text-[17px] font-medium tabular-nums sm:text-[19px]"
                              style={{ color: accent, fontFamily: 'var(--font-mono)' }}
                            >
                              {formatPrice(item.priceCents, item.currency, priceLocale)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-white/65">{item.description}</p>
                          )}
                          {item.badges.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {item.badges.map((b) => (
                                <BadgeChipOnDark key={b} badge={b} locale={locale} accent={accent} />
                              ))}
                            </div>
                          )}
                          {item.allergens?.length ? <AllergenList allergens={item.allergens} locale={locale} dark className="mt-2" /> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
            <footer className="pt-6 pb-8 text-center">
              <p className="text-[9px] font-medium uppercase tracking-[0.4em] text-white/45" style={{ fontFamily: 'var(--font-mono)' }}>
                Powered by · Buaze
              </p>
            </footer>
          </main>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Minimal — typography-first, single-column, ultra-clean

function MinimalLayout({ restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale, setProductRef, onCategoryClick, onProductClick }: LayoutProps) {
  return (
    <div className="min-h-full bg-white">
      {/* Typography-first masthead — quiet, single horizontal stripe */}
      <header className="border-b border-[#EDEDED] bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-7 sm:px-8 sm:py-9">
          {restaurant.menuLogoUrl && (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#EDEDED] bg-white shadow-sm">
              <img src={restaurant.menuLogoUrl} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
              {restaurant.category}
            </p>
            <h1 className="truncate text-[22px] font-medium leading-tight tracking-[-0.02em] text-[#0A0A0A] sm:text-[26px]">{restaurant.name}</h1>
          </div>
          <p className="hidden text-[10px] font-medium uppercase tracking-[0.22em] text-[#737373] sm:block" style={{ fontFamily: 'var(--font-mono)' }}>
            {copy.menuOf}
          </p>
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <>
          <nav className="sticky top-0 z-30 border-b border-[#EDEDED] bg-white/95 backdrop-blur">
            <div className="mx-auto max-w-2xl overflow-x-auto px-3 py-3 no-scrollbar">
              <div className="flex gap-5 sm:gap-6">
                {visibleCategories.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#cat-${c.id}`}
                      onClick={() => onCategoryClick(c.id)}
                      className="shrink-0 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] transition-all"
                      style={{
                        color: isActive ? '#0A0A0A' : '#737373',
                        borderBottom: `2px solid ${isActive ? accent : 'transparent'}`,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-2xl space-y-12 px-5 py-10 sm:px-8 sm:py-14">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-20">
                  <div className="mb-4 flex items-baseline gap-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.32em]" style={{ color: accent, fontFamily: 'var(--font-mono)' }}>
                      {category.name}
                    </p>
                    <div className="h-px flex-1" style={{ backgroundColor: `${accent}33` }} aria-hidden />
                    <p className="text-[10px] font-medium tabular-nums text-[#A3A3A3]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {String(items.length).padStart(2, '0')}
                    </p>
                  </div>
                  {category.description && (
                    <p className="mb-5 text-[13px] leading-relaxed text-[#737373]">{category.description}</p>
                  )}
                  <div className="divide-y divide-[#EDEDED]">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        data-pid={item.id}
                        ref={(el) => setProductRef(item.id, el)}
                        onClick={() => onProductClick(item, category.id)}
                        className={`flex cursor-pointer items-center gap-4 py-4 transition-colors hover:bg-[#FAFAFA] ${
                          item.isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        {item.imageUrl && (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F5] sm:h-16 sm:w-16">
                            <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <h3 className="flex-1 truncate text-[15px] font-medium text-[#0A0A0A]">{item.name}</h3>
                            <span
                              className="shrink-0 text-[14px] font-medium tabular-nums text-[#0A0A0A]"
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              {formatPrice(item.priceCents, item.currency, priceLocale)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#737373]">{item.description}</p>
                          )}
                          {item.badges.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.badges.map((b) => (
                                <BadgeChip key={b} badge={b} locale={locale} />
                              ))}
                            </div>
                          )}
                          {item.allergens?.length ? <AllergenList allergens={item.allergens} locale={locale} className="mt-2" /> : null}
                          {item.isOutOfStock && (
                            <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-[#991B1B]">{copy.outOfStock}</p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
            <Footer />
          </main>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Bistro — warm cream palette, grid cards, cafe vibe

function BistroLayout({ restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale, setProductRef, onCategoryClick, onProductClick }: LayoutProps) {
  return (
    <div className="min-h-full" style={{ backgroundColor: '#FAF7F0' }}>
      {/* Warm cream masthead — radial accent glow, terra-cotta tones */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(circle at 80% 20%, ${accent}40, transparent 55%)` }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accent}55, transparent)` }}
        />
        <div className="relative mx-auto flex max-w-3xl items-center gap-5 px-5 pt-12 pb-9 sm:px-8 sm:pt-16 sm:pb-11">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white text-[28px] font-medium shadow-[0_12px_28px_-12px_rgba(122,103,88,0.4)] sm:h-24 sm:w-24 sm:text-[34px]"
            style={{ color: accent }}
          >
            {restaurant.menuLogoUrl ? (
              <img src={restaurant.menuLogoUrl} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
            ) : (
              restaurant.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em]" style={{ color: accent }}>{restaurant.category}</p>
            <h1 className="mt-1.5 truncate text-[26px] font-medium leading-tight tracking-[-0.02em] text-[#2A1E15] sm:text-[32px]">
              {restaurant.name}
            </h1>
            <p className="mt-1.5 text-[10px] font-medium uppercase italic tracking-[0.28em] text-[#7A6758]">{copy.menuOf}</p>
          </div>
        </div>
        <div className="relative mx-auto max-w-3xl px-5 pb-6 sm:px-8">
          <RestaurantMeta restaurant={restaurant} variant="dark" />
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <>
          <nav className="sticky top-0 z-30 border-b border-[#E8E0D2] bg-[#FAF7F0]/95 backdrop-blur">
            <div className="mx-auto max-w-3xl overflow-x-auto px-3 py-3 no-scrollbar">
              <div className="flex gap-2">
                {visibleCategories.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#cat-${c.id}`}
                      onClick={() => onCategoryClick(c.id)}
                      className="shrink-0 rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-all"
                      style={{
                        backgroundColor: isActive ? accent : 'white',
                        color: isActive ? '#fff' : '#7A6758',
                        boxShadow: isActive
                          ? `0 8px 20px -10px ${accent}88`
                          : '0 1px 0 rgba(232,224,210,0.6)',
                      }}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-12">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-24">
                  <div className="mb-5 flex items-end gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[22px] font-medium leading-tight tracking-[-0.02em] text-[#2A1E15] sm:text-[26px]">
                        {category.name}
                      </h2>
                      {category.description && (
                        <p className="mt-1.5 text-[13px] italic leading-relaxed text-[#7A6758]">{category.description}</p>
                      )}
                    </div>
                    <span
                      aria-hidden
                      className="hidden h-px flex-1 self-center sm:block"
                      style={{ background: `linear-gradient(to right, ${accent}55, transparent)` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        data-pid={item.id}
                        ref={(el) => setProductRef(item.id, el)}
                        onClick={() => onProductClick(item, category.id)}
                        className={`group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E8E0D2] transition-all hover:-translate-y-1 hover:ring-[#D4C7B0] hover:shadow-lg active:scale-[0.98] ${
                          item.isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3ECDF]">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <Placeholder accent={accent} />
                          )}
                          {item.isOutOfStock && (
                            <span className="absolute inset-x-0 top-0 bg-black/75 py-1 text-center text-[9px] font-medium uppercase tracking-[0.22em] text-white">
                              {copy.outOfStock}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5 p-3 sm:p-4">
                          <h3 className="line-clamp-2 text-[13px] font-medium leading-tight text-[#2A1E15] sm:text-[14px]">{item.name}</h3>
                          {item.description && (
                            <p className="line-clamp-2 text-[11px] leading-relaxed text-[#7A6758]">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between pt-1.5">
                            <span
                              className="text-[14px] font-medium tabular-nums"
                              style={{ color: accent, fontFamily: 'var(--font-mono)' }}
                            >
                              {formatPrice(item.priceCents, item.currency, priceLocale)}
                            </span>
                            {item.badges.length > 0 && (
                              <BadgeChip badge={item.badges[0]} locale={locale} />
                            )}
                          </div>
                          {item.allergens?.length ? <AllergenList allergens={item.allergens} locale={locale} /> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
            <Footer />
          </main>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Pulse — Buaze design system layout. Pure white + graphite + lime accent,
// Space Grotesk display, JetBrains Mono prices, pulse-heartbeat live dot.
// Mobile-first per CLAUDE.md §25 (px-5 / py-[60px] base).

function PulseLayout({
  restaurant, visibleCategories, activeId, accent, locale, copy, priceLocale,
  setProductRef, onCategoryClick, onProductClick,
}: LayoutProps) {
  const brand = restaurant.menuAccentColor || accent;
  return (
    <div className="min-h-full bg-white text-[#0A0A0A]">
      {/* Sticky brand bar */}
      <header className="sticky top-0 z-40 border-b border-[#EDEDED] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-2.5">
            {restaurant.menuLogoUrl ? (
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-[#EDEDED] bg-white">
                { }
                <img src={restaurant.menuLogoUrl} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
              </span>
            ) : (
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold"
                style={{ backgroundColor: brand, color: '#0A0A0A' }}
              >
                {restaurant.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium leading-tight" style={{ fontFamily: 'var(--font-menu-heading)' }}>
                {restaurant.name}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
                {restaurant.category}
              </p>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span className="bz-pulse-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brand }} aria-hidden />
            <span className="hidden sm:inline">{copy.menuOf}</span>
            <span className="sm:hidden">PULSE</span>
          </span>
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <>
          {/* Hero — eyebrow + h1 + hairline divider */}
          <section className="border-b border-[#EDEDED] bg-white">
            <div className="mx-auto max-w-6xl px-5 py-[60px] sm:px-7 sm:py-20">
              <p
                className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="bz-pulse-dot inline-block h-2 w-2 rounded-full" style={{ backgroundColor: brand }} aria-hidden />
                {locale === 'tr' ? 'MENÜ · PULSE' : 'MENU · PULSE'}
              </p>
              <h1
                className="mt-3 max-w-3xl text-[38px] font-medium leading-[0.95] tracking-[-0.025em] sm:text-[64px]"
                style={{ fontFamily: 'var(--font-menu-heading)' }}
              >
                {restaurant.name}.
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-[1.6] text-[#525252]">
                {locale === 'tr'
                  ? 'Her tabağın bir nabzı vardır. Kategorilerden seç, detayları aç, sipariş etmeden önce göz at.'
                  : 'Every plate has a pulse. Browse categories, open details, decide before you order.'}
              </p>
              <div className="mt-6">
                <RestaurantMeta restaurant={restaurant} variant="light" />
              </div>
            </div>
          </section>

          {/* Sticky category pills — no-scrollbar horizontal strip */}
          <nav className="sticky top-[57px] z-30 border-b border-[#EDEDED] bg-white/95 backdrop-blur">
            <div className="mx-auto max-w-6xl px-5 sm:px-7">
              <div className="no-scrollbar overflow-x-auto">
                <div className="flex min-w-max gap-1.5 py-3">
                  {visibleCategories.map((c) => {
                    const isActive = activeId === c.id;
                    return (
                      <a
                        key={c.id}
                        href={`#cat-${c.id}`}
                        onClick={() => onCategoryClick(c.id)}
                        className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all active:scale-95 ${
                          isActive
                            ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white shadow-sm'
                            : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                        }`}
                        style={isActive ? { boxShadow: `0 0 0 3px ${brand}40` } : undefined}
                      >
                        {c.name}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </nav>

          {/* Sections */}
          <main className="mx-auto max-w-6xl space-y-12 px-5 py-12 sm:space-y-16 sm:px-7 sm:py-16">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-32">
                  <header className="mb-5 flex items-end justify-between gap-3 border-b border-[#EDEDED] pb-3">
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#737373]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {locale === 'tr' ? 'KATEGORİ' : 'CATEGORY'} · {String(items.length).padStart(2, '0')}
                      </p>
                      <h2
                        className="mt-1 text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]"
                        style={{ fontFamily: 'var(--font-menu-heading)' }}
                      >
                        {category.name}
                      </h2>
                      {category.description && (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[#525252]">{category.description}</p>
                      )}
                    </div>
                    <span
                      className="hidden h-px flex-1 self-end sm:block"
                      style={{ background: `linear-gradient(to right, transparent, ${brand}66, transparent)` }}
                      aria-hidden
                    />
                  </header>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        data-pid={item.id}
                        ref={(el) => setProductRef(item.id, el)}
                        onClick={() => onProductClick(item, category.id)}
                        className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#EDEDED] bg-white transition-all hover:-translate-y-0.5 hover:border-[#0A0A0A] hover:shadow-md ${
                          item.isOutOfStock ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-[#FAFAFA]">
                          {item.imageUrl ? (
                             
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <Placeholder accent={brand} />
                          )}
                          {item.badges.length > 0 && (
                            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1">
                              {item.badges.slice(0, 2).map((b) => (
                                <BadgeChip key={b} badge={b} locale={locale} />
                              ))}
                            </div>
                          )}
                          {item.isOutOfStock && (
                            <span
                              className="absolute right-3 top-3 rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white"
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              {copy.outOfStock}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h3
                              className="min-w-0 flex-1 text-[16px] font-medium leading-tight tracking-[-0.01em] sm:text-[17px]"
                              style={{ fontFamily: 'var(--font-menu-heading)' }}
                            >
                              {item.name}
                            </h3>
                            <span
                              className="shrink-0 text-[15px] font-semibold tabular-nums tracking-tight text-[#0A0A0A] sm:text-[16px]"
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              {formatPrice(item.priceCents, item.currency, priceLocale)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="line-clamp-2 text-[13px] leading-[1.55] text-[#525252]">{item.description}</p>
                          )}
                          {item.badges.length > 2 && (
                            <div className="flex flex-wrap gap-1">
                              {item.badges.slice(2).map((b) => (
                                <BadgeChip key={b} badge={b} locale={locale} />
                              ))}
                            </div>
                          )}
                          {item.allergens?.length ? <AllergenList allergens={item.allergens} locale={locale} /> : null}
                        </div>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-4 bottom-0 h-px origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                          style={{ backgroundColor: brand }}
                        />
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ECG-line footer signature */}
            <div className="flex flex-col items-center gap-3 border-t border-[#EDEDED] pt-10">
              <svg width="120" height="20" viewBox="0 0 120 20" fill="none" aria-hidden>
                <path
                  d="M0 10 L30 10 L36 4 L42 16 L48 10 L54 6 L60 14 L66 10 L120 10"
                  stroke={brand}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#737373]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Powered by Buaze
              </p>
            </div>
          </main>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared helpers

function RestaurantMeta({
  restaurant, variant, centered, accent,
}: {
  restaurant: RestaurantView;
  variant: 'light' | 'dark' | 'ondark';
  centered?: boolean;
  accent?: string;
}) {
  const chipCls =
    variant === 'light'
      ? 'bg-white/15 text-white/90 backdrop-blur ring-1 ring-white/15'
      : variant === 'ondark'
      ? 'border text-white/75'
      : 'bg-white text-[#525252] border border-[#EDEDED]';
  const chipStyle =
    variant === 'ondark' && accent ? { borderColor: `${accent}4D`, backgroundColor: `${accent}14` } : undefined;

  return (
    <div className={`mx-auto ${centered ? 'max-w-lg justify-center' : 'max-w-2xl'} mt-5 flex flex-wrap gap-2 text-[12px] font-medium`}>
      {restaurant.address && (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${chipCls}`} style={chipStyle}>
          <MapPin size={12} strokeWidth={2} />
          <span className="max-w-[60vw] truncate">{restaurant.address}</span>
        </span>
      )}
      {restaurant.phone && (
        <a
          href={`tel:${restaurant.phone.replace(/\s/g, '')}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all active:scale-95 ${chipCls}`}
          style={chipStyle}
        >
          <Phone size={12} strokeWidth={2} />
          {restaurant.phone}
        </a>
      )}
      {restaurant.workingHours && (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${chipCls}`} style={chipStyle}>
          <Clock size={12} strokeWidth={2} />
          {restaurant.workingHours}
        </span>
      )}
    </div>
  );
}

function EmptyState({ copy, dark }: { copy: LayoutProps['copy']; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${dark ? 'bg-white/10' : 'bg-[#F5F5F5]'}`}>
        <Sparkles size={28} className={dark ? 'text-white/50' : 'text-[#737373]'} strokeWidth={2} />
      </div>
      <h2 className={`text-[20px] font-medium leading-tight tracking-[-0.02em] ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{copy.emptyTitle}</h2>
      <p className={`mt-2 text-[14px] leading-relaxed ${dark ? 'text-white/55' : 'text-[#525252]'}`}>{copy.emptyBody}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="pt-6 pb-8 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-[#737373]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      Powered by · Buaze
    </footer>
  );
}
