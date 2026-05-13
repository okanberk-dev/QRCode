'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Store, Loader2, ToggleLeft, ToggleRight, Search, X, Info, MapPin, UtensilsCrossed, Link2, MoreHorizontal, Star, ExternalLink, Download, Settings2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { AlertBanner, APCheckbox, Avatar, Badge, type BadgeKind, CardSkeleton, EmptyState, Modal, PageHeader, PanelSelectionBar, type TabItem, Tabs, useConfirmDialog } from '@/components/ui';

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

// Stage A5 §38.97 — bulk feature override (CLAUDE.md §5.2 master flags).
// 6 boolean field; UI adapt'i feature-access endpoint label'larıyla parite.
type FeatureKey =
  | 'googleReviewManagementEnabled'
  | 'pulseAiEnabled'
  | 'menuEnabled'
  | 'menuPublished'
  | 'aiAnalyticsEnabled'
  | 'externalPlatformsEnabled';

const FEATURE_OPTIONS: Array<{ key: FeatureKey; label: string; hint: string }> = [
  { key: 'googleReviewManagementEnabled', label: 'Google yorum yönetimi', hint: 'Sahteci yorum + AI cevap taslağı' },
  { key: 'pulseAiEnabled', label: 'Pulse AI', hint: 'Otomatik yanıt taslakları + tema çıkarımı' },
  { key: 'menuEnabled', label: 'Menü düzenleme', hint: 'Owner menü ekleyip yayınlayabilir' },
  { key: 'menuPublished', label: 'Menü yayında', hint: 'Public /menu/[slug] sayfası açık' },
  { key: 'aiAnalyticsEnabled', label: 'AI analitik', hint: 'Tema + weekly insight + sentiment progress' },
  { key: 'externalPlatformsEnabled', label: 'Dış platformlar', hint: 'Yemeksepeti / Getir / Trendyol / Tripadvisor / Yelp / Foursquare ...' },
];

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  // PR4 — URL-synced filters (Linear/Stripe pattern, useUrlFilter §28).
  // status default 'active' (önceki davranış); search ve plan boş.
  const filters = useUrlFilter({
    search: '',
    status: 'active' as 'active' | 'passive' | 'all',
    plan: 'all' as 'all' | 'pro' | 'growth' | 'starter' | 'trial',
    // attention: deeplink from /admin/dashboard "Needs attention" widget
    // (CLAUDE.md §11.36). Backend overrides status when set; UI surfaces an
    // info banner with "Filtreyi temizle" (clear) action.
    attention: '' as '' | 'quota_full' | 'unverified_platform',
  });
  const searchTerm = filters.values.search;
  const setSearchTerm = (v: string) => filters.set('search', v);
  const statusFilter = filters.values.status;
  const setStatusFilter = (v: 'active' | 'passive' | 'all') => filters.set('status', v);
  const planFilter = filters.values.plan;
  const setPlanFilter = (v: 'all' | 'pro' | 'growth' | 'starter' | 'trial') => filters.set('plan', v);
  const attention = filters.values.attention;
  const clearAttention = () => filters.set('attention', '');
  // PR6 — Inline failure surface (Linear/Stripe pattern, CLAUDE.md §11).
  // fetch fail veya !res.ok'da set; success'te null. AlertBanner onDismiss
  // ile kullanıcı manuel kapatabilir.
  const [fetchError, setFetchError] = useState<string | null>(null);
  // PR10 — multi-select for bulk activate/deactivate.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  // Stage A5 §38.97 — bulk feature override modal state.
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureKey, setFeatureKey] = useState<FeatureKey>('pulseAiEnabled');
  const [featureValue, setFeatureValue] = useState<boolean>(true);
  const [confirmDialog, askConfirm] = useConfirmDialog();
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
      const qp = new URLSearchParams();
      qp.set('status', currentFilter);
      qp.set('plan', currentPlan);
      if (attention) qp.set('attention', attention);
      const res = await fetch(`/api/restaurants?${qp.toString()}`);
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
    // fetchRestaurants is a stable closure capturing filter state; the listed
    // filters are the only intentional triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, planFilter, attention]);

  useEffect(() => {
    fetchOwners();
  }, []);

  // Filter değişince seçim sıfırlanmalı; aksi halde görünmeyen row'lar
  // selectedIds'de kalır ve bulk action onlara da uygulanır.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, planFilter, searchTerm, attention]);

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

  // PR10 — auto-dismiss bulk notice after 3.5s
  useEffect(() => {
    if (!bulkNotice) return;
    const t = setTimeout(() => setBulkNotice(null), 3500);
    return () => clearTimeout(t);
  }, [bulkNotice]);

  const runBulk = async (action: 'activate' | 'deactivate') => {
    if (selectedIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    setBulkNotice(null);
    try {
      const res = await fetch('/api/admin/restaurants/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkNotice(
          action === 'activate'
            ? `${data.processed} işletme aktif edildi`
            : `${data.processed} işletme duraklatıldı`,
        );
        setSelectedIds(new Set());
        await fetchRestaurants();
      } else {
        const err = await res.json().catch(() => ({}));
        setFetchError(err.error?.message || 'Toplu işlem başarısız.');
      }
    } catch (e) {
      console.error(e);
      setFetchError('Bağlantı hatası — toplu işlem tamamlanamadı.');
    } finally {
      setBulkBusy(false);
    }
  };

  // Stage A5 §38.97 — bulk feature override apply.
  const applyFeatureOverride = async () => {
    if (selectedIds.size === 0 || bulkBusy) return;
    const featureLabel = FEATURE_OPTIONS.find((f) => f.key === featureKey)?.label || featureKey;
    askConfirm({
      title: `${selectedIds.size} işletmede "${featureLabel}" değiştirilecek`,
      body: `${featureValue ? 'Açık' : 'Kapalı'} olarak ayarlanacak. Owner panelleri anında etkilenecek; ${featureKey === 'pulseAiEnabled' && !featureValue ? 'bekleyen AI taslakları silinecek.' : 'mevcut veriler korunacak.'}`,
      confirmLabel: featureValue ? 'Aç' : 'Kapat',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: async () => {
        setBulkBusy(true);
        setBulkNotice(null);
        try {
          const res = await fetch('/api/admin/restaurants/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ids: Array.from(selectedIds),
              action: 'feature_override',
              payload: { feature: featureKey, value: featureValue },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setBulkNotice(`${data.processed} işletmede "${featureLabel}" → ${featureValue ? 'açık' : 'kapalı'}`);
            setShowFeatureModal(false);
            setSelectedIds(new Set());
            await fetchRestaurants();
          } else {
            const err = await res.json().catch(() => ({}));
            setFetchError(err.error || 'Toplu özellik geçişi başarısız.');
          }
        } catch (e) {
          console.error(e);
          setFetchError('Bağlantı hatası — toplu özellik geçişi tamamlanamadı.');
        } finally {
          setBulkBusy(false);
        }
      },
    });
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
      {attention && (
        <AlertBanner kind="info" onDismiss={clearAttention}>
          {attention === 'unverified_platform' && 'Yalnızca Google Place ID doğrulanmamış işletmeler gösteriliyor.'}
          {attention === 'quota_full' && 'Yalnızca trial kotasının %90+ doldurmuş işletmeler gösteriliyor.'}
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

      {/*
        Stage 81 §38.161 — Filter toolbar mobile/tablet sticky-on-scroll
        (owner Stage 80 §38.160 Fix 4 paterni paralel — owner restaurants
        list `md:sticky md:top-16 md:z-20 md:bg-white/95 md:backdrop-blur
        lg:static`). Admin parity: tablet portrait'da scroll sırasında
        filter görünür kalır + topbar h-16 altında pin'lenir + Apple-soft
        backdrop-blur. Desktop (lg+) inline normal akış (`lg:static`).
      */}
      <div className="md:sticky md:top-16 md:z-20 md:-mx-3 md:px-3 md:py-2 md:bg-white/95 md:backdrop-blur sm:md:rounded-xl lg:static lg:bg-transparent lg:backdrop-blur-none lg:py-0 lg:mx-0 lg:px-0">
        {/* Primary filter — plan tabs (1:1 design) */}
        <Tabs
          items={planTabs}
          active={planFilter}
          onChange={(id) => setPlanFilter(id as 'all' | 'pro' | 'growth' | 'starter' | 'trial')}
          ariaLabel="Plan filter"
        />
      </div>

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
            aria-label="İşletme ara"
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
          selectedIds={selectedIds}
          onToggleSelect={(id, checked) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onToggleSelectAll={(checked) => {
            if (checked) {
              setSelectedIds(new Set(filteredRestaurants.map((r) => r.id)));
            } else {
              setSelectedIds(new Set());
            }
          }}
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
                    className="bz-btn-icon shrink-0"
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
                      className="bz-input w-full cursor-pointer rounded-2xl py-3 text-[14px]"
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
                    className="bz-input w-full cursor-pointer rounded-2xl py-3 text-[14px]"
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

      {/* PR10 — Bulk action floating toolbar (Stripe Dashboard pattern, §11).
          Stage A5 §38.97 — "Özellik aç/kapat" CTA eklendi. */}
      {selectedIds.size > 0 && (
        <PanelSelectionBar
          count={selectedIds.size}
          label="İŞLETME SEÇİLDİ"
          ariaLabel="Toplu işlem araç çubuğu"
          clearLabel="Seçimi temizle"
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              key: 'activate',
              label: 'Aktif et',
              icon: <ToggleRight size={13} strokeWidth={2.2} />,
              onClick: () => runBulk('activate'),
              disabled: bulkBusy,
              variant: 'primary',
            },
            {
              key: 'deactivate',
              label: 'Duraklat',
              icon: <ToggleLeft size={13} strokeWidth={2.2} />,
              onClick: () => runBulk('deactivate'),
              disabled: bulkBusy,
              variant: 'neutral',
            },
            {
              key: 'features',
              label: 'Özellik aç/kapat',
              icon: <Settings2 size={13} strokeWidth={2.2} />,
              onClick: () => setShowFeatureModal(true),
              disabled: bulkBusy,
              variant: 'lime',
            },
          ]}
        />
      )}

      {/* Stage A5 §38.97 — Feature override modal */}
      {showFeatureModal && (
        <Modal
          size={520}
          onClose={() => setShowFeatureModal(false)}
          title={
            <div>
              <p className="pulse-eyebrow text-[#737373]">Toplu özellik geçişi</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
                {selectedIds.size} işletmede özellik aç/kapat
              </h2>
              <p className="mt-1 text-[12px] text-[#525252]">
                Tek bir master flag, seçili tüm işletmelere uygulanır. Owner panelleri anında etkilenir.
              </p>
            </div>
          }
        >
          <div className="space-y-5">
            <AlertBanner kind="warn" icon={<Info size={14} strokeWidth={2} />}>
              Bu işlem geri alınamaz şekilde audit log&apos;a yazılır. Pulse AI kapatılırsa bekleyen taslaklar silinir; menü kapatılırsa ayrıca yayın da kapanır.
            </AlertBanner>

            <div className="space-y-2">
              <label className="pulse-eyebrow text-[#737373]">Özellik</label>
              <div className="grid gap-1.5">
                {FEATURE_OPTIONS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFeatureKey(f.key)}
                    aria-pressed={featureKey === f.key}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      featureKey === f.key
                        ? 'border-[#0A0A0A] bg-[#FAFAFA]'
                        : 'border-[#EDEDED] hover:border-[#A3A3A3]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#0A0A0A]">{f.label}</div>
                      <div className="mt-0.5 text-[11px] text-[#737373]">{f.hint}</div>
                    </div>
                    <span className="bz-mono mt-0.5 text-[10px] text-[#A3A3A3]">{f.key}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="pulse-eyebrow text-[#737373]">Değer</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFeatureValue(true)}
                  aria-pressed={featureValue === true}
                  className={`py-3 rounded-xl border pulse-eyebrow transition-colors ${
                    featureValue
                      ? 'bg-[#C6F24E] text-[#0A0A0A] border-[#A8D62E]'
                      : 'bg-white text-[#525252] border-[#EDEDED] hover:border-[#0A0A0A]'
                  }`}
                >
                  <ToggleRight size={14} className="inline mr-1.5" strokeWidth={2} />
                  AÇIK
                </button>
                <button
                  type="button"
                  onClick={() => setFeatureValue(false)}
                  aria-pressed={featureValue === false}
                  className={`py-3 rounded-xl border pulse-eyebrow transition-colors ${
                    !featureValue
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#525252] border-[#EDEDED] hover:border-[#0A0A0A]'
                  }`}
                >
                  <ToggleLeft size={14} className="inline mr-1.5" strokeWidth={2} />
                  KAPALI
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAFAFA] border border-[#EDEDED] p-3 text-[12px] text-[#525252]">
              <span className="bz-mono uppercase tracking-wider text-[#737373]">Önizleme</span>
              <p className="mt-1">
                <strong>{selectedIds.size}</strong> işletmede{' '}
                <strong>{FEATURE_OPTIONS.find((f) => f.key === featureKey)?.label}</strong>{' '}
                <strong>{featureValue ? 'açılacak' : 'kapatılacak'}</strong>.
              </p>
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#EDEDED] pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowFeatureModal(false)}
                className="bz-btn-ghost"
                disabled={bulkBusy}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={applyFeatureOverride}
                disabled={bulkBusy}
                className="bz-btn-primary disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} strokeWidth={2.2} />}
                Uygula
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDialog}

      {/* §38.171 Stage 91 — toast notice mobile bottom nav clearance.
          `--dash-bottom-nav-h` mobile 76px+safe-area, lg:+ otomatik 0. */}
      {bulkNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(var(--dash-bottom-nav-h)+12px)] left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#0A0A0A] text-white px-4 py-2 text-[12px] font-semibold shadow-lg lg:bottom-20"
        >
          {bulkNotice}
        </div>
      )}
    </div>
  );
}

interface RestaurantTableProps {
  rows: Restaurant[];
  onToggle: (id: string, currentStatus: boolean) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
}

function RestaurantTable({ rows, onToggle, selectedIds, onToggleSelect, onToggleSelectAll }: RestaurantTableProps) {
  const router = useRouter();
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = !allSelected && rows.some((r) => selectedIds.has(r.id));
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

  // Card grid layout (CLAUDE.md §38.42) — eski 2-pas (desktop tablo + mobile
  // card) tek responsive grid'e konsolide edildi. Tasarım kaynağı:
  // .design-owner-2026/components/mobile.jsx:222-237 MobileCustomers card paterni
  // (avatar + name + plan/status pill + meta line). Bulk select checkbox + more
  // menu kart içine entegre edildi.
  return (
    <>
      {/* Bulk select-all bar (sadece sayfada en az 1 kart varsa görünür).
          Stage 47 §38.128 — APCheckbox primitive (manuel ref-based
          indeterminate pattern → primitive). Pulse §11 lime fill +
          Indeterminate Minus icon. Mono uppercase label aynı. */}
      {rows.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2 px-1 text-[11.5px] text-[#525252]">
          <APCheckbox
            size="sm"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={onToggleSelectAll}
            ariaLabel="Tümünü seç"
            label={allSelected ? 'Hepsi seçili' : someSelected ? `${selectedIds.size} seçili` : 'Tümünü seç'}
            labelClassName="bz-mono uppercase tracking-wider !text-[11px]"
          />
          <span className="bz-mono text-[#737373]">{rows.length} işletme</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const plan = planBadge(r.user?.plan);
          const detailHref = `/admin/restaurants/${r.id}`;
          const isSelected = selectedIds.has(r.id);
          const onCardKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if ((e.target as HTMLElement).closest('button, a, input, [role="menu"]')) return;
            e.preventDefault();
            router.push(detailHref);
          };
          return (
            <div
              key={r.id}
              role="link"
              tabIndex={0}
              aria-label={`${r.name} detayını aç`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, a, input')) return;
                router.push(detailHref);
              }}
              onKeyDown={onCardKey}
              className={`bz-card cursor-pointer p-4 transition-colors hover:border-[#A3A3A3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${isSelected ? 'bg-[#EAF9B8]/40 border-[#A8D62E]' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onToggleSelect(r.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${r.name} seç`}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-[#0A0A0A] cursor-pointer"
                />
                <Avatar name={r.name} size={40} color={r.primaryColor || '#0A0A0A'} fg="#FFFFFF" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#0A0A0A] truncate" title={r.name}>
                        {r.name}
                      </div>
                      <div className="text-[11px] text-[#737373] truncate">
                        {r.user?.name || r.user?.email || 'Sahip atanmamış'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="bz-btn-icon shrink-0 -mt-1 -mr-1"
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
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <Badge kind={plan.kind}>{plan.label}</Badge>
                {r.isActive ? <Badge kind="ok">Aktif</Badge> : <Badge kind="warn">Duraklatıldı</Badge>}
                {r.category && (
                  <span className="text-[10.5px] uppercase tracking-wider text-[#A3A3A3] bz-mono">
                    {r.category}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3 text-[11.5px] text-[#525252] border-t border-[#EDEDED] pt-3">
                {r.city && (
                  <span className="truncate">{r.city}</span>
                )}
                <span className="inline-flex items-center gap-1 bz-mono">
                  {r._count.feedbacks}
                  <span className="text-[#A3A3A3]">yrm</span>
                </span>
                {r.avgRating != null ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[#0A0A0A]">
                    <Star size={11} className="text-[#C6F24E] fill-[#C6F24E]" />
                    {r.avgRating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-[#A3A3A3]">— puan yok</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Viewport-anchored action menu (kart içinde overflow clipping'e takılmaz).
          Coords trigger button'ın bounding rect'ından alınır. Mobile <640px:
          `.bz-menu--sheet` override coord'ları nötralize edip bottom sheet'e
          dönüştürür + backdrop tap-to-dismiss sağlar. */}
      {openRow && openMenu && (
        <>
          <div
            className="bz-menu-backdrop"
            aria-hidden="true"
            onClick={() => setOpenMenu(null)}
          />
          <div
            role="menu"
            className="bz-menu bz-menu--sheet fixed w-52"
            style={{ top: openMenu.top, right: openMenu.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/admin/restaurants/${openRow.id}`}
              role="menuitem"
              className="bz-menu-item"
              onClick={() => setOpenMenu(null)}
            >
              <Pencil size={13} strokeWidth={2} />
              Düzenle
            </Link>
            <Link
              href={`/admin/restaurants/${openRow.id}/menu`}
              role="menuitem"
              className="bz-menu-item"
              onClick={() => setOpenMenu(null)}
            >
              <UtensilsCrossed size={13} strokeWidth={2} />
              Menü
            </Link>
            <Link
              href={`/admin/qr?restaurant=${openRow.id}`}
              role="menuitem"
              className="bz-menu-item"
              onClick={() => setOpenMenu(null)}
            >
              <Link2 size={13} strokeWidth={2} />
              QR yönetimi
            </Link>
            <div className="bz-menu-divider" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onToggle(openRow.id, openRow.isActive);
                setOpenMenu(null);
              }}
              className="bz-menu-item"
            >
              {openRow.isActive ? (
                <ToggleRight size={13} strokeWidth={2} />
              ) : (
                <ToggleLeft size={13} strokeWidth={2} />
              )}
              {openRow.isActive ? 'Duraklat' : 'Aktifleştir'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
