'use client';

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import {
  X,
  ArrowLeft,
  Utensils,
  Search,
} from 'lucide-react';
import { Locale, locales } from '@/lib/translations';
import { useMenuAnalytics, useProductViewTracking } from '@/hooks/useMenuAnalytics';
import { Badge, EmptyState } from '@/components/ui';

interface Category {
  id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  isOutOfStock: boolean;
  badges: string[];
}

interface RestaurantData {
  name: string;
  menuLogoUrl: string | null;
  primaryColor: string;
  menuTheme?: string;
  menuAccentColor?: string | null;
  categories: Category[];
}

export default function PublicMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const [locale, setLocale] = useState<Locale>('tr');

  useEffect(() => {
    const hl = searchParams.get('hl') as Locale;
    if (hl && locales.includes(hl)) setLocale(hl);
  }, [searchParams]);

  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Analytics — fires menu_view on mount, tracks category clicks, product views, product detail opens.
  const analytics = useMenuAnalytics({ slug, enabled: !!slug });
  useEffect(() => {
    if (slug) analytics.trackMenuView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const trackedProducts = useMemo(() => {
    if (!data) return [];
    return data.categories.flatMap((c) => c.items.map((i) => ({ productId: i.id, categoryId: c.id })));
  }, [data]);
  const setProductRef = useProductViewTracking({
    enabled: !!slug,
    track: analytics.trackProductView,
    products: trackedProducts,
  });

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.categories;

    return data.categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(cat => cat.items.length > 0);
  }, [data, searchQuery]);

  useEffect(() => {
    if (loading || filteredCategories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace('cat-', ''));
          }
        });
      },
      { threshold: 0.2, rootMargin: '-10% 0px -80% 0px' }
    );

    filteredCategories.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading, filteredCategories]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`/api/menu/${slug}`);
        if (res.ok) {
          const menuData = await res.json();
          // Normalize: always coerce categories to an array so later .filter/
          // .map calls are safe even if the API returns an unexpected shape.
          const safe = {
            ...menuData,
            categories: Array.isArray(menuData?.categories) ? menuData.categories : [],
          };
          setData(safe);
          if (safe.categories.length > 0) {
            setActiveCategory(safe.categories[0].id);
          }
        } else {
          setData(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [slug]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [selectedItem]);

  // ESC closes modal
  useEffect(() => {
    if (!selectedItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedItem]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#EBEBEB] border-t-[#5D3EBC]" />
          <span
            className="text-[10px] uppercase text-[#737373]"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em' }}
          >
            Buaze
          </span>
        </div>
      </div>
    );
  }

  if (!data) return notFound();

  const themeColor = data.menuAccentColor || data.primaryColor || '#5D3EBC';

  return (
    <div
      className="flex min-h-screen flex-col bg-white selection:bg-[#EFEAFB]"
      // Restaurant menu = owner's content: keep Space Grotesk (Clash Display license, §11).
      style={{ '--font-heading': 'var(--font-menu-heading)' } as CSSProperties}
    >
      <a href="#menu-main-content" className="bz-skip-link">
        {locale === 'tr' ? 'İçeriğe atla' : 'Skip to content'}
      </a>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#EBEBEB] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => window.history.back()}
              aria-label={locale === 'tr' ? 'Geri' : 'Back'}
              className="bz-btn-icon"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <h1 className="bz-h-tight truncate text-[18px] text-[#111110]">{data.name}</h1>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-medium text-white shadow-sm"
            style={{
              backgroundColor: themeColor,
              fontFamily: 'var(--font-menu-heading)',
              letterSpacing: '-0.03em',
            }}
            aria-hidden="true"
          >
            {data.menuLogoUrl ? (
              <img src={data.menuLogoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              data.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="mx-auto max-w-xl px-5 pb-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'tr' ? 'Ürün veya kategori ara…' : 'Search dishes or categories…'}
              className="bz-input pl-10"
              aria-label={locale === 'tr' ? 'Menüde ara' : 'Search menu'}
            />
          </div>
        </div>

        {/* ── Category Chips ── */}
        {!searchQuery && data.categories.length > 0 && (
          <div
            role="tablist"
            aria-label={locale === 'tr' ? 'Kategoriler' : 'Categories'}
            className="mx-auto flex max-w-xl items-center gap-2 overflow-x-auto px-5 pb-3 no-scrollbar"
          >
            {data.categories.map(cat => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    analytics.trackCategoryClick(cat.id);
                    const el = document.getElementById(`cat-${cat.id}`);
                    if (el) {
                      const offset = 160; // header height incl. search + chips
                      const bodyRect = document.body.getBoundingClientRect().top;
                      const elementRect = el.getBoundingClientRect().top;
                      const elementPosition = elementRect - bodyRect;
                      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                    }
                  }}
                  className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC] focus-visible:ring-offset-1 ${
                    active
                      ? 'border-[#5D3EBC] bg-[#5D3EBC] text-white'
                      : 'border-[#EBEBEB] bg-white text-[#525252] hover:border-[#5D3EBC] hover:text-[#5D3EBC]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ── Menu List ── */}
      <main
        id="menu-main-content"
        tabIndex={-1}
        className="mx-auto mb-20 w-full max-w-xl flex-1 space-y-12 px-5 py-6 focus:outline-none"
      >
        {filteredCategories.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Search size={28} className="text-[#737373]" />}
              title={locale === 'tr' ? 'Sonuç bulunamadı' : 'No results'}
              body={
                locale === 'tr'
                  ? 'Aradığınız kritere uygun ürün bulunamadı.'
                  : 'No items match your search.'
              }
            />
          </div>
        ) : (
          filteredCategories.map(cat => (
            <section
              key={cat.id}
              id={`cat-${cat.id}`}
              className="bz-fade-in scroll-mt-32 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="h-7 w-1 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
                <div className="min-w-0">
                  <h2 className="bz-h-tight-2 text-[22px] text-[#111110]">{cat.name}</h2>
                  {cat.description && (
                    <p className="mt-0.5 text-[12px] text-[#737373]">{cat.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {cat.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    data-pid={item.id}
                    ref={(el) => setProductRef(item.id, el)}
                    onClick={() => {
                      setSelectedItem(item);
                      analytics.trackProductClick(item.id, cat.id);
                    }}
                    className="group relative flex w-full gap-4 rounded-3xl border border-[#EBEBEB] bg-white p-4 text-left transition-all hover:border-[#5D3EBC] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC] focus-visible:ring-offset-2"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-col gap-1">
                        <h3 className="bz-h-tight text-[15px] text-[#111110]">{item.name}</h3>
                        {item.badges && item.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.badges.map((badge, idx) => (
                              <Badge key={idx} kind="lime">{badge}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.description && (
                        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-[#525252]">
                          {item.description}
                        </p>
                      )}
                      <div className="pt-1">
                        <span
                          className="text-[15px] text-[#111110]"
                          style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                        >
                          {(item.priceCents / 100).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          {item.currency === 'TRY' ? '₺' : item.currency}
                        </span>
                      </div>
                    </div>

                    {item.imageUrl && (
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-[#EBEBEB]">
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        {item.isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                            <Badge kind="danger">{locale === 'tr' ? 'Stokta yok' : 'Out of stock'}</Badge>
                          </div>
                        )}
                      </div>
                    )}

                    {!item.imageUrl && item.isOutOfStock && (
                      <div className="absolute right-4 top-4">
                        <Badge kind="danger">{locale === 'tr' ? 'Tükendi' : 'Sold out'}</Badge>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-[#EBEBEB] px-6 py-8">
        <div
          className="mx-auto flex max-w-xl items-center justify-center gap-2 text-[10px] uppercase text-[#737373]"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em' }}
        >
          <span>Powered by</span>
          <span className="text-[#111110]">Buaze</span>
        </div>
      </footer>

      {/* ── Item Detail Modal ── */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-item-title"
          onClick={() => setSelectedItem(null)}
          className="bz-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
          >
            <div className="relative h-[55dvh] sm:h-[360px]">
              {selectedItem.imageUrl ? (
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#F6F6F6] text-[#D4D4D4]">
                  <Utensils size={56} strokeWidth={1.5} />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label={locale === 'tr' ? 'Kapat' : 'Close'}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC]"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-5 p-6 sm:p-7">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="menu-item-title" className="bz-h-tight-2 text-[24px] text-[#111110]">
                    {selectedItem.name}
                  </h2>
                  {selectedItem.isOutOfStock && (
                    <Badge kind="danger">{locale === 'tr' ? 'Stokta yok' : 'Out of stock'}</Badge>
                  )}
                </div>
                {selectedItem.badges && selectedItem.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.badges.map((badge, idx) => (
                      <Badge key={idx} kind="lime">{badge}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {selectedItem.description && (
                <div className="space-y-1.5 border-t border-[#EBEBEB] pt-4">
                  <span className="pulse-eyebrow text-[#737373]">
                    {locale === 'tr' ? 'Açıklama' : 'Description'}
                  </span>
                  <p className="text-[14px] leading-relaxed text-[#525252]">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              <div className="flex items-end justify-between gap-3 border-t border-[#EBEBEB] pt-4">
                <div className="space-y-1">
                  <span className="pulse-eyebrow text-[#737373]">
                    {locale === 'tr' ? 'Fiyat' : 'Price'}
                  </span>
                  <p
                    className="text-[24px] text-[#111110]"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  >
                    {(selectedItem.priceCents / 100).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {selectedItem.currency === 'TRY' ? '₺' : selectedItem.currency}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="bz-btn-primary px-6 py-3 text-[13px]"
                >
                  {locale === 'tr' ? 'Geri dön' : 'Go back'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
