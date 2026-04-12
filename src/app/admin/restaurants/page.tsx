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
        <Loader2 className="animate-spin text-[#1a73e8] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Restoranlar</h1>
          <p className="text-gray-500 text-sm">Platformdaki tüm restoranları yönetin.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#1a73e8] hover:bg-[#185abc] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
        >
          <Plus size={18} />
          Yeni Restoran
        </button>
      </div>

      {/* Restaurant Cards Grid */}
      {restaurants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Henüz restoran yok</h3>
          <p className="text-gray-500 text-sm mb-6">İlk restoranınızı ekleyerek başlayın.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-[#1a73e8] hover:bg-[#185abc] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Plus size={18} />
            Restoran Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {restaurants.map((r) => (
            <div key={r.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${r.isActive ? 'border-gray-100' : 'border-red-100 opacity-70'}`}>
              {/* Color strip */}
              <div className="h-2" style={{ backgroundColor: r.primaryColor }} />
              
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                      style={{ backgroundColor: r.primaryColor }}
                    >
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-base">{r.name}</h3>
                      <p className="text-xs text-gray-400">/{r.slug}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(r.id, r.isActive)}
                    title={r.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  >
                    {r.isActive ? (
                      <ToggleRight size={28} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-300" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-full text-xs font-medium">{r.category}</span>
                  <span>{r._count.feedbacks} yorum</span>
                </div>

                {r.notificationEmail && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                    <Mail size={12} />
                    <span className="truncate">{r.notificationEmail}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                  <Link
                    href={`/admin/restaurants/${r.id}`}
                    className="flex-1 text-center py-2 text-sm font-medium text-[#1a73e8] hover:bg-[#e8f0fe] rounded-lg transition-colors"
                  >
                    Düzenle
                  </Link>
                  <Link
                    href={`/admin/qr?restaurant=${r.id}`}
                    className="flex-1 text-center py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    QR Kod
                  </Link>
                  <Link
                    href={`/${r.slug}`}
                    target="_blank"
                    className="p-2 text-gray-400 hover:text-[#1a73e8] hover:bg-[#e8f0fe] rounded-lg transition-colors"
                  >
                    <ExternalLink size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Yeni Restoran Ekle</h2>
              <p className="text-sm text-gray-500 mt-1">QR kod platformuna yeni bir restoran ekleyin.</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restoran Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Örn: Mamma's Burger Ankara"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-400 mr-1">domain.com/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="mammas-burger"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                  >
                    <option>Restoran</option>
                    <option>Hamburger Restoranı</option>
                    <option>Pizza Restoranı</option>
                    <option>Kebap Restoranı</option>
                    <option>Kafe</option>
                    <option>Fast Food</option>
                    <option>Fine Dining</option>
                    <option>Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema Rengi</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-12 rounded-lg border border-gray-200 cursor-pointer p-1"
                    />
                    <span className="text-sm text-gray-500 font-mono">{formData.primaryColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bildirim E-postası</label>
                <input
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                  placeholder="restoran@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">1-3 yıldız puanlarda bu adrese bildirim gönderilir.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Place ID</label>
                <input
                  type="text"
                  value={formData.googlePlaceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, googlePlaceId: e.target.value }))}
                  placeholder="ChIJ..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Google Maps'ten aldığınız mekan kimliği. 4-5 yıldıza basanlar buraya yönlendirilecek.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Mahall Ankara, Çankaya"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(0312) 285 00 00"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1a73e8] focus:ring-2 focus:ring-[#e8f0fe] outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setError(''); }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 bg-[#1a73e8] hover:bg-[#185abc] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                  {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
