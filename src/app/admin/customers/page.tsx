'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Download, Loader2, Mail, MapPin, Phone, RefreshCw, Search, Star, Store, Users, X } from 'lucide-react';
import { AlertBanner, PageHeader, PulseSelect, StatCard } from '@/components/ui';
import { useDebouncedUrlInput, useUrlFilter } from '@/hooks/useUrlFilter';
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
  // Every filter change writes `page: 1` in the same URL update. The old
  // "reset page on filter change" effect plus a debounce timer holding a stale
  // `filters.set` closure re-applied old filters 300 ms after "Filtreleri
  // temizle" and bounced `?page=N` deep links N → 1 → N (members page parity).
  const range = filters.values.range;
  const setRange = (v: Range) => filters.setMany({ range: v, page: 1 });
  const restaurantId = filters.values.restaurantId;
  const setRestaurantId = (v: string) => filters.setMany({ restaurantId: v, page: 1 });
  const searchDebounced = filters.values.search;
  const searchBox = useDebouncedUrlInput(searchDebounced, (v) => filters.setMany({ search: v, page: 1 }));
  const search = searchBox.input;
  const setSearch = searchBox.setInput;
  const segmentFilter = filters.values.segment;
  const setSegmentFilter = (v: SegmentFilter) => filters.setMany({ segment: v, page: 1 });
  const hasEmail = filters.values.hasEmail;
  const setHasEmail = (v: boolean) => filters.setMany({ hasEmail: v, page: 1 });
  const hasPhone = filters.values.hasPhone;
  const setHasPhone = (v: boolean) => filters.setMany({ hasPhone: v, page: 1 });
  const hasComment = filters.values.hasComment;
  const setHasComment = (v: boolean) => filters.setMany({ hasComment: v, page: 1 });
  const page = filters.values.page;
  const setPage = (v: number) => filters.set('page', v);

  // Load restaurant options once (for the dropdown).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/restaurants?status=all&limit=200&fields=options');
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
    // §38.238 — `useUrlFilter.set` rebuilds the query string from the
    // `params` snapshot of the current render, so seven chained calls all
    // started from the same baseline and only the last one survived: the
    // button cleared `hasComment` and left every other filter applied.
    // `setMany` applies them in a single write.
    searchBox.replaceInput('');
    filters.setMany({
      range: '30d',
      restaurantId: '',
      search: '',
      segment: '',
      hasEmail: false,
      hasPhone: false,
      hasComment: false,
      page: 1,
    });
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
            label="Toplam geri bildirim"
            value={data.summary.feedbacks.toLocaleString('tr-TR')}
            icon={<Mail size={14} />}
          />
          <StatCard
            label="Ortalama puan"
            value={data.summary.avgRating !== null ? data.summary.avgRating.toFixed(2) : '—'}
            icon={<Star size={14} />}
            accent="#D7FE03"
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-[24px] border border-pn-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Range segmented control — full-width on mobile (each label gets its
              natural width) so labels never wrap; plain 12px label (no mono
              eyebrow tracking). */}
          <div className="flex w-full rounded-[20px] border border-pn-line bg-[#FFFFFF] p-1 sm:inline-flex sm:w-auto">
            {([
              { key: '7d', label: 'Son 7 gün' },
              { key: '30d', label: 'Son 30 gün' },
              { key: '90d', label: 'Son 90 gün' },
              { key: 'all', label: 'Tümü' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                aria-pressed={range === opt.key}
                className={`flex-auto whitespace-nowrap rounded-[14px] px-2 py-1.5 text-[12px] font-medium transition-all sm:flex-none sm:px-3 ${
                  range === opt.key ? 'bg-pn-ink text-white ' : 'text-pn-ink-2 hover:text-pn-ink'
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
            className="w-full sm:w-auto sm:min-w-[180px]"
          />

          {/* basis-full on mobile: `flex-1` (basis 0) used to squeeze the search
              next to the select at ~120px. */}
          <div className="relative basis-full sm:basis-auto sm:min-w-[200px] sm:flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, e-posta, telefon veya yorumda ara…"
              aria-label="Müşteri ara"
              className="w-full rounded-[20px] border border-pn-line bg-white py-2 pl-9 pr-3 text-[16px] font-medium text-pn-ink outline-none focus:ring-2 focus:ring-pn-accent sm:text-xs"
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
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${
                  active
                    ? 'border-pn-ink bg-pn-ink text-white'
                    : 'border-pn-line bg-white text-[#525252] hover:border-[#A3A3A3]'
                }`}
              >
                {pill.tr}
                {count !== null && (
                  <span
                    className={`tabular-nums tabular-nums text-[12px] rounded-full px-1.5 py-0.5 ${
                      active ? 'bg-white/15 text-white' : 'bg-pn-canvas text-[#737373]'
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

      <div className="overflow-hidden rounded-[24px] border border-pn-line bg-white ">
        {loading && !data ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={22} className="animate-spin text-pn-ink" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFFFF] text-[#6B7280]">
              <Users size={22} strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-pn-ink">Kriterlere uyan müşteri yok</p>
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
                  <tr className="text-[13px] font-medium text-[#737373]">
                    <th className="px-5 py-3">Müşteri</th>
                    <th className="px-5 py-3">İletişim</th>
                    <th className="px-5 py-3">İşletme</th>
                    <th className="px-5 py-3">Segment</th>
                    <th className="px-5 py-3 text-right">Son Puan</th>
                    <th className="px-5 py-3 text-right">Geri bildirim</th>
                    {/* §38.48 — Owner /customers paterni reuse: Son konu + Kanal */}
                    <th className="px-5 py-3">Son Konu</th>
                    <th className="px-5 py-3">Kanal</th>
                    <th className="px-5 py-3">Memnuniyet</th>
                    <th className="px-5 py-3">Son Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pn-line">
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
                        className="hover:bg-[#FFFFFF]/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pn-accent"
                      >
                        <td className="px-5 py-3 font-medium text-pn-ink">{r.name || 'İsimsiz'}</td>
                        <td className="px-5 py-3 text-pn-ink-2">
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
                        <td className="px-5 py-3 text-pn-ink-2">
                          {/* §38.48 — Platform inline label kaldırıldı; ayrı "Kanal"
                              kolonu eklendi (computeLastChannel helper-derive,
                              drift sıfır). */}
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 font-medium text-pn-ink">
                              <Store size={11} strokeWidth={2} />
                              {r.restaurantName || '—'}
                            </span>
                            {r.branch && (
                              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-pn-accent/15 px-2 py-0.5 font-medium text-pn-ink">
                              <Star size={11} fill="#D7FE03" strokeWidth={0} />
                              {r.lastRating}
                            </span>
                          ) : (
                            <span className="text-[#6B7280]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-pn-ink">{r.feedbackCount}</td>
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
                          <span className="tabular-nums inline-flex items-center rounded-full bg-pn-canvas px-2 py-0.5 text-[12px] text-[#525252] whitespace-nowrap">
                            {computeLastChannel(r.platform, 'tr')}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <SentimentBadge sentiment={r.sentiment} locale="tr" />
                        </td>
                        <td className="px-5 py-3 text-pn-ink-2">{new Date(r.lastAt).toLocaleDateString('tr-TR')}</td>
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
            <div className="divide-y divide-pn-line lg:hidden">
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
                    className="p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pn-accent"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-pn-ink">{r.name || 'İsimsiz'}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-medium text-pn-ink-2">
                          <Store size={11} strokeWidth={2} />
                          {r.restaurantName || '—'}
                        </p>
                      </div>
                      {r.lastRating !== null && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pn-accent/15 px-2 py-0.5 text-[12px] font-medium text-pn-ink">
                          <Star size={11} fill="#D7FE03" strokeWidth={0} />
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
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#737373]">
                      <span className="tabular-nums inline-flex items-center rounded-full bg-pn-canvas px-2 py-0.5 text-[#525252]">
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
                    <div className="mt-2 space-y-0.5 text-[12px] text-pn-ink-2">
                      {r.email && <p className="truncate"><Mail size={10} className="mr-1 inline" strokeWidth={2} />{r.email}</p>}
                      {r.phone && <p><Phone size={10} className="mr-1 inline" strokeWidth={2} />{r.phone}</p>}
                      {r.branch && <p><MapPin size={10} className="mr-1 inline" strokeWidth={2} />{r.branch}</p>}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[13px] font-medium text-[#6B7280]">
                      <span>{r.feedbackCount} geri bildirim</span>
                      <span>{new Date(r.lastAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div
                className="flex items-center justify-between gap-3 border-t border-pn-line bg-[#FFFFFF] px-5 py-3"
              >
                <p className="text-[13px] font-medium text-[#6B7280]">
                  Sayfa {data?.meta.page} / {totalPages} · Toplam {data?.meta.total}
                </p>
                {/* §38.77 — Pagination 44px mobile touch target (Stage 4
                    §38.74 paterni reuse). sm:+ 32px Pulse compact density. */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-[14px] border border-pn-line bg-white px-3 min-h-[44px] sm:min-h-[32px] text-[13px] font-medium text-pn-ink hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-40"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-[14px] border border-pn-line bg-white px-3 min-h-[44px] sm:min-h-[32px] text-[13px] font-medium text-pn-ink hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-40"
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
