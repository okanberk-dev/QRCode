'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, Loader2, Plus, Search, Store, ToggleLeft, ToggleRight, X } from 'lucide-react';

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

export default function DashboardRestaurantsPage() {
  const params = useParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [isManualSlug, setIsManualSlug] = useState(false);
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

  const copy = locale === 'tr'
    ? {
        title: 'İşletmelerim',
        subtitle: 'Restoranlarınızı, şubelerinizi veya mağazalarınızı tek panelden yönetin.',
        add: 'Yeni İşletme',
        emptyTitle: 'Henüz işletme yok',
        emptyText: 'İlk işletmenizi ekleyerek QR ve yorum toplamaya başlayın.',
        manage: 'Yönet',
        qr: 'QR Kod',
        category: 'Kategori',
        reviews: 'Yorum',
        search: 'İşletme ara',
      }
    : {
        title: 'My Locations',
        subtitle: 'Manage your restaurants, branches, or stores from one panel.',
        add: 'New Location',
        emptyTitle: 'No location yet',
        emptyText: 'Create your first location to start collecting feedback.',
        manage: 'Manage',
        qr: 'QR Code',
        category: 'Category',
        reviews: 'Reviews',
        search: 'Search locations',
      };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/restaurants');
      if (!response.ok) return;

      const data = await response.json();
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleNameChange = (name: string) => {
    if (isManualSlug) {
      setFormData((prev) => ({ ...prev, name }));
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

    setFormData((prev) => ({ ...prev, name, slug }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'İşletme oluşturulamadı.');
        return;
      }

      setShowCreateModal(false);
      setFormData({
        name: '',
        slug: '',
        category: 'Restoran',
        notificationEmail: '',
        googlePlaceId: '',
        address: '',
        phone: '',
        primaryColor: '#1a73e8',
      });
      setIsManualSlug(false);
      fetchRestaurants();
    } catch (error) {
      console.error(error);
      setError(locale === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchRestaurants();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#111827]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-4 rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold text-[#6b6760] sm:text-base">{copy.subtitle}</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FDBF1D] px-6 py-3 text-sm font-black text-[#111827] shadow-sm"
        >
          <Plus size={18} strokeWidth={2.75} />
          {copy.add}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ada89f]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={copy.search}
          className="w-full rounded-[24px] border border-gray-100 bg-white py-4 pl-14 pr-5 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
        />
      </div>

      {restaurants.length === 0 ? (
        <div className="rounded-[28px] border border-gray-100 bg-white px-6 py-16 text-center shadow-sm sm:px-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FCFBF7] text-[#111827]">
            <Store size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-black text-[#111827]">{copy.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm font-bold text-[#6b6760]">{copy.emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {restaurants
            .filter((restaurant) =>
              restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              restaurant.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((restaurant) => (
              <div
                key={restaurant.id}
                className={`overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm transition-all ${!restaurant.isActive ? 'opacity-70 grayscale-[0.4]' : 'hover:-translate-y-1 hover:shadow-md'}`}
              >
                <div className="h-2 w-full" style={{ backgroundColor: restaurant.primaryColor }} />

                <div className="space-y-6 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
                        style={{ backgroundColor: restaurant.primaryColor }}
                      >
                        {restaurant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-[#111827]">{restaurant.name}</h3>
                        <p className="truncate text-xs font-bold text-[#ada89f]">/{restaurant.slug}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleActive(restaurant.id, restaurant.isActive)}
                      className={restaurant.isActive ? 'text-emerald-500' : 'text-[#ada89f]'}
                    >
                      {restaurant.isActive ? <ToggleRight size={40} strokeWidth={1.75} /> : <ToggleLeft size={40} strokeWidth={1.75} />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-[22px] bg-[#FCFBF7] p-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{copy.category}</p>
                      <p className="mt-2 text-sm font-black text-[#111827]">{restaurant.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ada89f]">{copy.reviews}</p>
                      <p className="mt-2 text-sm font-black text-[#111827]">{restaurant._count.feedbacks}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/${locale}/dashboard/restaurants/${restaurant.id}`}
                      className="flex-1 rounded-2xl bg-[#111827] px-4 py-3 text-center text-sm font-black text-white"
                    >
                      {copy.manage}
                    </Link>
                    <Link
                      href={`/${locale}/dashboard/qr?restaurant=${restaurant.id}`}
                      className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-black text-[#111827]"
                    >
                      {copy.qr}
                    </Link>
                    <Link
                      href={`/r/${restaurant.slug}`}
                      target="_blank"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#111827]"
                    >
                      <ExternalLink size={18} strokeWidth={2.75} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] sm:rounded-[28px] bg-white shadow-2xl">
            <div className="relative border-b border-gray-100 bg-[#FCFBF7] p-5 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-[#111827] pr-10">{copy.add}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                }}
                className="absolute right-5 top-5 rounded-2xl p-2 text-[#6b6760] transition-all hover:bg-white"
              >
                <X size={20} strokeWidth={2.75} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 sm:space-y-5 overflow-y-auto p-5 sm:p-6 md:p-8">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">İşletme Adı</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
                  />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">URL Slug</span>
                  <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-gray-200 bg-[#FCFBF7] px-3 sm:px-4">
                    <span className="shrink-0 text-[11px] sm:text-xs font-black text-[#6b6760]">buaze.com/r/</span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(event) => {
                        setFormData((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                        setIsManualSlug(true);
                      }}
                      className="min-w-0 w-full bg-transparent py-3.5 sm:py-4 text-sm font-bold text-[#111827] outline-none"
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">Kategori</span>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">Bildirim E-postası</span>
                  <input
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(event) => setFormData((prev) => ({ ...prev, notificationEmail: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
                  />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">Adres</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">Telefon</span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#111827] outline-none transition-all focus:ring-2 focus:ring-[#FDBF1D]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ada89f]">Tema Rengi</span>
                  <div className="flex h-[54px] items-center gap-3 rounded-2xl border border-gray-200 bg-[#FCFBF7] px-4">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(event) => setFormData((prev) => ({ ...prev, primaryColor: event.target.value }))}
                      className="h-10 w-12 cursor-pointer rounded-xl border-0 bg-transparent"
                    />
                    <span className="text-sm font-black text-[#111827]">{formData.primaryColor}</span>
                  </div>
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-[#111827]"
                >
                  {locale === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus size={18} strokeWidth={2.75} />}
                  {copy.add}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
