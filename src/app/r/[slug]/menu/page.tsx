'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { 
  Loader2, Info, ChevronRight, X, 
  MapPin, Phone, Globe, ArrowLeft,
  Utensils, Search
} from 'lucide-react';
import { getTranslations, Locale, locales } from '@/lib/translations';

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
  primaryColor: string;
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

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`/api/menu/${slug}`);
        if (res.ok) {
          const menuData = await res.json();
          setData(menuData);
          if (menuData.categories.length > 0) {
            setActiveCategory(menuData.categories[0].id);
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

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-gray-50 border-t-blue-500 animate-spin" />
          <p className="text-sm font-black text-gray-300 tracking-[0.2em] uppercase">BUAZE</p>
        </div>
      </div>
    );
  }

  if (!data) return notFound();

  const themeColor = data.primaryColor || '#111827';

  return (
    <div className="flex flex-col min-h-screen bg-[#FCFBF7] selection:bg-gray-100">
      
      {/* ── Fixed Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => window.history.back()}
               className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-900 transition-colors"
             >
               <ArrowLeft size={22} strokeWidth={2.5} />
             </button>
             <h1 className="font-black text-lg tracking-tight text-[#111827] truncate max-w-[180px]">{data.name}</h1>
          </div>
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-lg"
            style={{ backgroundColor: themeColor }}
          >
            {data.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="max-w-xl mx-auto px-5 pb-3">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#111827] transition-colors" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'tr' ? 'Ürün veya kategori ara...' : 'Search for dishes...'}
                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all shadow-sm"
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
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  activeCategory === cat.id 
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xl shadow-gray-200' 
                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
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
                 <Search className="text-gray-200" size={32} />
              </div>
              <p className="text-sm font-bold text-gray-400">{locale === 'tr' ? 'Aradığınız kritere uygun ürün bulunamadı.' : 'No items found matching your search.'}</p>
           </div>
         ) : (
           filteredCategories.map(cat => (
             <section key={cat.id} id={`cat-${cat.id}`} className="space-y-6 scroll-mt-28 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="flex items-center gap-4">
                   <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                   <div>
                     <h2 className="text-2xl font-black text-[#111827] tracking-tight">{cat.name}</h2>
                     {cat.description && <p className="text-xs font-bold text-gray-400 mt-0.5">{cat.description}</p>}
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {cat.items.map(item => (
                     <div 
                       key={item.id}
                       className="relative bg-white rounded-[28px] p-4 flex gap-4 border border-gray-50 shadow-sm active:scale-[0.98] transition-all group"
                     >
                        <div className="flex-1 space-y-1.5">
                           <div className="flex items-start justify-between gap-2">
                             <h3 className="font-black text-[#111827] leading-tight group-hover:text-gray-700 transition-colors">{item.name}</h3>
                           </div>
                           {item.description && (
                             <p className="text-[12px] font-medium text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
                           )}
                           <div className="pt-1">
                             <span className="text-[15px] font-black text-[#111827]">
                               {(item.priceCents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.currency === 'TRY' ? '₺' : item.currency}
                             </span>
                           </div>
                        </div>

                        {item.imageUrl && (
                          <div className="relative w-24 h-24 shrink-0 rounded-[20px] overflow-hidden border border-gray-50">
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
      <footer className="mt-auto py-10 px-6 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-300 tracking-[0.2em] uppercase">POWERED BY</span>
            <span className="text-[10px] font-black text-gray-400 tracking-tighter uppercase">BUAZE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
