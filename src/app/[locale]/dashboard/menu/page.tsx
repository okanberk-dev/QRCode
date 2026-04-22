'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Store, ChevronRight, UtensilsCrossed } from 'lucide-react';
import MenuEditor from '@/components/dashboard/menu/MenuEditor';

interface Restaurant {
  id: string;
  name: string;
  category: string;
  primaryColor: string;
  slug: string;
}

export default function DashboardMenuPage() {
  const params = useParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const copy = {
    tr: {
      title: 'Menü Yönetimi',
      subtitle: 'Restoranlarınızın menülerini, kategorilerini ve ürünlerini buradan yönetin.',
      select: 'Düzenlenecek İşletme Seçin',
      noRest: 'Henüz bir işletmeniz bulunmuyor.',
      addRest: 'İşletme Ekle',
      manage: 'Menüyü Düzenle'
    },
    en: {
      title: 'Menu Management',
      subtitle: 'Manage your restaurant menus, categories, and items here.',
      select: 'Select a Restaurant to Edit',
      noRest: 'You don\u2019t have any restaurants yet.',
      addRest: 'Add Restaurant',
      manage: 'Edit Menu'
    }
  }[locale];

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch('/api/restaurants');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.data || []);
          setRestaurants(list);
          // If only one restaurant, auto-select it
          if (list.length === 1) {
            setSelectedId(list[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#1A2332]" />
      </div>
    );
  }

  const selectedRest = restaurants.find(r => r.id === selectedId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12 space-y-10 animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="bg-[#1A2332] rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#F4B400]/10 text-[#F4B400] px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.25em]">
            <UtensilsCrossed size={16} /> ✦ DİJİTAL MENÜ
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">{copy.title}</h1>
          <p className="text-[#6B7280] text-sm md:text-lg font-bold max-w-2xl">{copy.subtitle}</p>
        </div>
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F4B400]/5 rounded-full blur-3xl -mr-20 -mt-20" />
      </div>

      {restaurants.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-[#E8ECF2] p-20 text-center shadow-sm">
           <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
             <Store size={36} className="text-gray-200" />
           </div>
           <p className="text-xl font-black text-[#1A2332]">{copy.noRest}</p>
           <a 
             href={`/${locale}/dashboard/restaurants`}
             className="mt-6 inline-flex items-center justify-center px-8 py-4 bg-[#F4B400] text-[#1A2332] rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
           >
             {copy.addRest}
           </a>
        </div>
      ) : (
        <>
          {/* Restaurant Selector (Only if > 1) */}
          {restaurants.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {restaurants.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all text-left ${
                    selectedId === r.id 
                      ? 'bg-white border-[#F4B400] shadow-xl shadow-[#F4B400]/5' 
                      : 'bg-white border-gray-50 hover:border-[#E8ECF2]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-sm"
                      style={{ backgroundColor: r.primaryColor }}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-[#1A2332] text-sm truncate max-w-[120px]">{r.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{r.category}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className={selectedId === r.id ? 'text-[#F4B400]' : 'text-gray-200'} />
                </button>
              ))}
            </div>
          )}

          {/* Menu Editor */}
          {selectedId && selectedRest && (
            <div className="animate-in slide-in-from-bottom-10 duration-700">
              <MenuEditor 
                restaurantId={selectedRest.id} 
                restaurantName={selectedRest.name} 
                primaryColor={selectedRest.primaryColor}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
