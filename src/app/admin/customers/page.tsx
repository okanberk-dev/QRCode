'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Download, Loader2, Mail, MapPin, Phone, RefreshCw, Search, Star, Store, Users, X } from 'lucide-react';
import { AlertBanner, PageHeader, PulseSelect, StatCard } from '@/components/ui';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { SegmentChip } from '@/components/customers/SegmentChip';
import { SentimentBadge } from '@/components/customers/SentimentBadge';
import type { CustomerSegment, CustomerSentiment } from '@/lib/customers';
import { computeLastChannel, computeLastTopic } from '@/lib/customers';
import AdminCustomerDrawer from './_components/AdminCustomerDrawer';

type Range = '7d' | '30d' | '90d' | 'all';
type SegmentFilter = '' | CustomerSegment;

interface CustomerRow {
  key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  restaurantId: string;
  restaurantName: string | null;
  branch: string | null;
  platform: string | null;
  lastRating: number | null;
  avgRating: number | null;
  feedbackCount: number;
  lastAt: string;
  // Phase 8c+ (CLAUDE.md §38.19) — derived enrichments.
  segment: CustomerSegment;
  ltv: number;
  sentiment: CustomerSentiment;
  daysSinceLastVisit: number | null;
  // §38.48 — son feedback'in raw aspect rating'leri (lastTopic için).
  lastFoodRating: number | null;
  lastServiceRating: number | null;
  lastAtmosphereRating: number | null;
}

interface SegmentCounts {
  all: number;
  vip: number;
  loyal: number;
  new: number;
  risk: number;
  churned: number;
}

interface CustomersResponse {
  data: CustomerRow[];
  meta: { total: number; page: number; limit: number; totalPages: number; truncated?: boolean };
  summary: {
    customers: number;
    feedbacks: number;
    avgRating: number | null;
    segmentCounts?: SegmentCounts;
  };
}

// Phase 8c+ §38.23 — `SENTIMENT_PRESENTATION` inline map'i `SentimentBadge`
// primitive'ine (CLAUDE.md §38.22) migrate edildi; admin/customers + drawer
// + owner /customers tek source-of-truth, drift sıfır.

interface RestaurantOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 25;

// §38.48 — `PLATFORM_LABEL` inline map silindi → `computeLastChannel` helper
// reuse (CLAUDE.md §38.47 + §38.48 drift sıfır source-of-truth).

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [data, setData] = useState<CustomersResponse | null>(null);

  // Drawer URL state — CLAUDE.md §38.93 (Stage A1) reuses owner pattern
  // (CLAUDE.md §38.14 Phase 8d). ?detail=KEY param drawer açar; row click
  // pushes the same param. Owner /dashboard/customers paterni mirror.
  const router = useRouter();
  const pathname = usePathname();
  const drawerSearchParams = useSearchParams();
  const openDrawer = (key: string) => {
    const next = new URLSearchParams(drawerSearchParams.toString());
    next.set('detail', key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Filters — PR4 URL synced (useUrlFilter §28).
  const filters = useUrlFilter({
    range: '30d' as Range,
    restaurantId: '',
    search: '',
    segment: '' as SegmentFilter,
    hasEmail: false as boolean,
    hasPhone: false as boolean,
    hasComment: false as boolean,
    page: 1,
  });
  const range = filters.values.range;
  const setRange = (v: Range) => filters.set('range', v);
  const restaurantId = filters.values.restaurantId;
  const setRestaurantId = (v: string) => filters.set('restaurantId', v);
  const searchDebounced = filters.values.search;
  const [search, setSearch] = useState(searchDebounced);
  const setSearchDebounced = (v: string) => filters.set('search', v);
  const segmentFilter = filters.values.segment;
  const setSegmentFilter = (v: SegmentFilter) => filters.set('segment', v);
  const hasEmail = filters.values.hasEmail;
  const setHasEmail = (v: boolean) => filters.set('hasEmail', v);
  const hasPhone = filters.values.hasPhone;
  const setHasPhone = (v: boolean) => filters.set('hasPhone', v);
  const hasComment = filters.values.hasComment;
  const setHasComment = (v: boolean) => filters.set('hasComment', v);
  const page = filters.values.page;
  const setPage = (v: number) => filters.set('page', v);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
    // setSearchDebounced is a useUrlFilter wrapper proxy — new reference each
    // render (CLAUDE.md §36). Adding to deps would loop. Search input string
    // is the only intentional trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Reset to first page whenever a non-page filter changes.
  useEffect(() => {
    setPage(1);
    // setPage is also a useUrlFilter wrapper proxy (see CLAUDE.md §36).
    // Filter values are the only intentional triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, restaurantId, searchDebounced, segmentFilter, hasEmail, hasPhone, hasComment]);

  // Load restaurant options once (for the dropdown).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/restaurants?status=all&limit=200');
        if (!res.ok) return;
        const body = await res.json();
        const list = Array.isArray(body)
          ? body
          : Array.isArray(body?.data)
          ? body.data
          : [];
        if (alive) {
          setRestaurants(list.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => { alive = false; };
  }, []);

  const buildQuery = useCallback((overrides: Partial<{ page: number }> = {}) => {
    const q = new URLSearchParams();
    q.set('range', range);
    if (restaurantId) q.set('restaurantId', restaurantId);
    if (searchDebounced) q.set('search', searchDebounced);
    if (segmentFilter) q.set('segment', segmentFilter);
    if (hasEmail) q.set('hasEmail', '1');
    if (hasPhone) q.set('hasPhone', '1');
    if (hasComment) q.set('hasComment', '1');
    q.set('limit', String(PAGE_SIZE));
    q.set('page', String(overrides.page ?? page));
    return q;
  }, [range, restaurantId, searchDebounced, segmentFilter, hasEmail, hasPhone, hasComment, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers?${buildQuery().toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Müşteriler yüklenemedi');
      setData(body);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [buildQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const downloadCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const q = buildQuery();
      q.delete('page');
      q.delete('limit');
      const res = await fetch(`/api/admin/customers/export?${q.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'CSV indirilemedi');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musteriler-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
    setExporting(false);
  };

  const hasActiveFilters = useMemo(
    () => !!(restaurantId || searchDebounced || segmentFilter || hasEmail || hasPhone || hasComment) || range !== '30d',
    [restaurantId, searchDebounced, segmentFilter, hasEmail, hasPhone, hasComment, range],
  );
  const resetFilters = () => {
    setRange('30d');
    setRestaurantId('');
    setSearch('');
    setSegmentFilter('');
    setHasEmail(false);
    setHasPhone(false);
    setHasComment(false);
  };

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const segmentCounts = data?.summary.segmentCounts;
  const truncated = !!data?.meta.truncated;

  // Segment filter pills config — TR/EN labels, count badges from backend
  // (pre-filter, her pill toplamı görünür).
  const SEGMENT_PILLS: Array<{ key: SegmentFilter; tr: string; en: string }> = [
    { key: '', tr: 'Tümü', en: 'All' },
    { key: 'vip', tr: 'VIP', en: 'VIP' },
    { key: 'loyal', tr: 'Düzenli', en: 'Loyal' },
    { key: 'new', tr: 'Yeni', en: 'New' },
    { key: 'risk', tr: 'Risk', en: 'Risk' },
    { key: 'churned', tr: 'Kayıp', en: 'Churned' },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="MÜŞTERİLER"
        title="Müşteriler"
        description="QR üzerinden geri bildirim bırakmış restoran müşterilerinin birleşik listesi. KVKK onayı olanlar gösterilir."
        actions={
          <>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bz-btn-ghost"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
              Yenile
            </button>
            <button
              onClick={downloadCsv}
              disabled={exporting || (data?.meta.total ?? 0) === 0}
              className="bz-btn-primary"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
              CSV İndir
            </button>
          </>
        }
      />

      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Tekil müşteri"
            value={data.summary.customers.toLocaleString('tr-TR')}
            icon={<Users size={14} />}
          />
          <StatCard
            label="Toplam feedback"
            value={data.summary.feedbacks.toLocaleString('tr-TR')}
            icon={<Mail size={14} />}
          />
          <StatCard
            label="Ortalama puan"
            value={data.summary.avgRating !== null ? data.summary.avgRating.toFixed(2) : '—'}
            icon={<Star size={14} />}
            accent="#C6F24E"
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#EDEDED] bg-[#FFFFFF] p-1 pulse-eyebrow">
            {([
              { key: '7d', label: 'Son 7 gün' },
              { key: '30d', label: 'Son 30 gün' },
              { key: '90d', label: 'Son 90 gün' },
              { key: 'all', label: 'Tümü' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  range === opt.key ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#1A1A1A] hover:text-[#0A0A0A]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <PulseSelect
            value={restaurantId}
            onChange={setRestaurantId}
            options={[
              { value: '', label: 'Tüm restoranlar' },
              ...restaurants.map((r) => ({ value: r.id, label: r.name })),
            ]}
            ariaLabel="Restoran filtresi"
            className="min-w-[180px]"
          />

          <div className="relative w-full flex-1 sm:w-auto sm:min-w-[200px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, e-posta, telefon veya yorumda ara…"
              aria-label="Müşteri ara"
              className="w-full rounded-xl border border-[#EDEDED] bg-white py-2 pl-9 pr-3 text-xs font-medium text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="bz-btn bz-btn-sm"
            >
              <X size={12} strokeWidth={2} />
              Filtreleri temizle
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 pulse-eyebrow">
          <FilterToggle active={hasEmail} onClick={() => setHasEmail(!hasEmail)}>E-posta var</FilterToggle>
          <FilterToggle active={hasPhone} onClick={() => setHasPhone(!hasPhone)}>Telefon var</FilterToggle>
          <FilterToggle active={hasComment} onClick={() => setHasComment(!hasComment)}>Yorum var</FilterToggle>
        </div>

        {/* Phase 8c+ segment filter pills (CLAUDE.md §38.19 — owner /customers
            ile parite). role=tablist + count badges (pre-filter). */}
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Segment filtresi"
        >
          {SEGMENT_PILLS.map((pill) => {
            const active = segmentFilter === pill.key;
            const count = segmentCounts
              ? pill.key === ''
                ? segmentCounts.all
                : segmentCounts[pill.key as CustomerSegment]
              : null;
            return (
              <button
                key={pill.key || 'all'}
                role="tab"
                aria-selected={active}
                onClick={() => setSegmentFilter(pill.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                  active
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3]'
                }`}
              >
                {pill.tr}
                {count !== null && (
                  <span
                    className={`bz-mono tabular-nums text-[10.5px] rounded-full px-1.5 py-0.5 ${
                      active ? 'bg-white/15 text-white' : 'bg-[#F5F5F5] text-[#737373]'
                    }`}
                  >
                    {count.toLocaleString('tr-TR')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {truncated && (
        <AlertBanner kind="warn">
          Çok fazla müşteri var; yalnızca ilk 5.000 kayıt gösteriliyor. Daha dar bir tarih aralığı veya restoran filtresi uygulayabilirsin.
        </AlertBanner>
      )}

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}

      <div className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-sm">
        {loading && !data ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFFFF] text-[#6B7280]">
              <Users size={22} strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-[#0A0A0A]">Kriterlere uyan müşteri yok</p>
            <p className="mt-1 text-xs font-medium text-[#6B7280]">Filtreleri değiştirerek veya temizleyerek tekrar deneyin.</p>
          </div>
        ) : (
          <>
            {/* Desktop table — Phase 8c+ (CLAUDE.md §38.19): Segment + LTV +
                Sentiment kolonları eklendi. Mevcut kolonlar korundu (admin
                cross-restaurant view'da "İşletme" kolonu kritik, drop edilmez
                — owner panelde drawer'da görünüyor, admin'de table'da kalır). */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1280px] text-left text-xs">
                <thead className="bg-[#FFFFFF]">
                  <tr className="pulse-eyebrow text-[#737373]">
                    <th className="px-5 py-3">Müşteri</th>
                    <th className="px-5 py-3">İletişim</th>
                    <th className="px-5 py-3">İşletme</th>
                    <th className="px-5 py-3">Segment</th>
                    <th className="px-5 py-3 text-right">Son Puan</th>
                    <th className="px-5 py-3 text-right">Feedback</th>
                    <th className="px-5 py-3 text-right">LTV</th>
                    {/* §38.48 — Owner /customers paterni reuse: Son konu + Kanal */}
                    <th className="px-5 py-3">Son Konu</th>
                    <th className="px-5 py-3">Kanal</th>
                    <th className="px-5 py-3">Memnuniyet</th>
                    <th className="px-5 py-3">Son Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDED]">
                  {rows.map((r) => {
                    return (
                      <tr
                        key={r.key}
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          // Don't fire when clicking nested actionable elements
                          // (mailto/tel anchor, etc.). CLAUDE.md §11.16 paterni.
                          if ((e.target as HTMLElement).closest('a, button, input, [role="button"]')) {
                            return;
                          }
                          openDrawer(r.key);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if ((e.target as HTMLElement).closest('a, button, input, [role="button"]')) {
                              return;
                            }
                            e.preventDefault();
                            openDrawer(r.key);
                          }
                        }}
                        className="hover:bg-[#FFFFFF]/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6F24E]"
                      >
                        <td className="px-5 py-3 font-semibold text-[#0A0A0A]">{r.name || 'İsimsiz'}</td>
                        <td className="px-5 py-3 text-[#1A1A1A]">
                          <div className="flex flex-col gap-0.5">
                            {r.email && (
                              <span className="inline-flex items-center gap-1.5 truncate">
                                <Mail size={11} className="text-[#6B7280]" strokeWidth={2} />
                                <a href={`mailto:${r.email}`} className="truncate hover:underline">{r.email}</a>
                              </span>
                            )}
                            {r.phone && (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone size={11} className="text-[#6B7280]" strokeWidth={2} />
                                <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="hover:underline">{r.phone}</a>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[#1A1A1A]">
                          {/* §38.48 — Platform inline label kaldırıldı; ayrı "Kanal"
                              kolonu eklendi (computeLastChannel helper-derive,
                              drift sıfır). */}
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 font-bold text-[#0A0A0A]">
                              <Store size={11} strokeWidth={2} />
                              {r.restaurantName || '—'}
                            </span>
                            {r.branch && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                                <MapPin size={10} strokeWidth={2} />
                                {r.branch}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <SegmentChip segment={r.segment} locale="tr" size="sm" />
                        </td>
                        <td className="px-5 py-3 text-right">
                          {r.lastRating !== null ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#C6F24E]/15 px-2 py-0.5 font-semibold text-[#0A0A0A]">
                              <Star size={11} fill="#C6F24E" strokeWidth={0} />
                              {r.lastRating}
                            </span>
                          ) : (
                            <span className="text-[#6B7280]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums text-[#0A0A0A]">{r.feedbackCount}</td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className="bz-mono tabular-nums text-[12px] font-semibold text-[#0A0A0A]"
                            title="Etkileşim ağırlığı (yorum × ortalama puan)"
                          >
                            {r.ltv.toLocaleString('tr-TR')}
                          </span>
                        </td>
                        {/* §38.48 — Son konu + Kanal (helper-derive, owner paterni reuse) */}
                        <td className="px-5 py-3 text-[#525252]">
                          {computeLastTopic(
                            {
                              rating: r.lastRating,
                              foodRating: r.lastFoodRating,
                              serviceRating: r.lastServiceRating,
                              atmosphereRating: r.lastAtmosphereRating,
                            },
                            'tr',
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="bz-mono inline-flex items-center rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[11px] text-[#525252] whitespace-nowrap">
                            {computeLastChannel(r.platform, 'tr')}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <SentimentBadge sentiment={r.sentiment} locale="tr" />
                        </td>
                        <td className="px-5 py-3 text-[#1A1A1A]">{new Date(r.lastAt).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — Phase 8c+ Segment + Sentiment row eklendi
                (CLAUDE.md §38.19, audit drawer-centric paterni — LTV mobile'da
                gizli, admin paneli desktop-first kullanıma yönelik). §38.93
                drawer paterniyle row click → drawer açar (owner mobile parite). */}
            <div className="divide-y divide-[#EDEDED] lg:hidden">
              {rows.map((r) => {
                return (
                  <div
                    key={r.key}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a, button, input, [role="button"]:not([data-row-trigger])')) {
                        return;
                      }
                      openDrawer(r.key);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if ((e.target as HTMLElement).closest('a, button, input, [role="button"]:not([data-row-trigger])')) {
                          return;
                        }
                        e.preventDefault();
                        openDrawer(r.key);
                      }
                    }}
                    data-row-trigger
                    aria-label={`Müşteri detayı: ${r.name || 'İsimsiz'}`}
                    className="p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6F24E]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0A0A0A]">{r.name || 'İsimsiz'}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] font-bold text-[#1A1A1A]">
                          <Store size={11} strokeWidth={2} />
                          {r.restaurantName || '—'}
                        </p>
                      </div>
                      {r.lastRating !== null && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#C6F24E]/15 px-2 py-0.5 text-[11px] font-semibold text-[#0A0A0A]">
                          <Star size={11} fill="#C6F24E" strokeWidth={0} />
                          {r.lastRating}
                        </span>
                      )}
                    </div>
                    {/* Phase 8c+: Segment chip + Sentiment dot row */}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <SegmentChip segment={r.segment} locale="tr" size="sm" />
                      <SentimentBadge sentiment={r.sentiment} locale="tr" />
                    </div>
                    {/* §38.48 — Kanal pill + Son konu metni (owner mobile paterni reuse) */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#737373]">
                      <span className="bz-mono inline-flex items-center rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[#525252]">
                        {computeLastChannel(r.platform, 'tr')}
                      </span>
                      <span className="text-[#525252]">
                        {computeLastTopic(
                          {
                            rating: r.lastRating,
                            foodRating: r.lastFoodRating,
                            serviceRating: r.lastServiceRating,
                            atmosphereRating: r.lastAtmosphereRating,
                          },
                          'tr',
                        )}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-[11px] text-[#1A1A1A]">
                      {r.email && <p className="truncate"><Mail size={10} className="mr-1 inline" strokeWidth={2} />{r.email}</p>}
                      {r.phone && <p><Phone size={10} className="mr-1 inline" strokeWidth={2} />{r.phone}</p>}
                      {r.branch && <p><MapPin size={10} className="mr-1 inline" strokeWidth={2} />{r.branch}</p>}
                    </div>
                    <div className="mt-2 flex items-center justify-between pulse-eyebrow text-[#6B7280]">
                      <span>{r.feedbackCount} feedback · LTV {r.ltv.toLocaleString('tr-TR')}</span>
                      <span>{new Date(r.lastAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div
                className="flex items-center justify-between gap-3 border-t border-[#EDEDED] bg-[#FFFFFF] px-5 py-3"
              >
                <p className="pulse-eyebrow text-[#6B7280]">
                  Sayfa {data?.meta.page} / {totalPages} · Toplam {data?.meta.total}
                </p>
                {/* §38.77 — Pagination 44px mobile touch target (Stage 4
                    §38.74 paterni reuse). sm:+ 32px Pulse compact density. */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-lg border border-[#EDEDED] bg-white px-3 min-h-[44px] sm:min-h-[32px] pulse-eyebrow text-[#0A0A0A] hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-40"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-lg border border-[#EDEDED] bg-white px-3 min-h-[44px] sm:min-h-[32px] pulse-eyebrow text-[#0A0A0A] hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-40"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer mount — URL state ?detail=KEY (CLAUDE.md §38.93) */}
      <AdminCustomerDrawer />
    </div>
  );
}

function FilterToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`${active ? 'bz-btn-primary' : 'bz-btn'} bz-btn-sm`}
    >
      {children}
    </button>
  );
}
