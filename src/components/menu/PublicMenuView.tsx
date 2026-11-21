'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MenuTheme } from '@/lib/validations';
import { resolveMenuDesign, type MenuDesign } from '@/lib/menu-design';
import { useMenuAnalytics, useProductViewTracking } from '@/hooks/useMenuAnalytics';
import ProductDetailModal from './ProductDetailModal';
import MenuSplash from './MenuSplash';
import MenuDocument from './parts/MenuDocument';
import { MENU_FONT_VARIABLES } from './menu-fonts';
import { menuCopy } from './menu-labels';
import type { MenuRenderContext, MenuSectionData } from './parts/types';

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
  /** Stored design (menu-design-final §5): preset + knob overrides + tagline. */
  menuDesign?: MenuDesign | null;
  /** Public cover src (the image route), or null. */
  menuCoverUrl?: string | null;
}

interface PublicMenuViewProps {
  restaurant: RestaurantView;
  categories: MenuCategoryView[];
  locale?: 'tr' | 'en';
  disableAnalytics?: boolean; // true for admin preview mode
  /** SSR knows the visit came from a QR code (`?source=qr`): render the splash in the HTML. */
  initialSplash?: boolean;
}

/** Ignore observer updates this long after a nav click, so a smooth jump does not flicker the nav. */
const NAV_CLICK_LOCK_MS = 900;

/**
 * Public restaurant menu: one token-driven renderer for every preset
 * (menu-design-final §9). The design is resolved purely from the stored row;
 * the scope root carries the only design object written into the DOM
 * (`d.style`, closed set of custom properties) and re-points --font-heading
 * so Clash Display never reaches a menu.
 */
export default function PublicMenuView({
  restaurant, categories, locale = 'tr', disableAnalytics, initialSplash,
}: PublicMenuViewProps) {
  const d = useMemo(
    () =>
      resolveMenuDesign({
        menuTheme: restaurant.menuTheme,
        menuAccentColor: restaurant.menuAccentColor,
        primaryColor: restaurant.primaryColor,
        menuDesign: restaurant.menuDesign ?? null,
        hasCover: Boolean(restaurant.menuCoverUrl),
      }),
    [restaurant.menuTheme, restaurant.menuAccentColor, restaurant.primaryColor, restaurant.menuDesign, restaurant.menuCoverUrl],
  );

  const sections = useMemo<MenuSectionData[]>(() => {
    const list = (Array.isArray(categories) ? categories : []).filter(
      (c) => c?.isVisible && Array.isArray(c.items) && c.items.some((i) => i?.isAvailable),
    );
    return list.map((category, index) => ({
      category,
      index,
      items: category.items.filter((i) => i?.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [categories]);

  const [activeId, setActiveId] = useState<string | null>(sections[0]?.category.id ?? null);
  const [detailItem, setDetailItem] = useState<MenuItemView | null>(null);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const navLockUntil = useRef(0);

  const analyticsEnabled = !disableAnalytics;
  // HOOK ORDER INVARIANT: useMenuAnalytics must stay ABOVE the splash effect
  // below — its source detection effect has to read `?source=qr` before that
  // effect strips it from the URL, or QR attribution is lost.
  const analytics = useMenuAnalytics({ slug: restaurant.slug, enabled: analyticsEnabled });

  const [splashOn, setSplashOn] = useState(Boolean(initialSplash) && !disableAnalytics);
  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (disableAnalytics || params.get('source') !== 'qr') return;
    // Remove ?source=qr so a refresh doesn't re-trigger the splash.
    params.delete('source');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    if (!initialSplash) setSplashOn(true); // client-only mount fallback
  }, [disableAnalytics, initialSplash]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    analytics.trackMenuView();
    // Only on mount; the hook dedupes subsequent fires anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsEnabled]);

  const trackedProducts = useMemo(
    () => sections.flatMap((s) => s.items.map((i) => ({ productId: i.id, categoryId: s.category.id }))),
    [sections],
  );
  // Products under the splash are not counted; the hook re-observes when it ends.
  const setProductRef = useProductViewTracking({
    enabled: analyticsEnabled && !splashOn,
    track: analytics.trackProductView,
    products: trackedProducts,
  });

  const onCategoryClick = useCallback((categoryId: string) => {
    if (analyticsEnabled) analytics.trackCategoryClick(categoryId);
  }, [analyticsEnabled, analytics]);

  const onNavSelect = useCallback((categoryId: string) => {
    navLockUntil.current = Date.now() + NAV_CLICK_LOCK_MS;
    setActiveId(categoryId);
    onCategoryClick(categoryId);
  }, [onCategoryClick]);

  // The card whose sheet is open. Focus returns to its button on close; the
  // sheet cannot remember the opener itself, because making the canvas inert
  // in the same commit already moved focus to <body>.
  const openerId = useRef<string | null>(null);
  const onProductClick = useCallback((item: MenuItemView, categoryId: string | null) => {
    openerId.current = item.id;
    setDetailItem(item);
    if (analyticsEnabled) analytics.trackProductClick(item.id, categoryId);
  }, [analyticsEnabled, analytics]);

  // Active category follows scrolling (queried inside this canvas only).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < navLockUntil.current) return;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.catId;
          if (id) setActiveId(id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    canvas.querySelectorAll('[data-cat-id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const copy = menuCopy(locale);
  const priceLocale = locale === 'tr' ? 'tr-TR' : 'en-US';
  const ctx: MenuRenderContext = {
    d, restaurant, locale, priceLocale, copy, preview: !analyticsEnabled, setProductRef, onProductClick, onCategoryClick,
  };

  // `inert` only after mount: it is never in the SSR HTML, so a page whose
  // JavaScript fails stays usable once CSS has hidden the splash.
  const inertCanvas = (mounted && splashOn) || detailItem !== null;
  const closeDetail = useCallback(() => setDetailItem(null), []);
  useEffect(() => {
    // Runs after the commit that removed `inert`, so the card can take focus.
    if (detailItem !== null || !openerId.current) return;
    const id = openerId.current;
    openerId.current = null;
    canvasRef.current
      ?.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"] button`)
      ?.focus({ preventScroll: true });
  }, [detailItem]);
  const endSplash = useCallback(() => setSplashOn(false), []);

  return (
    <div
      data-menu-root=""
      data-scheme={d.scheme}
      data-preset={d.presetId}
      lang={locale}
      className={`${MENU_FONT_VARIABLES} group/menu relative flex min-h-full flex-1 flex-col bg-(--m-bg) [font-family:var(--m-font-body)] text-(--m-ink) antialiased [font-synthesis:none]`}
      style={d.style as unknown as CSSProperties}
    >
      <div ref={canvasRef} data-menu-canvas="" inert={inertCanvas || undefined} className="@container/menu flex flex-1 flex-col">
        <MenuDocument ctx={ctx} sections={sections} activeId={activeId} onNavSelect={onNavSelect} />
      </div>
      {splashOn && (
        <MenuSplash
          name={restaurant.name}
          category={restaurant.category}
          logoUrl={restaurant.menuLogoUrl}
          design={d}
          locale={locale}
          onDone={endSplash}
        />
      )}
      {detailItem && (
        <ProductDetailModal item={detailItem} design={d} locale={locale} priceLocale={priceLocale} onClose={closeDetail} />
      )}
    </div>
  );
}
