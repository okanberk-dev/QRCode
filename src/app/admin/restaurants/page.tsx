'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Store, Loader2, ExternalLink, ToggleLeft, ToggleRight, Search, X, Info, MapPin, UtensilsCrossed, ArrowRight, Crown, Link2 } from 'lucide-react';
import Link from 'next/link';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, EmptyState, Modal, PageHeader, type TabItem, Tabs } from '@/components/ui';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  category: string;
  notificationEmail: string | null;
  primaryColor: string;
  isActive: boolean;
  menuEnabled: boolean;
  menuPublished: boolean;
  createdAt: string;
  user: { id: string; email: string; name: string | null; plan: string; isActive: boolean } | null;
  _count: { feedbacks: number; menuItems: number; qrGenerations?: number; adminUsers?: number };
}

interface Owner {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  isActive: boolean;
}

function menuStatus(r: Pick<Restaurant, 'menuEnabled' | 'menuPublished'>) {
  if (!r.menuEnabled) return { label: 'Kapalı', dot: 'bg-[#A3A3A3]', text: 'text-[#737373]' };
  if (!r.menuPublished) return { label: 'Taslak', dot: 'bg-[#D97706]', text: 'text-[#92400E]' };
  return { label: 'Yayında', dot: 'bg-[#16A34A]', text: 'text-[#166534]' };
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'passive' | 'all'>('active');
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
    primaryColor: '#C6F24E',
    userId: '',
  });
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);

  const fetchRestaurants = async (filter?: string) => {
    setLoading(true);
    try {
      const currentFilter = filter || statusFilter;
      const res = await fetch(`/api/restaurants?status=${currentFilter}`);
      if (res.ok) {
        const result = await res.json();
        // Handle both older array response and newer { data, meta } shape.
        // Never assign a non-array value — a later .filter() would crash.
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];
        setRestaurants(list);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchOwners = async () => {
    try {
      const res = await fetch('/api/admin/members');
      if (res.ok) {
        const data = await res.json();
        setOwners(Array.isArray(data) ? data : []);
      }
    } catch {
      // Restaurant owners are only available to superadmin. Other roles can
      // create/manage their own scoped businesses without this selector.
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [statusFilter]);

  useEffect(() => {
    fetchOwners();
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
        setError(data.error || 'İşletme oluşturulamadı');
        setCreating(false);
        return;
      }

      setShowCreateModal(false);
      setFormData({ name: '', slug: '', category: 'Restoran', notificationEmail: '', googlePlaceId: '', address: '', phone: '', primaryColor: '#C6F24E', userId: '' });
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

  const filteredRestaurants = useMemo(
    () =>
      restaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [restaurants, searchTerm],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-7 w-7 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  const statusTabs: TabItem[] = [
    { id: 'active', label: 'Aktif' },
    { id: 'passive', label: 'Pasif' },
    { id: 'all', label: 'Tümü' },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="İŞLETMELER"
        title={`${restaurants.length} kayıtlı işletme`}
        description="Restoran, kafe, otel, klinik veya mağaza fark etmeden tüm işletmeleri tek panelden yönet. Sahip ataması, aktiflik, menü yayını ve QR akışları burada görünür."
        actions={
          <button onClick={() => setShowCreateModal(true)} className="bz-btn-primary">
            <Plus size={14} strokeWidth={2} />
            Yeni işletme
          </button>
        }
      />

      {/* Filters and Search */}
      <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
        <Tabs
          items={statusTabs}
          active={statusFilter}
          onChange={(id) => setStatusFilter(id as 'active' | 'passive' | 'all')}
          ariaLabel="Status filter"
          className="md:w-auto"
        />

        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={14} strokeWidth={2} />
          <input
            type="text"
            placeholder="İşletme, URL, kategori veya sahip ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bz-input"
            style={{ paddingLeft: 36, paddingRight: searchTerm ? 36 : 12 }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 bz-btn-icon"
              aria-label="Aramayı temizle"
              style={{ width: 28, height: 28 }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Restaurant Cards Grid */}
      {restaurants.length === 0 ? (
        <EmptyState
          icon={<Store size={22} />}
          title="Henüz işletme yok"
          body="İlk işletmenizi ekleyin — QR kodu, menüsü ve geri bildirim akışı dakikalar içinde hazır olur."
          action={
            <button onClick={() => setShowCreateModal(true)} className="bz-btn-primary">
              <Plus size={14} strokeWidth={2} />
              İşletme ekle
            </button>
          }
        />
      ) : filteredRestaurants.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Sonuç bulunamadı"
          body={`"${searchTerm}" için işletme bulunamadı. Farklı bir arama terimi deneyin.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((r) => {
            const ms = menuStatus(r);
            return (
              <div
                key={r.id}
                className={`group relative overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#A3A3A3] hover:shadow-lg ${
                  !r.isActive ? 'opacity-75' : ''
                }`}
              >
                {/* Subtle accent rail (theme color) */}
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: r.primaryColor }} aria-hidden />

                <div className="space-y-5 p-5 sm:p-6">
                  {/* Header: avatar + name + active toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[18px] font-semibold text-white shadow-sm ring-1 ring-black/5"
                        style={{ backgroundColor: r.primaryColor }}
                      >
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="truncate text-[17px] font-medium leading-tight tracking-[-0.015em] text-[#0A0A0A]"
                          title={r.name}
                        >
                          {r.name}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="truncate font-mono text-[12px] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
                            /{r.slug}
                          </span>
                          <CopyUrlButton
                            url={`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${r.slug}`}
                            className="h-6 w-6"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(r.id, r.isActive)}
                      className={`shrink-0 rounded-lg p-1 transition-all hover:bg-[#F5F5F5] active:scale-90 ${
                        r.isActive ? 'text-[#16A34A]' : 'text-[#A3A3A3]'
                      }`}
                      title={r.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    >
                      {r.isActive ? <ToggleRight size={32} strokeWidth={1.75} /> : <ToggleLeft size={32} strokeWidth={1.75} />}
                    </button>
                  </div>

                  {/* Stats strip */}
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FAFAFA] p-3 ring-1 ring-[#EDEDED] sm:grid-cols-3 md:grid-cols-4">
                    <div className="min-w-0">
                      <p className="pulse-eyebrow text-[#737373]">Kategori</p>
                      <p className="mt-1 truncate text-[13px] font-medium text-[#0A0A0A]" title={r.category}>
                        {r.category}
                      </p>
                    </div>
                    <div className="min-w-0 border-x border-[#EDEDED] px-3">
                      <p className="pulse-eyebrow text-[#737373]">Yorum</p>
                      <p className="mt-1 text-[15px] font-medium tabular-nums text-[#0A0A0A]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {r._count.feedbacks}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="pulse-eyebrow text-[#737373]">QR</p>
                      <p className="mt-1 text-[15px] font-medium tabular-nums text-[#0A0A0A]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {r._count.qrGenerations ?? 0}
                      </p>
                    </div>
                    <div className="min-w-0 border-l border-[#EDEDED] pl-3">
                      <p className="pulse-eyebrow text-[#737373]">Menü</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${ms.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ms.dot}`} aria-hidden />
                          {ms.label}
                        </span>
                        <span className="text-[12px] text-[#737373]">· {r._count.menuItems}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EDEDED] bg-white p-3">
                    <p className="pulse-eyebrow text-[#737373]">İşletme Sahibi</p>
                    <div className="mt-2 flex min-w-0 items-center gap-2">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${r.user ? 'bg-[#EAF9B8] text-[#0A0A0A]' : 'bg-[#F5F5F5] text-[#737373]'}`}>
                        <Crown size={13} strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#0A0A0A]">{r.user?.name || r.user?.email || 'Sahip atanmamış'}</p>
                        <p className="truncate text-[11px] text-[#737373]">{r.user?.email || 'Detay sayfasından işletme sahibi seçilebilir.'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/restaurants/${r.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95"
                    >
                      Düzenle
                      <ArrowRight size={13} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      href={`/admin/restaurants/${r.id}/menu`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
                    >
                      <UtensilsCrossed size={13} strokeWidth={2.25} />
                      Menü
                    </Link>
                    <Link
                      href={`/admin/qr?restaurant=${r.id}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#525252] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] active:scale-90"
                      title="QR Kod"
                      aria-label="QR Kod"
                    >
                      <Link2 size={14} strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          size={640}
          onClose={() => { setShowCreateModal(false); setError(''); }}
          title={
            <div>
              <p className="pulse-eyebrow text-[#737373]">Yeni Kayıt</p>
              <h2 className="mt-1 text-[22px] font-medium tracking-[-0.015em] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
                İşletme Ekle
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">
                Sisteme restoran, otel, kafe, klinik veya mağaza gibi yeni bir işletme tanımlayın.
              </p>
            </div>
          }
        >
            <form onSubmit={handleCreate} className="space-y-5">
              {error && (
                <AlertBanner kind="danger" icon={<Info size={14} strokeWidth={2} className="mt-0.5" />}>
                  {error}
                </AlertBanner>
              )}

              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">İşletme Adı</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Örn: Gourmet Eats Ankara"
                  className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">URL Slug</label>
                <div className="flex items-center overflow-hidden rounded-2xl border border-[#EDEDED] bg-white transition-all focus-within:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#C6F24E]/40">
                  <span className="select-none whitespace-nowrap border-r border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-3 font-mono text-[12px] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
                    buaze.com/r/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                      setIsManualSlug(true);
                    }}
                    placeholder="gourmet-eats"
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-3 font-mono text-[14px] text-[#0A0A0A] outline-none placeholder:text-[#A3A3A3]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              {/* Google Review Link — emphasized */}
              <div className="rounded-2xl border border-[#C6F24E] bg-gradient-to-br from-[#EAF9B8]/60 via-[#EAF9B8]/30 to-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] text-[#0A0A0A] shadow-sm">
                      <MapPin size={16} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#0A0A0A]">
                        Google Yorum Bağlantısı
                        <span className="ml-1 text-[#737373]">(opsiyonel)</span>
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[#525252]">
                        Olumlu yorumlar bu bağlantıya yönlendirilir.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoogleInfo((v) => !v)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#525252] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] active:scale-95"
                    aria-label="Bilgi"
                  >
                    <Info size={14} strokeWidth={2} />
                  </button>
                </div>

                {showGoogleInfo && (
                  <div className="mb-3 rounded-xl border border-[#EDEDED] bg-white p-3.5">
                    <p className="pulse-eyebrow mb-2 text-[#0A0A0A]">Nasıl alınır?</p>
                    <ol className="ml-4 list-decimal space-y-1 text-[12px] leading-relaxed text-[#525252]">
                      <li>Google Haritalar&apos;ı açın ve işletmenizi aratın.</li>
                      <li>İşletmeye tıklayın, &quot;Paylaş&quot; butonuna basın.</li>
                      <li>Bağlantıyı kopyalayın ve aşağıya yapıştırın.</li>
                    </ol>
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] underline-offset-2 hover:underline"
                    >
                      <ExternalLink size={12} strokeWidth={2} />
                      Google Haritalar&apos;ı Aç
                    </a>
                  </div>
                )}

                <input
                  type="text"
                  value={formData.googlePlaceId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, googlePlaceId: e.target.value }))}
                  placeholder="https://maps.google.com/... veya Place ID"
                  className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {owners.length > 0 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="pulse-eyebrow text-[#737373]">İşletme Sahibi</label>
                    <select
                      value={formData.userId}
                      onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                      className="w-full cursor-pointer rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                    >
                      <option value="">Sahipsiz oluştur</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {(owner.name || owner.email)} · {owner.plan}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="pulse-eyebrow text-[#737373]">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full cursor-pointer rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                  >
                    <option>Restoran</option>
                    <option>Kafe</option>
                    <option>Otel</option>
                    <option>Klinik</option>
                    <option>Güzellik Merkezi</option>
                    <option>Mağaza</option>
                    <option>Fast Food</option>
                    <option>Fine Dining</option>
                    <option>Meyhane</option>
                    <option>Pastane</option>
                    <option>Otobüs/Gemi</option>
                    <option>Diğer</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="pulse-eyebrow text-[#737373]">Tema Rengi</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-[#EDEDED] bg-white px-3 py-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white [&::-webkit-color-swatch]:shadow-sm"
                    />
                    <span className="font-mono text-[13px] tabular-nums text-[#525252]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {formData.primaryColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="pulse-eyebrow text-[#737373]">Bildirim E-postası</label>
                  <input
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                    placeholder="yonetim@email.com"
                    className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="pulse-eyebrow text-[#737373]">Telefon Numarası</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="05..."
                    className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#EDEDED] pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setError(''); }}
                  className="bz-btn-ghost"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bz-btn-primary disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.25} />}
                  İşletmeyi Kaydet
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
