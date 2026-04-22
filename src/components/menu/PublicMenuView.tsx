'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, Phone, Flame, Leaf, Star, Sparkles, WheatOff } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { MenuBadge } from '@/lib/validations';

export interface MenuItemView {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  badges: string[];
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
}

interface PublicMenuViewProps {
  restaurant: RestaurantView;
  categories: MenuCategoryView[];
  locale?: 'tr' | 'en';
}

const BADGE_META: Record<MenuBadge, { tr: string; en: string; icon: typeof Flame; cls: string }> = {
  populer:     { tr: 'Popüler',       en: 'Popular',       icon: Star,     cls: 'bg-amber-100 text-amber-800' },
  yeni:        { tr: 'Yeni',          en: 'New',           icon: Sparkles, cls: 'bg-blue-100 text-blue-800' },
  vegan:       { tr: 'Vegan',         en: 'Vegan',         icon: Leaf,     cls: 'bg-emerald-100 text-emerald-800' },
  vegetaryen:  { tr: 'Vejetaryen',    en: 'Vegetarian',    icon: Leaf,     cls: 'bg-lime-100 text-lime-800' },
  aci:         { tr: 'Acı',           en: 'Spicy',         icon: Flame,    cls: 'bg-red-100 text-red-700' },
  sef_onerisi: { tr: 'Şef Önerisi',   en: "Chef's Pick",   icon: Star,     cls: 'bg-purple-100 text-purple-800' },
  glutensiz:   { tr: 'Glutensiz',     en: 'Gluten-Free',   icon: WheatOff, cls: 'bg-[#FFF8D6] text-[#B88800]' },
};

function BadgeChip({ badge, locale }: { badge: string; locale: 'tr' | 'en' }) {
  const meta = BADGE_META[badge as MenuBadge];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.cls}`}>
      <Icon size={10} strokeWidth={2} />
      {meta[locale]}
    </span>
  );
}

function Placeholder({ primaryColor }: { primaryColor: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${primaryColor}14, ${primaryColor}26)` }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V11z" opacity="0.3" />
        <path d="M6 13h12M6 17h8" />
      </svg>
    </div>
  );
}

export default function PublicMenuView({ restaurant, categories, locale = 'tr' }: PublicMenuViewProps) {
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.isVisible && c.items.some((i) => i.isAvailable)),
    [categories],
  );
  const [activeId, setActiveId] = useState<string | null>(visibleCategories[0]?.id ?? null);

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

  const copy = {
    emptyTitle: locale === 'tr' ? 'Bu menüde henüz ürün yok' : 'No items in this menu yet',
    emptyBody: locale === 'tr' ? 'İşletme yakında menüsünü paylaşacak.' : 'The restaurant will share its menu soon.',
    outOfStock: locale === 'tr' ? 'Tükendi' : 'Out of stock',
    menuOf: locale === 'tr' ? 'Menü' : 'Menu',
  };

  const priceLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <div className="min-h-full bg-[#F8F6F1]">
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${restaurant.primaryColor} 0%, ${restaurant.primaryColor}cc 100%)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative px-5 pt-10 pb-8 sm:px-8 sm:pt-14 sm:pb-10">
          <div className="mx-auto flex max-w-2xl items-start gap-4 sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-3xl font-black shadow-lg sm:h-20 sm:w-20 sm:text-4xl" style={{ color: restaurant.primaryColor }}>
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] opacity-80">{restaurant.category}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{restaurant.name}</h1>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest opacity-75">{copy.menuOf}</p>
            </div>
          </div>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap gap-3 text-xs font-bold text-white/90">
            {restaurant.address && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <MapPin size={12} strokeWidth={2} />
                <span className="max-w-[60vw] truncate">{restaurant.address}</span>
              </span>
            )}
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur transition-all hover:bg-white/25 active:scale-95"
              >
                <Phone size={12} strokeWidth={2} />
                {restaurant.phone}
              </a>
            )}
            {restaurant.workingHours && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <Clock size={12} strokeWidth={2} />
                {restaurant.workingHours}
              </span>
            )}
          </div>
        </div>
      </header>

      {visibleCategories.length === 0 ? (
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Sparkles size={28} className="text-gray-400" strokeWidth={2} />
          </div>
          <h2 className="text-lg font-black text-[#1A2332]">{copy.emptyTitle}</h2>
          <p className="mt-1 text-sm font-bold text-[#2A3444]">{copy.emptyBody}</p>
        </div>
      ) : (
        <>
          <nav className="sticky top-0 z-30 border-b border-gray-200/80 bg-[#F8F6F1]/95 backdrop-blur">
            <div className="mx-auto max-w-2xl overflow-x-auto px-3 py-3 no-scrollbar">
              <div className="flex gap-2">
                {visibleCategories.map((c) => {
                  const isActive = activeId === c.id;
                  return (
                    <a
                      key={c.id}
                      href={`#cat-${c.id}`}
                      className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                        isActive ? 'text-white shadow-sm' : 'bg-white text-[#1A2332] hover:bg-gray-50'
                      }`}
                      style={isActive ? { backgroundColor: restaurant.primaryColor } : undefined}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          <main className="mx-auto max-w-2xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
            {visibleCategories.map((category) => {
              const items = category.items.filter((i) => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder);
              if (items.length === 0) return null;
              return (
                <section key={category.id} id={`cat-${category.id}`} data-cat-id={category.id} className="scroll-mt-24">
                  <div className="mb-5">
                    <h2 className="text-xl font-black tracking-tight text-[#1A2332] sm:text-2xl">{category.name}</h2>
                    {category.description && (
                      <p className="mt-1 text-sm font-bold text-[#2A3444]">{category.description}</p>
                    )}
                    <div className="mt-2 h-1 w-12 rounded-full" style={{ backgroundColor: restaurant.primaryColor }} />
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className={`flex gap-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all sm:p-4 ${
                          item.isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-28">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Placeholder primaryColor={restaurant.primaryColor} />
                          )}
                          {item.isOutOfStock && (
                            <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[10px] font-black uppercase tracking-widest text-white">
                              {copy.outOfStock}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[15px] font-black leading-tight text-[#1A2332]">{item.name}</h3>
                            <span
                              className="shrink-0 text-sm font-black sm:text-base"
                              style={{ color: restaurant.primaryColor }}
                            >
                              {formatPrice(item.priceCents, item.currency, priceLocale)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-1 line-clamp-3 text-xs font-bold text-[#2A3444] sm:text-[13px]">{item.description}</p>
                          )}
                          {item.badges.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.badges.map((b) => (
                                <BadgeChip key={b} badge={b} locale={locale} />
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
            <footer className="pt-4 pb-6 text-center text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
              Powered by Buaze
            </footer>
          </main>
        </>
      )}
    </div>
  );
}
