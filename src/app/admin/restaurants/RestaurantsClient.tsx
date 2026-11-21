'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Store, Loader2, ToggleLeft, ToggleRight, Search, X, Info, MapPin, UtensilsCrossed, Link2, MoreHorizontal, Star, ExternalLink, Download, Settings2, Pencil, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDebouncedUrlInput, useUrlFilter } from '@/hooks/useUrlFilter';
import { AlertBanner, APCheckbox, Avatar, Badge, type BadgeKind, EmptyState, Modal, PageHeader, PanelSelectionBar, PulseMenu, PulseMenuDivider, PulseMenuItem, PulseSelect, Tabs, useConfirmDialog } from '@/components/ui';
import { countChains, groupByOwner, type FranchiseGroup } from '@/lib/admin-franchise';
import { SECTORS } from '@/lib/sectors';
import RestaurantsLoading from './loading';

export interface Restaurant {
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

// User.plan is the lifecycle bucket (trial | monthly | yearly | enterprise |
// free — CLAUDE.md §15.2), not the marketing tier. Labels match
// /admin/members and MemberBillingModal.
const PLAN_BADGE: Record<string, { label: string; kind: BadgeKind }> = {
  trial: { label: 'Deneme', kind: 'warn' },
  monthly: { label: 'Aylık', kind: 'info' },
  yearly: { label: 'Yıllık', kind: 'ok' },
  enterprise: { label: 'Kurumsal', kind: 'lime' },
  free: { label: 'Ücretsiz', kind: 'ghost' },
};

type PlanFilter = 'all' | 'trial' | 'monthly' | 'yearly' | 'enterprise' | 'free';
const PLAN_FILTERS: PlanFilter[] = ['all', 'trial', 'monthly', 'yearly', 'enterprise', 'free'];
type StatusFilter = 'active' | 'passive' | 'all';

// /api/restaurants caps a page at 100 rows; the list loads more on demand.
const PAGE_SIZE = 100;

function apiErrorMessage(body: unknown, fallback: string): string {
  const err = (body as { error?: unknown } | null)?.error;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

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
  { key: 'googleReviewManagementEnabled', label: 'Google yorum yönetimi', hint: 'Google yorumlarını listeleme + AI cevap taslağı' },
  { key: 'pulseAiEnabled', label: 'Pulse AI', hint: 'Otomatik yanıt taslakları + tema çıkarımı' },
  { key: 'menuEnabled', label: 'Menü düzenleme', hint: 'Owner menü ekleyip yayınlayabilir' },
  { key: 'menuPublished', label: 'Menü yayında', hint: 'Müşterilere açık menü sayfası yayında' },
  { key: 'aiAnalyticsEnabled', label: 'AI analitik', hint: 'Yorum temaları + haftalık AI özeti' },
  { key: 'externalPlatformsEnabled', label: 'Dış platformlar', hint: 'Yemeksepeti / Getir / Trendyol / Tripadvisor / Yelp / Foursquare ...' },
];

interface RestaurantsClientProps {
  /**
   * §40.10 server hydration — first page for the URL's filters, the same
   * rows GET /api/restaurants returns. Undefined keeps the client fetch.
   */
  initialRows?: Restaurant[];
  /** `meta.total` for `initialRows`. */
  initialTotal?: number;
}

export default function RestaurantsClient({ initialRows, initialTotal }: RestaurantsClientProps) {
  const hydrated = initialRows !== undefined;
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRows ?? []);
  const [owners, setOwners] = useState<Owner[]>([]);
  // PR4 — URL-synced filters (Linear/Stripe pattern, useUrlFilter §28).
  // status default 'active' (önceki davranış); search ve plan boş.
  const filters = useUrlFilter({
    search: '',
    status: 'active' as StatusFilter,
    plan: 'all' as PlanFilter,
    // Menu publish status filter — client-side (data zaten payload'da).
    // `published` = menuEnabled && menuPublished, `draft` = enabled && !published,
    // `disabled` = !enabled. Operator menu yayın akışını taramak için kullanır.
    menuStatus: 'all' as 'all' | 'published' | 'draft' | 'disabled',
    // attention: deeplink from /admin/dashboard "Needs attention" widget
    // (CLAUDE.md §11.36). Backend overrides status when set; UI surfaces an
    // info banner with "Filtreyi temizle" (clear) action.
    attention: '' as '' | 'quota_full' | 'unverified_platform',
    // §49 — "İşletmeler" list or businesses grouped by owner ("Franchise'lar").
    view: 'list' as 'list' | 'franchise',
    // One owner's businesses (from İşletme sahipleri → "İşletmeleri gör").
    owner: '',
  });
  // The field keeps its own value and writes the URL debounced — binding it
  // straight to the URL lost keystrokes during each router round trip. The
  // list filters on the local value, so results update while typing.
  const search = useDebouncedUrlInput(filters.values.search, (v) => filters.set('search', v));
  const searchTerm = search.input;
  const statusFilter = filters.values.status;
  const setStatusFilter = (v: StatusFilter) => filters.set('status', v);
  // Old bookmarks may still carry ?plan=pro|growth|starter — treat any value
  // outside the lifecycle buckets as "all" instead of an always-empty list.
  const planFilter: PlanFilter = PLAN_FILTERS.includes(filters.values.plan) ? filters.values.plan : 'all';
  const setPlanFilter = (v: PlanFilter) => filters.set('plan', v);
  const menuStatusFilter = filters.values.menuStatus;
  const setMenuStatusFilter = (v: 'all' | 'published' | 'draft' | 'disabled') => filters.set('menuStatus', v);
  const attention = filters.values.attention;
  const clearAttention = () => filters.set('attention', '');
  const view = filters.values.view === 'franchise' ? 'franchise' : 'list';
  const ownerFilter = filters.values.owner;
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
  // `loading` is the first load only (full skeleton). Later refetches keep the
  // page chrome on screen and only dim the list (`refreshing`).
  const [loading, setLoading] = useState(!hydrated);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(hydrated ? initialTotal ?? initialRows.length : 0);
  // Filters the current `total` belongs to. The header reads these instead of
  // the live tab state, so a new label never shows next to the old count
  // while a refetch is in flight.
  const [appliedFilters, setAppliedFilters] = useState({
    status: statusFilter,
    plan: planFilter,
    attention,
  });
  const [loadedPage, setLoadedPage] = useState(1);
  const hasLoadedRef = useRef(hydrated);
  // Server rows cover the first filter set; skip only that first fetch.
  const skipFirstFetchRef = useRef(hydrated);
  const requestIdRef = useRef(0);
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
  // The owner list only feeds the create form's owner selector, so it loads
  // when the form is first opened instead of on every page visit.
  const ownersRequestedRef = useRef(false);
  // "Şube ekle" on a franchise card opens the create form for that owner.
  const openCreate = (ownerId = '') => {
    if (!ownersRequestedRef.current) {
      ownersRequestedRef.current = true;
      void fetchOwners();
    }
    setFormData((prev) => ({ ...prev, userId: ownerId }));
    setShowCreateModal(true);
  };
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);

  const fetchRestaurants = async (opts: { append?: boolean } = {}) => {
    const append = opts.append === true;
    const nextPage = append ? loadedPage + 1 : 1;
    const requestId = ++requestIdRef.current;
    if (append) setLoadingMore(true);
    else if (hasLoadedRef.current) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);
    try {
      const qp = new URLSearchParams();
      qp.set('status', statusFilter);
      qp.set('plan', planFilter);
      if (attention) qp.set('attention', attention);
      if (ownerFilter) qp.set('ownerId', ownerFilter);
      qp.set('limit', String(PAGE_SIZE));
      qp.set('page', String(nextPage));
      const res = await fetch(`/api/restaurants?${qp.toString()}`);
      // A newer request (filter change) superseded this one — drop it.
      if (requestId !== requestIdRef.current) return;
      if (res.ok) {
        const result = await res.json();
        if (requestId !== requestIdRef.current) return;
        // Handle both older array response and newer { data, meta } shape.
        // Never assign a non-array value — a later .filter() would crash.
        const list: Restaurant[] = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];
        const metaTotal = typeof result?.meta?.total === 'number' ? result.meta.total : null;
        setRestaurants((prev) => {
          if (!append) return list;
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...list.filter((r) => !seen.has(r.id))];
        });
        setTotal((prevTotal) => metaTotal ?? (append ? prevTotal + list.length : list.length));
        setLoadedPage(nextPage);
        if (!append) setAppliedFilters({ status: statusFilter, plan: planFilter, attention });
        hasLoadedRef.current = true;
      } else {
        setFetchError('İşletmeler getirilemedi. Lütfen sayfayı yenileyin.');
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.error(e);
      setFetchError('Bağlantı hatası — işletmeler şu an gelmiyor.');
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  };

  const fetchOwners = async () => {
    try {
      // Envelope-aware — same `{ data, meta }` shape the restaurants fetch a
      // few lines above already handles. Without it the owner selector in the
      // create modal was always empty.
      const res = await fetch('/api/admin/members?perPage=100');
      if (res.ok) {
        const data = await res.json();
        setOwners(
          Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
        );
      }
    } catch {
      // Restaurant owners are only available to superadmin. Other roles can
      // create/manage their own scoped businesses without this selector.
    }
  };

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    fetchRestaurants();
    // fetchRestaurants is a stable closure capturing filter state; the listed
    // filters are the only intentional triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, planFilter, attention, ownerFilter]);

  // Filter değişince seçim sıfırlanmalı; aksi halde görünmeyen row'lar
  // selectedIds'de kalır ve bulk action onlara da uygulanır.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, planFilter, menuStatusFilter, searchTerm, attention, ownerFilter]);

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
        setError(apiErrorMessage(data, 'İşletme oluşturulamadı'));
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
    setFetchError(null);
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setFetchError(
          apiErrorMessage(
            body,
            currentStatus ? 'İşletme duraklatılamadı.' : 'İşletme aktifleştirilemedi.',
          ),
        );
        return;
      }
      setBulkNotice(currentStatus ? 'İşletme duraklatıldı' : 'İşletme aktifleştirildi');
      fetchRestaurants();
    } catch (e) {
      console.error(e);
      setFetchError('Bağlantı hatası — işlem tamamlanamadı.');
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
        const err = await res.json().catch(() => null);
        setFetchError(apiErrorMessage(err, 'Toplu işlem başarısız.'));
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
            const err = await res.json().catch(() => null);
            setFetchError(apiErrorMessage(err, 'Toplu özellik geçişi başarısız.'));
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
    () => {
      const lc = (v: string) => v.toLocaleLowerCase('tr');
      const term = lc(searchTerm.trim());
      return restaurants.filter((r) => {
        // Search match (name / slug / category / owner email-or-name)
        const matchesSearch =
          lc(r.name).includes(term) ||
          lc(r.slug).includes(term) ||
          lc(r.category).includes(term) ||
          lc(r.user?.email || '').includes(term) ||
          lc(r.user?.name || '').includes(term);
        if (!matchesSearch) return false;
        // Menu status — client-side filter (data zaten payload'da, ek API trip yok)
        if (menuStatusFilter === 'published' && !(r.menuEnabled && r.menuPublished)) return false;
        if (menuStatusFilter === 'draft' && !(r.menuEnabled && !r.menuPublished)) return false;
        if (menuStatusFilter === 'disabled' && r.menuEnabled) return false;
        return true;
      });
    },
    [restaurants, searchTerm, menuStatusFilter],
  );

  // Menu publish counts — tab labels'da görünür (operator'a anında hacim sinyali)
  const menuCounts = useMemo(() => {
    let published = 0;
    let draft = 0;
    let disabled = 0;
    for (const r of restaurants) {
      if (!r.menuEnabled) disabled++;
      else if (r.menuPublished) published++;
      else draft++;
    }
    return { published, draft, disabled };
  }, [restaurants]);

  // First load only: render the same skeleton as loading.tsx (§40.10) so the
  // segment skeleton hands over without a blank frame. Later refetches keep
  // the page chrome on screen and only dim the list (`refreshing`).
  if (loading) return <RestaurantsLoading />;

  // Server-side filters narrow `restaurants` itself; client-side ones
  // (search, menu status) narrow `filteredRestaurants`. Empty states must
  // tell "nothing registered" apart from "nothing matches".
  const serverFiltered = statusFilter !== 'all' || planFilter !== 'all' || !!attention || !!ownerFilter;
  const showAllBusinesses = () => {
    search.replaceInput('');
    filters.setMany({ status: 'all', plan: 'all', attention: '', menuStatus: 'all', search: '', owner: '' });
  };
  const clearClientFilters = () => {
    search.replaceInput('');
    filters.setMany({ search: '', menuStatus: 'all' });
  };
  const summary = appliedFilters.attention
    ? `${total} işletme dikkat istiyor`
    : appliedFilters.status === 'active'
    ? `${total} aktif işletme`
    : appliedFilters.status === 'passive'
    ? `${total} duraklatılmış işletme`
    : `${total} kayıtlı işletme`;
  const hasMore = restaurants.length < total;
  const groups = groupByOwner(filteredRestaurants);
  const chainCount = countChains(groups);
  const ownerCount = groups.filter((g) => g.ownerId !== null).length;
  const ownerLabel = ownerFilter
    ? (() => {
        const owner = restaurants.find((r) => r.user?.id === ownerFilter)?.user;
        return owner ? owner.name || owner.email : 'Seçili sahip';
      })()
    : '';

  // CSV export — design `Dışa aktar` button (1:1, line 96)
  const handleExport = () => {
    const headers = ['İşletme', 'Tür', 'Şehir', 'Plan', 'Yorum', 'Puan', 'Durum', 'Sahip', 'E-posta', 'Slug'];
    const rows = filteredRestaurants.map((r) => [
      r.name,
      r.category,
      r.city || '',
      r.user?.plan ? planBadge(r.user.plan).label : '',
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

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const setManySelected = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
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
      {ownerFilter && (
        <AlertBanner kind="info" onDismiss={() => filters.set('owner', '')}>
          Yalnızca <strong>{ownerLabel}</strong> hesabının işletmeleri gösteriliyor.
        </AlertBanner>
      )}
      <PageHeader
        eyebrow="İŞLETMELER"
        title="İşletmeler"
        description={`${summary} · ${ownerCount} işletme sahibi${chainCount > 0 ? ` · ${chainCount} zincir` : ''}`}
        actions={
          <>
            <button onClick={handleExport} className="bz-btn-ghost">
              <Download size={14} strokeWidth={2} />
              Dışa aktar
            </button>
            <button onClick={() => openCreate(ownerFilter)} className="bz-btn-primary">
              <Plus size={14} strokeWidth={2} />
              Yeni işletme
            </button>
          </>
        }
      />

      {/* §49 — one toolbar instead of three tab rows: view, search, then
          status / plan / menu as compact selects. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          items={[
            { id: 'list', label: 'İşletmeler', count: filteredRestaurants.length },
            { id: 'franchise', label: "Franchise'lar", count: ownerCount },
          ]}
          active={view}
          onChange={(id) => filters.set('view', id as 'list' | 'franchise')}
          ariaLabel="Görünüm"
          className="shrink-0"
        />
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={14} strokeWidth={2} />
          <input
            type="search"
            placeholder="İşletme, URL, kategori veya sahip ara…"
            aria-label="İşletme ara"
            value={searchTerm}
            onChange={(e) => search.setInput(e.target.value)}
            className="bz-input"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex lg:shrink-0">
          <PulseSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            ariaLabel="Durum filtresi"
            className="w-full lg:w-[130px]"
            options={[
              { value: 'active', label: 'Aktif' },
              { value: 'passive', label: 'Pasif' },
              { value: 'all', label: 'Durum' },
            ]}
          />
          <PulseSelect
            value={planFilter}
            onChange={(v) => setPlanFilter(v as PlanFilter)}
            ariaLabel="Plan filtresi"
            className="w-full lg:w-[130px]"
            options={[
              { value: 'all', label: 'Plan' },
              { value: 'trial', label: 'Deneme' },
              { value: 'monthly', label: 'Aylık' },
              { value: 'yearly', label: 'Yıllık' },
              { value: 'enterprise', label: 'Kurumsal' },
              { value: 'free', label: 'Ücretsiz' },
            ]}
          />
          <PulseSelect
            value={menuStatusFilter}
            onChange={(v) => setMenuStatusFilter(v as 'all' | 'published' | 'draft' | 'disabled')}
            ariaLabel="Menü filtresi"
            className="w-full lg:w-[170px]"
            options={[
              { value: 'all', label: 'Menü' },
              { value: 'published', label: `Menü yayında (${menuCounts.published})` },
              { value: 'draft', label: `Menü taslak (${menuCounts.draft})` },
              { value: 'disabled', label: `Menü kapalı (${menuCounts.disabled})` },
            ]}
          />
        </div>
      </div>

      <div
        aria-busy={refreshing}
        className={`space-y-4 transition-opacity ${refreshing ? 'pointer-events-none opacity-50' : ''}`}
      >
      {restaurants.length === 0 ? (
        <div className="bz-card">
          {serverFiltered ? (
            <EmptyState
              icon={<Search size={22} />}
              title="Bu filtreye uyan işletme yok"
              body="Seçili durum, plan veya sahip filtresiyle eşleşen işletme bulunamadı."
              action={
                <button onClick={showAllBusinesses} className="bz-btn-ghost">
                  <X size={14} strokeWidth={2} />
                  Tüm işletmeleri göster
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<Store size={22} />}
              title="Henüz işletme yok"
              body="İlk işletmeyi ekleyin — QR kodu, menüsü ve geri bildirim akışı dakikalar içinde hazır olur."
              action={
                <button onClick={() => openCreate()} className="bz-btn-primary">
                  <Plus size={14} strokeWidth={2} />
                  İşletme ekle
                </button>
              }
            />
          )}
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="bz-card">
          <EmptyState
            icon={<Search size={22} />}
            title="Sonuç bulunamadı"
            body={
              searchTerm.trim()
                ? `"${searchTerm.trim()}" ile eşleşen işletme bulunamadı.${hasMore ? ' Arama yalnızca yüklenen işletmelerde yapılır.' : ''}`
                : 'Seçili menü durumunda işletme yok.'
            }
            action={
              <button onClick={clearClientFilters} className="bz-btn-ghost">
                <X size={14} strokeWidth={2} />
                Filtreleri temizle
              </button>
            }
          />
        </div>
      ) : view === 'franchise' ? (
        <FranchiseView
          groups={groups}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectMany={setManySelected}
          onToggleActive={toggleActive}
          onAddBranch={(ownerId) => openCreate(ownerId)}
          onShowOwner={(ownerId) => filters.setMany({ owner: ownerId, view: 'list' })}
        />
      ) : (
        <BusinessList
          rows={filteredRestaurants}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectMany={setManySelected}
          onToggleActive={toggleActive}
          onShowOwner={(ownerId) => filters.set('owner', ownerId)}
        />
      )}

      {hasMore && restaurants.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <p className="text-[12px] text-[#737373]">
            {restaurants.length} / {total} işletme yüklendi
            {searchTerm.trim() || view === 'franchise' ? ' · arama, gruplama ve toplu işlemler yalnızca yüklenenlerde çalışır' : ''}
          </p>
          <button
            type="button"
            onClick={() => fetchRestaurants({ append: true })}
            disabled={loadingMore}
            className="bz-btn-ghost disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2} />}
            Daha fazla yükle
          </button>
        </div>
      )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          size={640}
          onClose={() => { setShowCreateModal(false); setError(''); }}
          // Guard accidental outside-click / ESC when the form has input
          // (CLAUDE.md §23.3 Modal closeGuard).
          closeGuard={() =>
            formData.name.trim() !== '' ||
            formData.slug.trim() !== '' ||
            formData.address.trim() !== '' ||
            formData.notificationEmail.trim() !== '' ||
            formData.userId.trim() !== ''
          }
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
                    <PulseSelect
                      value={formData.userId}
                      onChange={(v) => setFormData((prev) => ({ ...prev, userId: v }))}
                      ariaLabel="İşletme sahibi"
                      className="w-full"
                      options={[
                        { value: '', label: 'Sahipsiz oluştur' },
                        ...owners.map((owner) => ({
                          value: owner.id,
                          label: `${owner.name || owner.email} · ${planBadge(owner.plan).label}`,
                        })),
                      ]}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="pulse-eyebrow text-[#737373]">Kategori</label>
                  <PulseSelect
                    value={formData.category}
                    onChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}
                    ariaLabel="Kategori"
                    className="w-full"
                    // Shared sector list (same as the owner forms, src/lib/sectors.ts).
                    options={SECTORS.map((sec) => ({ value: sec.label, label: sec.display.tr }))}
                  />
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
                Seçtiğin özellik ayarı, seçili tüm işletmelere uygulanır. İşletme panelleri anında etkilenir.
              </p>
            </div>
          }
        >
          <div className="space-y-5">
            <AlertBanner kind="warn" icon={<Info size={14} strokeWidth={2} />}>
              Bu işlem işlem geçmişine kaydedilir. Pulse AI kapatılırsa bekleyen taslaklar silinir; menü kapatılırsa ayrıca yayın da kapanır.
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

// ── Row actions ───────────────────────────────────────────────────────────
// Radix-based PulseMenu: portaled + collision-aware, so the menu never hides
// under the table edge, the sticky topbar or the mobile bottom nav (the old
// hand-positioned fixed menu could).
function RowMenu({ r, onToggleActive }: { r: Restaurant; onToggleActive: (id: string, current: boolean) => void }) {
  const router = useRouter();
  return (
    <PulseMenu
      trigger={
        <button type="button" className="bz-btn-icon" aria-label={`${r.name} işlemleri`}>
          <MoreHorizontal size={15} strokeWidth={2} />
        </button>
      }
      className="min-w-[210px]"
    >
      <PulseMenuItem icon={<Pencil size={13} />} onSelect={() => router.push(`/admin/restaurants/${r.id}`)}>
        Düzenle
      </PulseMenuItem>
      <PulseMenuItem icon={<UtensilsCrossed size={13} />} onSelect={() => router.push(`/admin/restaurants/${r.id}/menu`)}>
        Menü
      </PulseMenuItem>
      <PulseMenuItem icon={<Link2 size={13} />} onSelect={() => router.push(`/admin/qr?restaurant=${r.id}`)}>
        QR yönetimi
      </PulseMenuItem>
      <PulseMenuItem icon={<ExternalLink size={13} />} onSelect={() => window.open(`/r/${r.slug}`, '_blank', 'noopener')}>
        Müşteri sayfasını aç
      </PulseMenuItem>
      {r.user && (
        <PulseMenuItem icon={<UserRound size={13} />} onSelect={() => router.push(`/admin/members/${r.user!.id}`)}>
          Sahip detayı
        </PulseMenuItem>
      )}
      <PulseMenuDivider />
      <PulseMenuItem
        icon={r.isActive ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
        danger={r.isActive}
        onSelect={() => onToggleActive(r.id, r.isActive)}
      >
        {r.isActive ? 'Duraklat' : 'Aktifleştir'}
      </PulseMenuItem>
    </PulseMenu>
  );
}

function MenuBadge({ r }: { r: Restaurant }) {
  if (!r.menuEnabled) return <Badge kind="ghost">Menü kapalı</Badge>;
  return r.menuPublished ? <Badge kind="ok">Menü yayında</Badge> : <Badge kind="warn">Menü taslak</Badge>;
}

function RatingCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-[#A3A3A3]">—</span>;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums text-[#0A0A0A]">
      <Star size={12} strokeWidth={0} className="fill-[#F5B400]" aria-hidden="true" />
      {value.toFixed(1)}
    </span>
  );
}

// ── İşletmeler: table (lg) + cards (mobile, §23.6) ──────────────────────────
interface BusinessListProps {
  rows: Restaurant[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSelectMany: (ids: string[], checked: boolean) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onShowOwner: (ownerId: string) => void;
}

function BusinessList({ rows, selectedIds, onToggleSelect, onSelectMany, onToggleActive, onShowOwner }: BusinessListProps) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = !allSelected && rows.some((r) => selectedIds.has(r.id));
  // Businesses per owner, to show "3 işletme" next to a chain owner.
  const perOwner = new Map<string, number>();
  for (const r of rows) if (r.user) perOwner.set(r.user.id, (perOwner.get(r.user.id) ?? 0) + 1);

  const ownerCell = (r: Restaurant) =>
    r.user ? (
      <div className="min-w-0">
        <Link href={`/admin/members/${r.user.id}`} className="block truncate text-[13px] text-[#0A0A0A] hover:underline underline-offset-2">
          {r.user.name || r.user.email}
        </Link>
        {(perOwner.get(r.user.id) ?? 0) > 1 && (
          <button
            type="button"
            onClick={() => onShowOwner(r.user!.id)}
            className="text-[11.5px] text-[#737373] hover:text-[#0A0A0A] hover:underline underline-offset-2"
          >
            {perOwner.get(r.user.id)} işletme · hepsini gör
          </button>
        )}
      </div>
    ) : (
      <span className="text-[12.5px] text-[#A3A3A3]">Sahip atanmamış</span>
    );

  return (
    <>
      <div className="bz-card hidden overflow-x-auto lg:block">
        <table className="bz-table">
          <thead>
            <tr>
              <th scope="col" className="w-10">
                <APCheckbox
                  size="sm"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(next) => onSelectMany(rows.map((r) => r.id), next)}
                  ariaLabel="Tümünü seç"
                />
              </th>
              <th scope="col">İşletme</th>
              <th scope="col">Sahip</th>
              <th scope="col">Plan</th>
              <th scope="col">Durum</th>
              <th scope="col">Menü</th>
              <th scope="col" className="text-right">Yorum</th>
              <th scope="col" className="text-right">Puan</th>
              <th scope="col" className="w-12"><span className="sr-only">İşlemler</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const plan = planBadge(r.user?.plan);
              const selected = selectedIds.has(r.id);
              return (
                <tr key={r.id} className={selected ? 'bg-[#F7FAEF]' : undefined}>
                  <td>
                    <APCheckbox size="sm" checked={selected} onChange={(next) => onToggleSelect(r.id, next)} ariaLabel={`${r.name} seç`} />
                  </td>
                  <td className="max-w-[300px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.name} size={32} color={r.primaryColor || '#0A0A0A'} fg="#FFFFFF" />
                      <div className="min-w-0">
                        <Link href={`/admin/restaurants/${r.id}`} className="block truncate text-[13.5px] font-semibold text-[#0A0A0A] hover:underline underline-offset-2">
                          {r.name}
                        </Link>
                        <span className="block truncate text-[12px] text-[#737373]">
                          {r.category}
                          {r.city ? ` · ${r.city}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[220px]">{ownerCell(r)}</td>
                  <td><Badge kind={plan.kind}>{plan.label}</Badge></td>
                  <td>{r.isActive ? <Badge kind="ok">Aktif</Badge> : <Badge kind="warn">Duraklatıldı</Badge>}</td>
                  <td><MenuBadge r={r} /></td>
                  <td className="text-right tabular-nums">{r._count.feedbacks}</td>
                  <td className="text-right"><RatingCell value={r.avgRating} /></td>
                  <td className="text-right"><RowMenu r={r} onToggleActive={onToggleActive} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        <div className="flex items-center justify-between px-1">
          <APCheckbox
            size="sm"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(next) => onSelectMany(rows.map((r) => r.id), next)}
            label={allSelected ? 'Hepsi seçili' : someSelected ? `${selectedIds.size} seçili` : 'Tümünü seç'}
          />
          <span className="text-[12px] text-[#737373]">{rows.length} işletme</span>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list">
          {rows.map((r) => {
            const plan = planBadge(r.user?.plan);
            const selected = selectedIds.has(r.id);
            return (
              <li key={r.id} className={`bz-card p-4 ${selected ? 'border-[#A8D62E] bg-[#F7FAEF]' : ''}`}>
                <div className="flex items-start gap-3">
                  <APCheckbox size="sm" checked={selected} onChange={(next) => onToggleSelect(r.id, next)} ariaLabel={`${r.name} seç`} className="mt-1.5" />
                  <Avatar name={r.name} size={36} color={r.primaryColor || '#0A0A0A'} fg="#FFFFFF" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/restaurants/${r.id}`} className="block truncate text-[14px] font-semibold text-[#0A0A0A]">
                      {r.name}
                    </Link>
                    <span className="block truncate text-[12px] text-[#737373]">
                      {r.user ? r.user.name || r.user.email : 'Sahip atanmamış'}
                    </span>
                  </div>
                  <RowMenu r={r} onToggleActive={onToggleActive} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge kind={plan.kind}>{plan.label}</Badge>
                  {r.isActive ? <Badge kind="ok">Aktif</Badge> : <Badge kind="warn">Duraklatıldı</Badge>}
                  <MenuBadge r={r} />
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-[#EDEDED] pt-3 text-[12.5px] text-[#525252]">
                  <span><span className="font-medium tabular-nums text-[#0A0A0A]">{r._count.feedbacks}</span> yorum</span>
                  <RatingCell value={r.avgRating} />
                  {r.city && <span className="truncate">{r.city}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

// ── Franchise'lar: businesses grouped by owner ─────────────────────────────
interface FranchiseViewProps {
  groups: FranchiseGroup<Restaurant>[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSelectMany: (ids: string[], checked: boolean) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onAddBranch: (ownerId: string) => void;
  onShowOwner: (ownerId: string) => void;
}

function FranchiseView({ groups, selectedIds, onToggleSelect, onSelectMany, onToggleActive, onAddBranch, onShowOwner }: FranchiseViewProps) {
  return (
    <ul className="space-y-3" role="list">
      {groups.map((g) => {
        const ids = g.restaurants.map((r) => r.id);
        const all = ids.every((id) => selectedIds.has(id));
        const some = !all && ids.some((id) => selectedIds.has(id));
        const plan = g.plan ? planBadge(g.plan) : null;
        const title = g.ownerId ? g.ownerName || g.ownerEmail || 'İşletme sahibi' : 'Sahibi atanmamış işletmeler';
        return (
          <li key={g.ownerId ?? 'none'} className="bz-card overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-[#EDEDED] bg-[#FCFCFC] p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <APCheckbox
                  size="sm"
                  checked={all}
                  indeterminate={some}
                  onChange={(next) => onSelectMany(ids, next)}
                  ariaLabel={`${title} işletmelerinin tümünü seç`}
                />
                <Avatar name={title} size={36} />
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-[#0A0A0A]">{title}</span>
                    {plan && <Badge kind={plan.kind}>{plan.label}</Badge>}
                    {g.restaurants.length > 1 && <Badge kind="dark" dot={false}>Zincir</Badge>}
                    {!g.ownerActive && <Badge kind="danger">Hesap pasif</Badge>}
                  </div>
                  {g.ownerEmail && g.ownerName && <span className="block truncate text-[12px] text-[#737373]">{g.ownerEmail}</span>}
                </div>
              </div>
              <dl className="grid grid-cols-4 gap-3 text-[12px] sm:flex sm:gap-5">
                <div><dt className="text-[#737373]">İşletme</dt><dd className="font-semibold tabular-nums text-[#0A0A0A]">{g.active}/{g.restaurants.length}</dd></div>
                <div><dt className="text-[#737373]">Yorum</dt><dd className="font-semibold tabular-nums text-[#0A0A0A]">{g.reviews}</dd></div>
                <div><dt className="text-[#737373]">Puan</dt><dd className="font-semibold"><RatingCell value={g.avgRating} /></dd></div>
                <div><dt className="text-[#737373]">Menü</dt><dd className="font-semibold tabular-nums text-[#0A0A0A]">{g.menuPublished}/{g.restaurants.length}</dd></div>
              </dl>
              {g.ownerId && (
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Link href={`/admin/members/${g.ownerId}`} className="bz-btn-ghost bz-btn-sm">
                    <UserRound size={13} />
                    Sahip
                  </Link>
                  <button type="button" onClick={() => onAddBranch(g.ownerId!)} className="bz-btn-ghost bz-btn-sm">
                    <Plus size={13} />
                    Şube ekle
                  </button>
                  {g.restaurants.length > 1 && (
                    <button type="button" onClick={() => onShowOwner(g.ownerId!)} className="bz-btn-ghost bz-btn-sm">
                      Listele
                    </button>
                  )}
                </div>
              )}
            </div>
            <ul className="divide-y divide-[#EDEDED]" role="list">
              {g.restaurants.map((r) => {
                const selected = selectedIds.has(r.id);
                return (
                  <li key={r.id} className={`flex items-center gap-3 px-4 py-2.5 ${selected ? 'bg-[#F7FAEF]' : ''}`}>
                    <APCheckbox size="sm" checked={selected} onChange={(next) => onToggleSelect(r.id, next)} ariaLabel={`${r.name} seç`} />
                    <Link href={`/admin/restaurants/${r.id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#0A0A0A] hover:underline underline-offset-2">
                      {r.name}
                      {r.city && <span className="font-normal text-[#737373]"> · {r.city}</span>}
                    </Link>
                    <span className="hidden sm:inline-flex">{r.isActive ? <Badge kind="ok">Aktif</Badge> : <Badge kind="warn">Duraklatıldı</Badge>}</span>
                    <span className="hidden md:inline-flex"><MenuBadge r={r} /></span>
                    <span className="w-14 text-right text-[12.5px] tabular-nums text-[#525252]">{r._count.feedbacks}</span>
                    <span className="w-12 text-right text-[12.5px]"><RatingCell value={r.avgRating} /></span>
                    <RowMenu r={r} onToggleActive={onToggleActive} />
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
