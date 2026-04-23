'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { 
  Loader2, Info, ChevronRight, X, 
  MapPin, Phone, Globe, ArrowLeft,
  Utensils, Search
} from 'lucide-react';
import { getTranslations, Locale, locales } from '@/lib/translations';
import { useMenuAnalytics, useProductViewTracking } from '@/hooks/useMenuAnalytics';

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

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-[#FFFFFF] border-t-blue-500 animate-spin" />
          <p className="text-sm font-black text-[#C9D0DB] tracking-[0.2em] uppercase">BUAZE</p>
        </div>
      </div>
    );
  }

  if (!data) return notFound();

  const themeColor = data.menuAccentColor || data.primaryColor || '#0A0A0A';

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF] selection:bg-[#EDEDED]">
      
      {/* ── Fixed Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#EDEDED]">
        <div className="max-w-xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => window.history.back()}
               className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#FFFFFF] text-[#0A0A0A] transition-colors"
             >
               <ArrowLeft size={22} strokeWidth={2} />
             </button>
             <h1 className="font-extrabold text-lg tracking-tight text-[#0A0A0A] truncate max-w-[180px]">{data.name}</h1>
          </div>
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-lg overflow-hidden shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            {data.menuLogoUrl ? (
              <img src={data.menuLogoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              data.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="max-w-xl mx-auto px-5 pb-3">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#0A0A0A] transition-colors" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'tr' ? 'Ürün veya kategori ara...' : 'Search for dishes...'}
                className="w-full h-12 bg-[#FFFFFF] border border-[#EDEDED] rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#EDEDED] focus:bg-white transition-all shadow-sm"
              />
           </div>
        </div>

        {/* ── Category Chips ── */}
        {!searchQuery && (
          <div className="max-w-xl mx-auto px-5 pb-3 overflow-x-auto no-scrollbar flex items-center gap-2">
            {data.categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  analytics.trackCategoryClick(cat.id);
                  const el = document.getElementById(`cat-${cat.id}`);
                  if (el) {
                    const offset = 160; // adjust based on header height
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = el.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth'
                    });
                  }
                }}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  activeCategory === cat.id 
                    ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] shadow-xl shadow-[#EDEDED]' 
                    : 'bg-white text-[#6B7280] border-[#EDEDED] hover:border-[#EDEDED]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Menu List ── */}
      <main className="max-w-xl mx-auto w-full px-5 py-6 space-y-12 mb-20">
         {filteredCategories.length === 0 ? (
           <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                 <Search className="text-[#EDEDED]" size={32} />
              </div>
              <p className="text-sm font-bold text-[#6B7280]">{locale === 'tr' ? 'Aradığınız kritere uygun ürün bulunamadı.' : 'No items found matching your search.'}</p>
           </div>
         ) : (
           filteredCategories.map(cat => (
             <section key={cat.id} id={`cat-${cat.id}`} className="space-y-6 scroll-mt-28 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="flex items-center gap-4">
                   <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                   <div>
                     <h2 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight">{cat.name}</h2>
                     {cat.description && <p className="text-xs font-bold text-[#6B7280] mt-0.5">{cat.description}</p>}
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {cat.items.map(item => (
                     <div
                       key={item.id}
                       data-pid={item.id}
                       ref={(el) => setProductRef(item.id, el)}
                       onClick={() => { setSelectedItem(item); analytics.trackProductClick(item.id, cat.id); }}
                       className="relative bg-white rounded-[28px] p-4 flex gap-4 border border-[#FFFFFF] shadow-sm active:scale-[0.98] transition-all group cursor-pointer"
                     >
                        <div className="flex-1 space-y-1.5">
                           <div className="flex items-start justify-between gap-2">
                             <div className="flex flex-col gap-1">
                               <h3 className="font-extrabold text-[#0A0A0A] leading-tight group-hover:text-[#1A1A1A] transition-colors uppercase tracking-tight">{item.name}</h3>
                               {item.badges && item.badges.length > 0 && (
                                 <div className="flex flex-wrap gap-1">
                                    {item.badges.map((badge, idx) => (
                                      <span key={idx} className="bg-[#C6F24E] text-[#0A0A0A] text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                                         {badge}
                                      </span>
                                    ))}
                                 </div>
                               )}
                             </div>
                           </div>
                           {item.description && (
                             <p className="text-[12px] font-medium text-[#6B7280] line-clamp-2 leading-relaxed">{item.description}</p>
                           )}
                           <div className="pt-1">
                             <span className="text-[15px] font-black text-[#0A0A0A]">
                               {(item.priceCents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.currency === 'TRY' ? '₺' : item.currency}
                             </span>
                           </div>
                        </div>

                        {item.imageUrl && (
                          <div className="relative w-24 h-24 shrink-0 rounded-[20px] overflow-hidden border border-[#FFFFFF]">
                             <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                             {item.isOutOfStock && (
                               <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                  <span className="bg-white px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter text-red-600 shadow-sm">
                                    {locale === 'tr' ? 'STOKTA YOK' : 'OUT OF STOCK'}
                                  </span>
                               </div>
                             )}
                          </div>
                        )}

                        {!item.imageUrl && item.isOutOfStock && (
                           <div className="absolute right-4 top-4">
                              <span className="bg-red-50 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter text-red-600 border border-red-100">
                                {locale === 'tr' ? 'TÜKENDİ' : 'SOLD OUT'}
                              </span>
                           </div>
                        )}
                     </div>
                   ))}
                </div>
             </section>
           ))
         )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto py-10 px-6 bg-[#FFFFFF]/50 border-t border-[#EDEDED]">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#C9D0DB] tracking-[0.2em] uppercase">POWERED BY</span>
            <span className="text-[10px] font-black text-[#6B7280] tracking-tighter uppercase">BUAZE</span>
          </div>
        </div>
      </footer>

      {/* ── Item Detail Modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
           <div 
             className="w-full max-w-xl bg-white rounded-t-[32px] sm:rounded-[40px] overflow-hidden animate-in slide-in-from-bottom-20 duration-500 shadow-2xl"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="relative h-[60dvh] sm:h-[400px]">
                 {selectedItem.imageUrl ? (
                   <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-[#FFFFFF] flex items-center justify-center text-[#EDEDED]">
                      <Utensils size={64} />
                   </div>
                 )}
                 <button 
                   onClick={() => setSelectedItem(null)}
                   className="absolute top-5 right-5 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-all active:scale-90"
                 >
                   <X size={20} strokeWidth={2} />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-extrabold text-[#0A0A0A] leading-tight uppercase tracking-tight">{selectedItem.name}</h2>
                      {selectedItem.isOutOfStock && (
                        <span className="px-2 py-1 rounded-lg bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-tighter border border-red-100">
                          {locale === 'tr' ? 'STOKTA YOK' : 'OUT OF STOCK'}
                        </span>
                      )}
                    </div>
                    {selectedItem.badges && selectedItem.badges.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                         {selectedItem.badges.map((badge, idx) => (
                           <span key={idx} className="bg-[#C6F24E] text-[#0A0A0A] text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                             {badge}
                           </span>
                         ))}
                      </div>
                    )}
                 </div>

                 {selectedItem.description && (
                   <div className="space-y-2 pt-2 border-t border-[#FFFFFF]">
                      <p className="text-[11px] font-black uppercase text-[#6B7280] tracking-[0.2em]">{locale === 'tr' ? 'AÇIKLAMA' : 'DESCRIPTION'}</p>
                      <p className="text-[#6B7280] text-sm font-bold leading-relaxed">{selectedItem.description}</p>
                   </div>
                 )}

                 <div className="flex items-center justify-between pt-6 border-t border-[#FFFFFF]">
                    <div className="space-y-1">
                       <p className="text-[11px] font-black uppercase text-[#6B7280] tracking-[0.2em]">{locale === 'tr' ? 'FİYAT' : 'PRICE'}</p>
                       <p className="text-2xl font-black text-[#0A0A0A]">
                         {(selectedItem.priceCents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {selectedItem.currency === 'TRY' ? '₺' : selectedItem.currency}
                       </p>
                    </div>
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="px-10 py-4 bg-[#0A0A0A] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#1A1A1A] transition-all active:scale-95 shadow-xl"
                    >
                      {locale === 'tr' ? 'GERİ DÖN' : 'GO BACK'}
                    </button>
                 </div>
              </div>
           </div>
           {/* Click backdrop to close */}
           <div className="absolute inset-0 -z-10" onClick={() => setSelectedItem(null)} />
        </div>
      )}
    </div>
  );
}
