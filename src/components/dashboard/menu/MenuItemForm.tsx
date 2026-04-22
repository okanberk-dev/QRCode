'use client';

import { useState, useRef } from 'react';
import { X, Save, Loader2, Utensils, Upload, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isOutOfStock: boolean;
  sortOrder: number;
  badges: string[];
}

interface Props {
  restaurantId: string;
  categories: Category[];
  item?: MenuItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MenuItemForm({ restaurantId, categories, item, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    categoryId: item?.categoryId || (categories.length > 0 ? categories[0].id : ''),
    name: item?.name || '',
    description: item?.description || '',
    price: item?.priceCents ? (item.priceCents / 100).toString() : '',
    currency: item?.currency || 'TRY',
    imageUrl: item?.imageUrl || null,
    isAvailable: item?.isAvailable ?? true,
    isOutOfStock: item?.isOutOfStock ?? false,
    sortOrder: item?.sortOrder ?? 0,
    badges: item?.badges || [] as string[],
  });

  const [badgeInput, setBadgeInput] = useState('');

  const addBadge = () => {
    if (badgeInput.trim() && !form.badges.includes(badgeInput.trim())) {
      setForm({ ...form, badges: [...form.badges, badgeInput.trim()] });
      setBadgeInput('');
    }
  };

  const removeBadge = (badge: string) => {
    setForm({ ...form, badges: form.badges.filter(b => b !== badge) });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/menu/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');

      setForm({ ...form, imageUrl: data.url });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      setError('Lütfen bir kategori seçin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = item?.id ? `/api/menu/items/${item.id}` : '/api/menu/items';
      const method = item?.id ? 'PATCH' : 'POST';

      const payload = {
        ...form,
        restaurantId,
        priceCents: Math.round(parseFloat(form.price) * 100) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A2332]/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-7 border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F4B400]/10 rounded-2xl flex items-center justify-center">
              <Utensils size={24} className="text-[#F4B400]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1A2332]">
                {item ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5">
                Menü içeriğini güncelleyin
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
               {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Image */}
            <div className="space-y-4">
               <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">ÜRÜN GÖRSELİ</label>
               <div
                 onClick={() => fileInputRef.current?.click()}
                 className={`relative h-56 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                   form.imageUrl ? 'border-gray-100' : 'border-gray-200 hover:border-[#F4B400] hover:bg-[#F4B400]/5'
                 }`}
               >
                 {form.imageUrl ? (
                   <>
                     <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase flex items-center gap-2">
                           <ImageIcon size={14} /> DEĞİŞTİR
                        </div>
                     </div>
                   </>
                 ) : (
                   <div className="text-center p-6 flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
                         {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest leading-tight">Görsel Yükle</p>
                        <p className="text-[10px] font-bold text-gray-300 mt-1 max-w-[140px]">Küçük boyutta, optimize edilmiş WebP yüklenir</p>
                      </div>
                   </div>
                 )}
                 <input
                   type="file"
                   ref={fileInputRef}
                   onChange={handleImageUpload}
                   accept="image/*"
                   className="hidden"
                 />
               </div>

               {/* URL fallback — dosya yükleme ile sorun yaşayan kullanıcılar için */}
               <div className="space-y-1">
                 <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">VEYA URL YAPIŞTIR</label>
                 <input
                   type="url"
                   value={form.imageUrl || ''}
                   onChange={(e) => setForm({ ...form, imageUrl: e.target.value || null })}
                   placeholder="https://..."
                   className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                 />
               </div>

               {form.imageUrl && (
                 <button
                   type="button"
                   onClick={() => setForm({ ...form, imageUrl: null })}
                   className="flex items-center gap-2 text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest pl-1"
                 >
                   <Trash2 size={12} /> GÖRSELİ KALDIR
                 </button>
               )}
            </div>

            {/* Right Column: Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">KATEGORİ</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm appearance-none"
                >
                  <option value="">Seçiniz...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">ÜRÜN ADI</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Izgara Köfte"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">FİYAT</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₺</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">SIRALAMA</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">ÜRÜN ETİKETLERİ (ÖRN: YENİ, POPÜLER)</label>
            <div className="flex flex-wrap gap-2 mb-3">
               {form.badges.map(badge => (
                 <span key={badge} className="bg-[#F4B400] text-[#1A2332] text-[10px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-2 uppercase tracking-wider shadow-sm">
                   {badge}
                   <button type="button" onClick={() => removeBadge(badge)} className="hover:text-red-600 transition-colors">
                     <X size={12} strokeWidth={3} />
                   </button>
                 </span>
               ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={badgeInput}
                onChange={(e) => setBadgeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBadge(); } }}
                placeholder="Örn: Yeni"
                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={addBadge}
                className="px-6 bg-[#1A2332] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95"
              >
                EKLE
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">ÜRÜN AÇIKLAMASI</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ürünün içeriğini veya detaylarını yazın..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:bg-white transition-all shadow-sm resize-none"
            />
          </div>

          {/* Availability Switches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                form.isAvailable ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="text-left">
                <p className="text-[11px] font-black uppercase text-[#1A2332]">MENÜDE GÖSTER</p>
                <p className="text-[9px] font-bold text-gray-400 tracking-tight">Kapatılırsa ürünü kimse göremez</p>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-all ${form.isAvailable ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${form.isAvailable ? 'left-5' : 'left-1'}`} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, isOutOfStock: !form.isOutOfStock })}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                form.isOutOfStock ? 'bg-red-50/50 border-red-100' : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="text-left">
                <p className="text-[11px] font-black uppercase text-[#1A2332]">STOKTA YOK</p>
                <p className="text-[9px] font-bold text-gray-400 tracking-tight">Üzerine "Tükendi" etiketi gelir</p>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-all ${form.isOutOfStock ? 'bg-red-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${form.isOutOfStock ? 'left-5' : 'left-1'}`} />
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-gray-400 hover:text-[#1A2332] font-black text-xs uppercase tracking-widest transition-all"
            >
              İPTAL
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 flex items-center justify-center gap-3 py-4 bg-[#1A2332] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {item ? 'GÜNCELLEMEYİ KAYDET' : 'ÜRÜNÜ OLUŞTUR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
