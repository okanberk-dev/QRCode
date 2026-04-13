'use client';

import { useState, useEffect } from 'react';
import { Plus, Store, Loader2, MoreVertical, Mail, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react';
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
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
    setFormData(prev => ({ ...prev, name, slug: prev.slug === '' ? slug : prev.slug }));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[10px_12px_0_0_#1f1e1d]">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#111827] tracking-tight uppercase">İşletmeler</h1>
          <p className="text-[#6b6760] text-[15px] font-bold">Platformdaki tüm restoranları ve şubeleri yönetin.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-3 bg-[#FDBF1D] text-[#111827] px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest border-[3px] border-[#1f1e1d] shadow-[0_6px_0_0_#1f1e1d] hover:bg-[#EAB308] active:translate-y-[6px] active:shadow-none transition-all group"
        >
          <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          Yeni İşletme
        </button>
      </div>

      {/* Restaurant Cards Grid */}
      {restaurants.length === 0 ? (
        <div className="bg-white rounded-[40px] border-[3px] border-dashed border-[#e8e4de] p-24 text-center space-y-6">
          <div className="w-24 h-24 bg-[#F7F4F0] rounded-[32px] flex items-center justify-center mx-auto border-2 border-[#e8e4de]">
            <Store size={48} className="text-[#ada89f]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-[#111827]">Henüz işletme kaydı yok</h3>
            <p className="text-[#6b6760] font-bold">İlk restoranınızı ekleyerek dijital itibarınızı yönetmeye başlayın.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-3 bg-[#FDBF1D] text-[#111827] px-10 py-5 rounded-2xl text-[15px] font-black uppercase tracking-widest border-[3px] border-[#1f1e1d] shadow-[0_8px_0_0_#1f1e1d] hover:bg-[#EAB308] active:translate-y-[8px] active:shadow-none transition-all"
          >
            <Plus size={22} strokeWidth={3} />
            İşletme Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {restaurants.map((r) => (
            <div key={r.id} className={`bg-white rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d] overflow-hidden transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${!r.isActive && 'opacity-70 grayscale-[0.5]'}`}>
              {/* Color strip */}
              <div className="h-3 w-full border-b-[3px] border-[#1f1e1d]" style={{ backgroundColor: r.primaryColor }} />
              
              <div className="p-8 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl border-[3px] border-[#1f1e1d] shadow-[4px_4px_0_0_#1f1e1d]"
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
                    className="flex-1 text-center py-4 text-xs font-black bg-[#111827] text-white rounded-xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#000] hover:bg-[#1f1e1d] active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
                  >
                    YÖNET
                  </Link>
                  <Link
                    href={`/admin/qr?restaurant=${r.id}`}
                    className="flex-1 text-center py-4 text-xs font-black bg-[#FDBF1D] text-[#111827] rounded-xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
                  >
                    QR KOD
                  </Link>
                  <Link
                    href={`/r/${r.slug}`}
                    target="_blank"
                    className="w-12 h-12 flex items-center justify-center text-[#111827] bg-[#FCFBF7] hover:bg-[#e8e4de] rounded-xl border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] active:translate-y-1 active:shadow-none transition-all"
                  >
                    <ExternalLink size={20} strokeWidth={3} />
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
          <div className="bg-white rounded-[40px] border-[4px] border-[#1f1e1d] shadow-[20px_24px_0_0_#FDBF1D] w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-10 border-b-[3px] border-[#1f1e1d] bg-[#FCFBF7]">
              <h2 className="text-3xl font-black text-[#111827] tracking-tight uppercase">Yeni İşletme</h2>
              <p className="text-[#6b6760] text-sm font-bold mt-2">Sisteme yeni bir restoran veya şube tanımlayın.</p>
            </div>

            <form onSubmit={handleCreate} className="p-10 space-y-8 overflow-y-auto no-scrollbar">
              {error && (
                <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-black border-2 border-red-500/20 shadow-[0_4px_0_0_#ef4444] text-center uppercase tracking-widest">
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
                  className="w-full px-6 py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#FCFBF7] focus:border-[#FDBF1D] focus:shadow-[0_0_0_4px_rgba(253,191,29,0.1)] outline-none text-[15px] font-bold transition-all"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="mammas-burger"
                    className="flex-1 px-6 py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#FCFBF7] focus:border-[#FDBF1D] outline-none text-[15px] font-black tracking-tight transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-6 py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#FCFBF7] outline-none text-sm font-black uppercase tracking-widest appearance-none cursor-pointer"
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
                      className="w-16 h-12 rounded-xl border-2 border-[#1f1e1d] cursor-pointer p-1 bg-white"
                    />
                    <span className="text-sm font-black text-[#111827] font-mono">{formData.primaryColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#ada89f] uppercase tracking-widest ml-1">Bildirim E-postası (Kritik Yorumlar İçin)</label>
                <input
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                  placeholder="yonetim@email.com"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-[#1f1e1d] bg-[#FCFBF7] outline-none text-sm font-bold transition-all"
                />
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
                  className="flex items-center gap-3 bg-[#111827] text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 border-[#1f1e1d] shadow-[0_6px_0_0_#000] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-50"
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
    </div>
  );
}
