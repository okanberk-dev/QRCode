'use client';

import { useState } from 'react';
import { X, Save, Loader2, ListTree } from 'lucide-react';

interface Category {
  id?: string;
  name: string;
  description: string;
  isVisible: boolean;
  sortOrder: number;
}

interface Props {
  restaurantId: string;
  category?: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MenuCategoryForm({ restaurantId, category, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    isVisible: category?.isVisible ?? true,
    sortOrder: category?.sortOrder ?? 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = category?.id 
        ? `/api/menu/categories/${category.id}` 
        : '/api/menu/categories';
      
      const method = category?.id ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, restaurantId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'İşlem başarısız oldu');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#1A2332]/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-[#E8ECF2] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-[#F8F6F1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F4B400]/10 rounded-xl flex items-center justify-center">
              <ListTree size={20} className="text-[#F4B400]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#1A2332]">
                {category ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
              </h2>
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mt-0.5">
                Menü başlıklarını yönetin
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#E8ECF2] text-[#6B7280] transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
               {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-2 ml-1">KATEGORİ ADI</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Başlangıçlar"
                className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-2 ml-1">AÇIKLAMA (OPSİYONEL)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Örn: En lezzetli başlangıç seçeneklerimiz"
                rows={3}
                className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-[#6B7280] uppercase tracking-[0.2em] mb-2 ml-1">SIRALAMA</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#F8F6F1] border border-[#E8ECF2] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div className="flex flex-col justify-end pb-1.5">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isVisible: !form.isVisible })}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E8ECF2] bg-[#F8F6F1] hover:bg-[#E8ECF2] transition-all group"
                >
                  <span className="text-[11px] font-black uppercase text-[#6B7280] group-hover:text-[#1A2332]">GÖRÜNÜR</span>
                  <div className={`w-8 h-4.5 rounded-full relative transition-all ${form.isVisible ? 'bg-emerald-500' : 'bg-[#C9D0DB]'}`}>
                    <div className={`absolute top-1 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all ${form.isVisible ? 'left-4.5' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[#F8F6F1]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 text-[#6B7280] hover:text-[#1A2332] font-black text-xs uppercase tracking-widest transition-all"
            >
              İPTAL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1A2332] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#2A3444] transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              KAYDET
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
