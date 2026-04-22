'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import MenuEditor from '@/components/dashboard/menu/MenuEditor';

export default function AdminRestaurantMenuPage() {
  const { id } = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<{ name: string; primaryColor: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRestaurant(data);
        } else {
          router.push('/admin/restaurants');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F4F1]">
        <Loader2 className="animate-spin text-[#0F2348] w-10 h-10" />
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="min-h-screen bg-[#F5F4F1] p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Admin Header */}
        <div className="flex items-center justify-between bg-[#0F2348] text-white p-6 rounded-[28px] border border-gray-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
             <button 
               onClick={() => router.back()}
               className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
             >
               <ArrowLeft size={20} strokeWidth={3} />
             </button>
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <div className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-400 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                      <ShieldCheck size={10} /> SUPERADMIN YETKİSİ
                   </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{restaurant.name} - Menü Yönetimi</h1>
             </div>
          </div>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] -mr-32 -mt-32" />
          </div>
        </div>

        {/* Re-use the MenuEditor component */}
        <MenuEditor 
          restaurantId={id as string} 
          restaurantName={restaurant.name} 
          primaryColor={restaurant.primaryColor} 
        />
      </div>
    </div>
  );
}
