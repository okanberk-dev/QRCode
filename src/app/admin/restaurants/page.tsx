'use client';

import { useState, useEffect } from 'react';
import { Plus, Store, Loader2, MoreVertical, Mail, ExternalLink, ToggleLeft, ToggleRight, Search, X } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import Link from 'next/link';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  category: string;
  notificationEmail: string | null;
  primaryColor: string;
  isActive: boolean;
  createdAt: string;
  _count: { feedbacks: number };
}

export default function RestaurantsPage() {
  const { t } = useAdminTranslation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'Restoran',
    notificationEmail: '',
    googlePlaceId: '',
    address: '',
    phone: '',
    primaryColor: '#1a73e8',
  });
  const [isManualSlug, setIsManualSlug] = useState(false);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/restaurants');
      if (res.ok) {
        const data = await res.json();
        setRestaurants(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    if (isManualSlug) {
      setFormData(prev => ({ ...prev, name }));
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[şŞ]/g, 's')
      .replace(/[üÜ]/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    setFormData(prev => ({ ...prev, name, slug }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Restoran oluşturulamadı');
        setCreating(false);
        return;
      }

      setShowCreateModal(false);
      setFormData({ name: '', slug: '', category: 'Restoran', notificationEmail: '', googlePlaceId: '', address: '', phone: '', primaryColor: '#1a73e8' });
      setIsManualSlug(false);
      fetchRestaurants();
    } catch (err) {
      setError('Bağlantı hatası');
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchRestaurants();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#111827] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[24px] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight uppercase">İşletmeler</h1>
          <p className="text-[#6b6760] text-[13px] sm:text-[15px] font-bold">Platformdaki tüm restoranları ve şubeleri yönetin.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-3 bg-[#FDBF1D] text-[#111827] px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-[#EAB308] transition-all active:scale-95 group"
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          Yeni İşletme
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#ada89f] group-focus-within:text-[#111827] transition-colors" size={20} strokeWidth={3} />
        <input 
          type="text"
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-[20px] pl-16 pr-8 py-5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-[#FDBF1D] transition-all"
        />
      </div>

      {/* Restaurant Cards Grid */}
      {restaurants.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-gray-100 p-16 sm:p-24 text-center space-y-6 shadow-sm">
          <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
            <Store size={48} className="text-gray-400" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-[#111827]">Henüz işletme kaydı yok</h3>
            <p className="text-[#6b6760] font-bold">İlk restoranınızı ekleyerek dijital itibarınızı yönetmeye başlayın.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-3 bg-[#FDBF1D] text-[#111827] px-10 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-[#EAB308] transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            İşletme Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {restaurants.filter(r => 
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.category.toLowerCase().includes(searchTerm.toLowerCase())
          ).map((r) => (
            <div key={r.id} className={`bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-md ${!r.isActive && 'opacity-70 grayscale-[0.5]'}`}>
              {/* Color strip */}
              <div className="h-2 w-full" style={{ backgroundColor: r.primaryColor }} />
              
              <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-sm"
                      style={{ backgroundColor: r.primaryColor }}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-[#111827] text-xl tracking-tight leading-none mb-2">{r.name}</h3>
                      <p className="text-[13px] font-bold text-[#ada89f]">/{r.slug}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(r.id, r.isActive)}
                    className={`transition-all active:scale-90 ${r.isActive ? 'text-[#10b981]' : 'text-[#ada89f]'}`}
                    title={r.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  >
                    {r.isActive ? (
                      <ToggleRight size={44} strokeWidth={1.5} />
                    ) : (
                      <ToggleLeft size={44} strokeWidth={1.5} />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-6 py-4 border-y-2 border-[#F7F4F0]">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[#ada89f] uppercase tracking-widest leading-none">KATEGORİ</p>
                    <p className="text-[13px] font-black text-[#111827]">{r.category.toUpperCase()}</p>
                  </div>
                  <div className="w-px h-8 bg-[#e8e4de]" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[#ada89f] uppercase tracking-widest leading-none">YORUM</p>
                    <p className="text-[13px] font-black text-[#ea580c]">{r._count.feedbacks} ADET</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/restaurants/${r.id}`}
                    className="flex-1 text-center py-3 sm:py-4 text-xs font-bold bg-[#111827] text-white rounded-xl shadow-sm hover:bg-gray-800 transition-all uppercase tracking-widest active:scale-95"
                  >
                    YÖNET
                  </Link>
                  <Link
                    href={`/admin/qr?restaurantId=${r.id}`}
                    className="flex-1 text-center py-3 sm:py-4 text-xs font-bold bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all uppercase tracking-widest active:scale-95"
                  >
                    QR KOD
                  </Link>
                  <Link
                    href={`/r/${r.slug}`}
                    target="_blank"
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-gray-500 bg-white hover:text-gray-900 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all active:scale-95 shrink-0"
                  >
                    <ExternalLink size={18} strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[24px] shadow-2xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 sm:p-10 border-b border-gray-100 bg-[#FCFBF7] relative">
              <h2 className="text-3xl font-black text-[#111827] tracking-tight uppercase">Yeni İşletme</h2>
              <p className="text-[#6b6760] text-sm font-bold mt-2">Sisteme yeni bir restoran veya şube tanımlayın.</p>
              
              <button 
                onClick={() => { setShowCreateModal(false); setError(''); }}
                className="absolute right-8 top-10 p-2 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar">
              {error && (
                <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-bold border border-red-200 text-center uppercase tracking-widest">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">İşletme Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Örn: Mamma's Burger Ankara"
                  className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold shadow-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">URL Slug (Otomatik) *</label>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-black text-[#6b6760] opacity-40">buaze.com/r/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                      setIsManualSlug(true);
                    }}
                    placeholder="mammas-burger"
                    className="flex-1 px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-[15px] font-bold tracking-tight shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold uppercase tracking-widest appearance-none cursor-pointer shadow-sm"
                  >
                    <option>Restoran</option>
                    <option>Kafe</option>
                    <option>Fast Food</option>
                    <option>Fine Dining</option>
                    <option>Meyhane</option>
                    <option>Pastane</option>
                    <option>Otobüs/Gemi</option>
                    <option>Diğer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Tema Rengi</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-12 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white shadow-sm"
                    />
                    <span className="text-sm font-black text-[#111827] font-mono">{formData.primaryColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Bildirim E-postası</label>
                  <input
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                    placeholder="yonetim@email.com"
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold shadow-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Telefon Numarası</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="05..."
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-[#FCFBF7] focus:ring-2 focus:ring-[#FDBF1D] outline-none text-sm font-bold shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-5 pt-10 border-t-2 border-[#F7F4F0]">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setError(''); }}
                  className="px-8 py-4 text-xs font-black text-[#6b6760] hover:text-[#111827] uppercase tracking-widest transition-colors"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center justify-center gap-3 bg-[#111827] text-white px-10 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-sm hover:scale-95 transition-all disabled:opacity-50"
                >
                  {creating ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
                  İŞLETMEYİ KAYDET
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
