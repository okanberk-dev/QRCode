'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Pencil, Trash2, GripVertical, 
  ChevronDown, ChevronUp, Eye, EyeOff, 
  Loader2, UtensilsCrossed, AlertCircle,
  Image as ImageIcon, ExternalLink, Upload,
  X as CloseIcon
} from 'lucide-react';
import MenuCategoryForm from './MenuCategoryForm';
import MenuItemForm from './MenuItemForm';

interface Category {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
  sortOrder: number;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isOutOfStock: boolean;
  sortOrder: number;
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  primaryColor: string;
}

export default function MenuEditor({ restaurantId, restaurantName, primaryColor }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState<{ slug: string; menuLogoUrl: string | null } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch restaurant details (slug, logo)
      const restRes = await fetch(`/api/restaurants/${restaurantId}`);
      if (restRes.ok) {
        const restData = await restRes.json();
        setRestaurantData({ slug: restData.slug, menuLogoUrl: restData.menuLogoUrl });
      }

      // 2. Fetch categories
      const catRes = await fetch(`/api/menu/categories?restaurantId=${restaurantId}`);
      if (!catRes.ok) throw new Error('Kategoriler yüklenemedi');
      const catData = await catRes.json();

      // 3. Fetch items
      const itemRes = await fetch(`/api/menu/items?restaurantId=${restaurantId}`);
      if (!itemRes.ok) throw new Error('Ürünler yüklenemedi');
      const itemData = await itemRes.json();

      // 4. Combine
      const combined = catData.map((cat: any) => ({
        ...cat,
        items: itemData.filter((item: any) => item.categoryId === cat.id)
      }));

      setCategories(combined);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/menu/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Silme işlemi başarısız');
        return;
      }
      fetchData();
    } catch (err) {
      alert('Bir hata oluştu');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/menu/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silme işlemi başarısız');
      fetchData();
    } catch (err) {
      alert('Bir hata oluştu');
    }
  };

  const handleReorder = async (type: 'category' | 'item', id: string, direction: 'up' | 'down') => {
    // 1. Find the current category or item
    let list: any[] = [];
    if (type === 'category') {
      list = [...categories];
    } else {
      const allItems = categories.flatMap(c => c.items);
      const current = allItems.find(i => i.id === id);
      if (!current) return;
      list = categories.find(c => c.id === current.categoryId)?.items || [];
    }

    const index = list.findIndex(x => x.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    // 2. Perform the swap
    const target = list[newIndex];
    const current = list[index];

    try {
      const endpoint = type === 'category' ? `/api/menu/categories` : `/api/menu/items`;
      
      // Update both's sortOrder
      await Promise.all([
        fetch(`${endpoint}/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        fetch(`${endpoint}/${target.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        })
      ]);
      fetchData();
    } catch (err) {
      console.error('Reorder error', err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/menu/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Logo yüklenemedi');

      // Update restaurant with new logo URL
      const updateRes = await fetch(`/api/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuLogoUrl: data.url }),
      });

      if (!updateRes.ok) throw new Error('Logo kaydedilemedi');

      setRestaurantData(prev => prev ? { ...prev, menuLogoUrl: data.url } : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Logoyu kaldırmak istediğinize emin misiniz?')) return;
    try {
      const updateRes = await fetch(`/api/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuLogoUrl: null }),
      });

      if (!updateRes.ok) throw new Error('Logo kaldırılamadı');

      setRestaurantData(prev => prev ? { ...prev, menuLogoUrl: null } : null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-50">
          <div className="flex items-center gap-5">
             <div 
               className="w-16 h-16 rounded-[22px] flex items-center justify-center text-white text-2xl font-black shadow-lg overflow-hidden shrink-0"
               style={{ backgroundColor: primaryColor }}
             >
               {restaurantData?.menuLogoUrl ? (
                 <img src={restaurantData.menuLogoUrl} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 restaurantName.charAt(0).toUpperCase()
               )}
             </div>
             <div>
               <h2 className="text-2xl font-black text-[#0F2348]">{restaurantName}</h2>
               <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest leading-none">MENÜ EDİTÖRÜ</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            {restaurantData?.slug && (
              <a
                href={`/r/${restaurantData.slug}/menu`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-[#0F2348] border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-gray-50 active:scale-95 shadow-sm"
              >
                <ExternalLink size={18} strokeWidth={3} />
                ÖNİZLEME
              </a>
            )}
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowCategoryForm(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-[#FF9A14] text-[#0F2348] rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#FF9A14]/10"
            >
              <Plus size={18} strokeWidth={3} />
              YENİ KATEGORİ
            </button>
          </div>
        </div>

        {/* Logo Aspect */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
           <div className="space-y-1 flex-1">
              <h4 className="text-xs font-black text-[#0F2348] uppercase tracking-widest">MENÜ LOGOSU</h4>
              <p className="text-[11px] font-bold text-gray-400">Menü sayfasının başında görüntülenecek işletme logosu.</p>
           </div>
           <div className="flex items-center gap-4">
              {restaurantData?.menuLogoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="p-2 text-red-400 hover:text-red-500 transition-colors"
                >
                  <CloseIcon size={20} strokeWidth={3} />
                </button>
              )}
              <label className="cursor-pointer group">
                  <div className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed transition-all ${
                    uploadingLogo ? 'bg-gray-50 border-gray-200 pointer-events-none' : 'border-gray-200 group-hover:border-[#FF9A14] group-hover:bg-[#FF9A14]/5'
                  }`}>
                    {uploadingLogo ? (
                      <Loader2 size={16} className="animate-spin text-gray-400" />
                    ) : (
                      <Upload size={16} className="text-gray-400 group-hover:text-[#FF9A14]" />
                    )}
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-[#0F2348]">
                      {uploadingLogo ? 'YÜKLENİYOR...' : (restaurantData?.menuLogoUrl ? 'LOGOYU DEĞİŞTİR' : 'LOGO YÜKLE')}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleLogoUpload}
                    accept="image/*"
                  />
              </label>
           </div>
        </div>

        {/* URL fallback for logo */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 -mt-2">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">VEYA URL YAPIŞTIR</label>
          <input
            type="url"
            value={restaurantData?.menuLogoUrl || ''}
            onChange={async (e) => {
              const newUrl = e.target.value.trim() || null;
              setRestaurantData((prev) => prev ? { ...prev, menuLogoUrl: newUrl } : null);
            }}
            onBlur={async (e) => {
              const newUrl = e.target.value.trim() || null;
              setError(null);
              try {
                const res = await fetch(`/api/restaurants/${restaurantId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ menuLogoUrl: newUrl }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => null);
                  throw new Error(data?.error || 'Logo kaydedilemedi');
                }
              } catch (err: any) {
                setError(err.message);
              }
            }}
            placeholder="https://... (dosya yükleyemiyorsan dışarıdaki bir URL yapıştırabilirsin)"
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9A14] focus:bg-white transition-all shadow-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[28px] flex items-center gap-4 text-red-600">
          <AlertCircle size={24} />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-dashed border-gray-200 py-24 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
            <UtensilsCrossed size={36} className="text-gray-200" />
          </div>
          <h3 className="text-xl font-black text-[#0F2348]">Menü Henüz Boş</h3>
          <p className="text-gray-400 font-bold text-sm mt-2 max-w-sm mx-auto">
            Hemen bir kategori oluşturarak restoran menünüzü yapılandırmaya başlayın.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div 
              key={category.id}
              className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden group transition-all hover:border-[#FF9A14]/30"
            >
              {/* Category Header */}
              <div className="p-6 sm:p-8 flex items-center justify-between gap-4 bg-gray-50/50 border-b border-gray-50">
                <div className="flex items-center gap-2 mr-2">
                   <button
                     onClick={() => handleReorder('category', category.id, 'up')}
                     className="w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-[#0F2348] flex items-center justify-center transition-all disabled:opacity-30"
                     title="Yukarı Taşı"
                   >
                     <ChevronUp size={16} strokeWidth={3} />
                   </button>
                   <button
                     onClick={() => handleReorder('category', category.id, 'down')}
                     className="w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-[#0F2348] flex items-center justify-center transition-all disabled:opacity-30"
                     title="Aşağı Taşı"
                   >
                     <ChevronDown size={16} strokeWidth={3} />
                   </button>
                </div>

                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                       <h3 className="text-lg font-black text-[#0F2348] truncate">{category.name}</h3>
                       {!category.isVisible && <EyeOff size={14} className="text-gray-400" />}
                    </div>
                    {category.description && (
                      <p className="text-xs font-bold text-gray-400 truncate mt-0.5">{category.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory(category);
                      setShowCategoryForm(true);
                    }}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-[#0F2348] hover:border-[#FF9A14] flex items-center justify-center transition-all shadow-sm"
                  >
                    <Pencil size={18} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 flex items-center justify-center transition-all shadow-sm"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                  </button>
                  <div className="h-8 w-[1px] bg-gray-200 mx-2" />
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setActiveCategoryId(category.id);
                      setShowItemForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0F2348] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                  >
                    <Plus size={14} strokeWidth={3} />
                    Ürün Ekle
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 sm:p-6">
                {category.items.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-gray-50 rounded-2xl">
                    <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Bu kategoride ürün yok</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.items.map((item) => (
                      <div 
                        key={item.id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-all group/item ${
                          !item.isAvailable || item.isOutOfStock ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-50">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#0F2348] truncate">{item.name}</h4>
                            {item.isOutOfStock && (
                              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 text-[8px] font-black uppercase tracking-tighter">TÜKENDİ</span>
                            )}
                          </div>
                          <p className="text-[14px] font-black text-gray-900 mt-0.5">
                            { (item.priceCents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) } {item.currency === 'TRY' ? '₺' : item.currency}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                             onClick={() => handleReorder('item', item.id, 'up')}
                             className="w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-[#0F2348] flex items-center justify-center transition-all"
                           >
                             <ChevronUp size={14} strokeWidth={3} />
                          </button>
                          <button
                             onClick={() => handleReorder('item', item.id, 'down')}
                             className="w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-[#0F2348] flex items-center justify-center transition-all"
                           >
                             <ChevronDown size={14} strokeWidth={3} />
                          </button>
                          <div className="w-[1px] h-4 bg-gray-100 mx-1" />
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setActiveCategoryId(category.id);
                              setShowItemForm(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-[#0F2348] flex items-center justify-center transition-all shadow-sm"
                          >
                            <Pencil size={14} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all shadow-sm"
                          >
                            <Trash2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCategoryForm && (
        <MenuCategoryForm
          restaurantId={restaurantId}
          category={editingCategory}
          onClose={() => setShowCategoryForm(false)}
          onSuccess={() => {
            setShowCategoryForm(false);
            fetchData();
          }}
        />
      )}

      {showItemForm && (
        <MenuItemForm
          restaurantId={restaurantId}
          categories={categories.map(c => ({ id: c.id, name: c.name }))}
          item={editingItem}
          onClose={() => setShowItemForm(false)}
          onSuccess={() => {
            setShowItemForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
