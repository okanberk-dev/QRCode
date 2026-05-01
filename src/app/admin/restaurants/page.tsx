'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Store, Loader2, ToggleLeft, ToggleRight, Search, X, Info, MapPin, UtensilsCrossed, Link2, MoreHorizontal, Star, ExternalLink, Download, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { AlertBanner, Avatar, Badge, type BadgeKind, CardSkeleton, EmptyState, Modal, PageHeader, type TabItem, Tabs } from '@/components/ui';

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
  city?: string | null;
  kvkkText?: string | null;
  avgRating?: number | null;
  user: { id: string; email: string; name: string | null; plan: string; isActive: boolean } | null;
  _count: { feedbacks: number; menuItems: number; qrGenerations?: number; adminUsers?: number };
}

const PLAN_BADGE: Record<string, { label: string; kind: BadgeKind }> = {
  trial: { label: 'Trial', kind: 'warn' },
  monthly: { label: 'Aylık', kind: 'info' },
  yearly: { label: 'Yıllık', kind: 'ok' },
  pro: { label: 'Pro', kind: 'lime' },
  growth: { label: 'Growth', kind: 'info' },
  starter: { label: 'Starter', kind: 'ghost' },
  free: { label: 'Ücretsiz', kind: 'ghost' },
};

function planBadge(plan: string | undefined | null) {
  if (!plan) return PLAN_BADGE.trial;
  const lower = plan.toLowerCase();
  return PLAN_BADGE[lower] || { label: plan, kind: 'ghost' as BadgeKind };
}

interface Owner {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  isActive: boolean;
}

function hasKvkk(r: Restaurant): boolean {
  return !!(r.kvkkText && r.kvkkText.trim().length > 0);
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  // PR4 — URL-synced filters (Linear/Stripe pattern, useUrlFilter §28).
  // status default 'active' (önceki davranış); search ve plan boş.
  const filters = useUrlFilter({
    search: '',
    status: 'active' as 'active' | 'passive' | 'all',
    plan: 'all' as 'all' | 'pro' | 'growth' | 'starter' | 'trial',
  });
  const searchTerm = filters.values.search;
  const setSearchTerm = (v: string) => filters.set('search', v);
  const statusFilter = filters.values.status;
  const setStatusFilter = (v: 'active' | 'passive' | 'all') => filters.set('status', v);
  const planFilter = filters.values.plan;
  const setPlanFilter = (v: 'all' | 'pro' | 'growth' | 'starter' | 'trial') => filters.set('plan', v);
  // PR6 — Inline failure surface (Linear/Stripe pattern, CLAUDE.md §11).
  // fetch fail veya !res.ok'da set; success'te null. AlertBanner onDismiss
  // ile kullanıcı manuel kapatabilir.
  const [fetchError, setFetchError] = useState<string | null>(null);
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
    city: '',
    phone: '',
    primaryColor: '#C6F24E',
    userId: '',
  });
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);

  const fetchRestaurants = async (filter?: string, planArg?: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const currentFilter = filter || statusFilter;
      const currentPlan = planArg ?? planFilter;
      const res = await fetch(`/api/restaurants?status=${currentFilter}&plan=${currentPlan}`);
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
      } else {
        setFetchError('İşletmeler getirilemedi. Lütfen sayfayı yenileyin.');
      }
    } catch (e) {
      console.error(e);
      setFetchError('Bağlantı hatası — işletmeler şu an gelmiyor.');
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
  }, [statusFilter, planFilter]);

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
        body: JSON.stringify({ ...formData, googleReviewUrl: formData.googlePlaceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'İşletme oluşturulamadı');
        setCreating(false);
        return;
      }

      setShowCreateModal(false);
      setFormData({ name: '', slug: '', category: 'Restoran', notificationEmail: '', googlePlaceId: '', address: '', city: '', phone: '', primaryColor: '#C6F24E', userId: '' });
      setIsManualSlug(false);
      fetchRestaurants();
    } catch {
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
      <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
        <PageHeader eyebrow="İŞLETMELER" title="Yükleniyor…" />
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} height={220} />
          ))}
        </div>
      </div>
    );
  }

  // Primary tabs — plan-bazlı (1:1 design AdminBusinesses, line 102-107)
  const planTabs: TabItem[] = [
    { id: 'all', label: `Tümü (${restaurants.length})` },
    { id: 'pro', label: 'Pro' },
    { id: 'growth', label: 'Growth' },
    { id: 'starter', label: 'Starter' },
    { id: 'trial', label: 'Trial' },
  ];

  // Secondary control — operational status (preserved for "Pasif işletmeleri
  // gör" use case; design'da tek tab ama mevcut operatör akışı için kritik)
  const statusTabs: TabItem[] = [
    { id: 'active', label: 'Aktif' },
    { id: 'passive', label: 'Pasif' },
    { id: 'all', label: 'Hepsi' },
  ];

  // CSV export — design `Dışa aktar` button (1:1, line 96)
  const handleExport = () => {
    const headers = ['İşletme', 'Tür', 'Şehir', 'Plan', 'Yorum', 'Puan', 'Durum', 'Sahip', 'E-posta', 'Slug'];
    const rows = filteredRestaurants.map((r) => [
      r.name,
      r.category,
      r.city || '',
      r.user?.plan || '',
      String(r._count.feedbacks),
      r.avgRating != null ? r.avgRating.toFixed(1) : '',
      r.isActive ? 'Aktif' : 'Pasif',
      r.user?.name || '',
      r.user?.email || '',
      r.slug,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `isletmeler_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      {fetchError && (
        <AlertBanner kind="danger" onDismiss={() => setFetchError(null)}>
          {fetchError}
        </AlertBanner>
      )}
      <PageHeader
        eyebrow="İŞLETMELER"
        title={`${restaurants.length} kayıtlı işletme`}
        actions={
          <>
            <button onClick={handleExport} className="bz-btn-ghost">
              <Download size={14} strokeWidth={2} />
              Dışa aktar
            </button>
            <button onClick={() => setShowCreateModal(true)} className="bz-btn-primary">
              <Plus size={14} strokeWidth={2} />
              Yeni işletme
            </button>
          </>
        }
      />

      {/* Primary filter — plan tabs (1:1 design) */}
      <Tabs
        items={planTabs}
        active={planFilter}
        onChange={(id) => setPlanFilter(id as 'all' | 'pro' | 'growth' | 'starter' | 'trial')}
        ariaLabel="Plan filter"
      />

      {/* Secondary control — status + search */}
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
        <RestaurantTable
          rows={filteredRestaurants}
          onToggle={toggleActive}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          size={640}
          onClose={() => { setShowCreateModal(false); setError(''); }}
          title={
            <div>
              <p className="pulse-eyebrow text-[#737373]">Yeni Kayıt</p>
              <h2 className="mt-1 text-[22px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
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

interface RestaurantTableProps {
  rows: Restaurant[];
  onToggle: (id: string, currentStatus: boolean) => void;
}

function RestaurantTable({ rows, onToggle }: RestaurantTableProps) {
  // The desktop table lives inside `overflow-x-auto`, which clips
  // absolute-positioned dropdowns vertically (browsers treat `overflow-x: auto`
  // as also clipping `overflow-y`). Anchoring the menu via `position: fixed`
  // with viewport-space coords escapes both clip contexts.
  const [openMenu, setOpenMenu] = useState<
    | { id: string; top: number; right: number }
    | null
  >(null);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    // capture-phase scroll so nested scroll containers (the table itself)
    // also dismiss the menu.
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openMenu]);

  const toggleMenu = (id: string, target: HTMLElement) => {
    if (openMenu?.id === id) {
      setOpenMenu(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setOpenMenu({
      id,
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  const openRow = openMenu ? rows.find((r) => r.id === openMenu.id) : null;

  return (
    <div className="bz-card overflow-hidden">
      {/* Desktop: bz-table (1:1 design AdminBusinesses) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="bz-table">
          <thead>
            <tr>
              <th>İşletme</th>
              <th>Tür</th>
              <th>Şehir</th>
              <th>Plan</th>
              <th>Şube</th>
              <th>Yorum</th>
              <th>Puan</th>
              <th>KVKK</th>
              <th>Durum</th>
              <th aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const plan = planBadge(r.user?.plan);
              const kvkkOk = hasKvkk(r);
              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} size={28} color={r.primaryColor || '#0A0A0A'} fg="#FFFFFF" />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#0A0A0A] truncate" title={r.name}>{r.name}</div>
                        <div className="text-[11px] text-[#737373] truncate">{r.user?.name || r.user?.email || 'Sahip atanmamış'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-[12px] text-[#525252] capitalize">{r.category}</span></td>
                  <td>{r.city || '—'}</td>
                  <td><Badge kind={plan.kind}>{plan.label}</Badge></td>
                  <td className="bz-mono">1</td>
                  <td className="bz-mono">{r._count.feedbacks}</td>
                  <td>
                    {r.avgRating ? (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Star size={11} className="text-[#C6F24E] fill-[#C6F24E]" />
                        {r.avgRating.toFixed(1)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{kvkkOk ? <Badge kind="ok">Tam</Badge> : <Badge kind="danger">Eksik</Badge>}</td>
                  <td>
                    {r.isActive ? <Badge kind="ok">Aktif</Badge> : <Badge kind="warn">Duraklatıldı</Badge>}
                  </td>
                  <td>
                    <button
                      className="bz-btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(r.id, e.currentTarget);
                      }}
                      aria-label="İşlemler"
                      aria-haspopup="menu"
                      aria-expanded={openMenu?.id === r.id}
                    >
                      <MoreHorizontal size={14} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Viewport-anchored row menu (escapes the table's overflow-x-auto
          clipping context). Rendered once per open menu; coords come from
          the trigger button's bounding rect at click time. */}
      {openRow && openMenu && (
        <div
          role="menu"
          className="fixed z-50 w-48 rounded-xl border border-[#EDEDED] bg-white shadow-lg overflow-hidden"
          style={{ top: openMenu.top, right: openMenu.right }}
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/admin/restaurants/${openRow.id}`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
            onClick={() => setOpenMenu(null)}
          >
            Düzenle
          </Link>
          <Link
            href={`/admin/restaurants/${openRow.id}/menu`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
            onClick={() => setOpenMenu(null)}
          >
            <UtensilsCrossed size={13} strokeWidth={2} />
            Menü
          </Link>
          <Link
            href={`/admin/qr?restaurant=${openRow.id}`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
            onClick={() => setOpenMenu(null)}
          >
            <Link2 size={13} strokeWidth={2} />
            QR yönetimi
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggle(openRow.id, openRow.isActive);
              setOpenMenu(null);
            }}
            className="flex w-full items-center gap-2 border-t border-[#EDEDED] px-3 py-2 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAFA]"
          >
            {openRow.isActive ? (
              <ToggleRight size={13} strokeWidth={2} />
            ) : (
              <ToggleLeft size={13} strokeWidth={2} />
            )}
            {openRow.isActive ? 'Duraklat' : 'Aktifleştir'}
          </button>
        </div>
      )}

      {/* Mobile: compact horizontal card list (1:1 design MAdminBusinesses) */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {rows.map((r) => {
          const plan = planBadge(r.user?.plan);
          return (
            <Link
              key={r.id}
              href={`/admin/restaurants/${r.id}`}
              className="bz-card flex items-center gap-3 p-3.5 active:bg-[#FAFAFA] transition-colors"
            >
              <Avatar
                name={r.name}
                size={40}
                color={r.primaryColor || '#0A0A0A'}
                fg="#FFFFFF"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div
                    className="text-[13px] font-semibold text-[#0A0A0A] truncate flex-1"
                    title={r.name}
                  >
                    {r.name}
                  </div>
                  <Badge kind={plan.kind}>{plan.label}</Badge>
                </div>
                <div
                  className="flex items-center gap-1.5 text-[10.5px] text-[#737373]"
                >
                  {r.city && (
                    <>
                      <span className="truncate">{r.city}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  {r.avgRating != null && (
                    <>
                      <span className="inline-flex items-center gap-0.5">
                        <Star size={9} className="text-[#C6F24E] fill-[#C6F24E]" />
                        {r.avgRating.toFixed(1)}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span className="bz-mono">
                    {r._count.feedbacks} <span className="text-[#A3A3A3]">yrm</span>
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className="shrink-0 text-[#A3A3A3]" strokeWidth={2} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
