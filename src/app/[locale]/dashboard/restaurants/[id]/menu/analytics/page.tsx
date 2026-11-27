'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Eye, Info, Loader2, Lightbulb, MousePointerClick,
  Minus, Pencil, RefreshCw, RotateCcw, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from 'recharts';
import type { Locale } from '@/lib/translations';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { mapMenuApiError } from '@/lib/menu-api-error';
import { MeasuredChart } from '@/components/charts/MeasuredChart';
import { AlertBanner, PageHeader, PulseSelect } from '@/components/ui';
import { AnalyticsSkeleton } from './_components/AnalyticsSkeleton';

type Range = '7d' | '30d' | '90d' | 'all';

interface ProductRow {
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  views: number;
  clicks: number;
  ctr: number;
}

interface CategoryRow {
  categoryId: string;
  categoryName: string;
  kind: string;
  views: number;
  clicks: number;
  productClicks: number;
}

interface LowInterestRow extends ProductRow {
  status: 'low_interest' | 'needs_review' | 'check_description';
}

interface Insight {
  kind: string;
  title: string;
  description: string;
  relatedIds?: string[];
}

interface AnalyticsResponse {
  range: Range;
  window: { start: string | null; end: string };
  overview: {
    totalMenuViews: number;
    totalProductViews: number;
    totalCategoryClicks: number;
    totalProductClicks: number;
    totalUpsellClicks: number;
    productClickRate: number;
    compare: {
      menuViews: number | null;
      productViews: number | null;
      categoryClicks: number | null;
      productClickRate: number | null;
    } | null;
  };
  trend: { date: string; menuViews: number; productClicks: number }[];
  topProducts: ProductRow[];
  topCategories: CategoryRow[];
  lowInterest: LowInterestRow[];
  insights: Insight[];
  categories: { id: string; name: string }[];
  menu?: { enabled: boolean; published: boolean };
}

/** Legend text in body grey: Recharts paints it in the series colour, and lime on white is unreadable. */
const legendLabel = (value: string) => <span style={{ color: '#525252' }}>{value}</span>;

/** A report needs at least this many days with traffic before a time chart means anything. */
const MIN_TREND_DAYS = 3;

function buildCopy(isTr: boolean) {
  return {
    back: isTr ? 'Menü düzenleyici' : 'Menu editor',
    title: isTr ? 'Menü performansı' : 'Menu performance',
    subtitle: isTr
      ? 'Menünün nasıl görüldüğünü, hangi ürünlere dokunulduğunu ve neyi düzeltebileceğini gör.'
      : 'See how your menu is viewed, which items get tapped and what you can improve.',
    range7: isTr ? 'Son 7 gün' : 'Last 7 days',
    range30: isTr ? 'Son 30 gün' : 'Last 30 days',
    range90: isTr ? 'Son 90 gün' : 'Last 90 days',
    rangeAll: isTr ? 'Tüm zamanlar' : 'All time',
    range7Short: isTr ? '7G' : '7D',
    range30Short: isTr ? '30G' : '30D',
    range90Short: isTr ? '90G' : '90D',
    rangeAllShort: isTr ? 'Tümü' : 'All',
    period: isTr ? 'Dönem' : 'Period',
    filters: isTr ? 'Rapor filtreleri' : 'Report filters',
    categoryLabel: isTr ? 'Kategori' : 'Category',
    sourceLabel: isTr ? 'Kaynak' : 'Source',
    allCategories: isTr ? 'Tüm kategoriler' : 'All categories',
    allSources: isTr ? 'Tüm kaynaklar' : 'All sources',
    refresh: isTr ? 'Yenile' : 'Refresh',
    resetFilters: isTr ? 'Filtreleri temizle' : 'Reset filters',
    reset: isTr ? 'Temizle' : 'Reset',
    retry: isTr ? 'Tekrar dene' : 'Try again',
    allTimeTrendNote: isTr
      ? 'Zaman içi grafik “Son 7/30/90 gün” seçildiğinde görünür.'
      : 'The over-time chart appears when a 7, 30 or 90-day range is selected.',
    kpiMenuViews: isTr ? 'Menü açılışı' : 'Menu opens',
    kpiProductViews: isTr ? 'Görülen ürün' : 'Items seen',
    kpiCategoryClicks: isTr ? 'Kategori tıklamaları' : 'Category taps',
    kpiInterest: isTr ? 'İlgi oranı' : 'Interest rate',
    kpiInterestHint: isTr
      ? 'Görülen ürünlerin yüzde kaçına dokunuldu'
      : 'Share of seen items that were tapped',
    todo: isTr ? 'Ne yapmalı?' : 'What to do next',
    todoSub: isTr
      ? 'Menünü daha iyi hale getirmek için kısa öneriler.'
      : 'Short suggestions to improve your menu.',
    lowInterest: isTr ? 'Çok görülen ama az dokunulan ürünler' : 'Seen a lot, tapped rarely',
    todoEmpty: isTr
      ? 'Şimdilik önerimiz yok — menün iyi görünüyor. Ziyaretçi arttıkça öneriler burada belirir.'
      : 'No suggestions for now — your menu looks good. As more guests visit, suggestions will show up here.',
    editItem: isTr ? 'Ürünü düzenle' : 'Edit item',
    topProducts: isTr ? 'En çok görülen ürünler' : 'Most viewed items',
    topCategories: isTr ? 'Kategoriler' : 'Categories',
    notEnoughData: isTr ? 'Henüz yeterli veri yok.' : 'Not enough data yet.',
    trends: isTr ? 'Zaman içinde' : 'Over time',
    trendTaps: isTr ? 'Ürün tıklaması' : 'Item taps',
    legendViews: isTr ? 'Görüntülenme' : 'Views',
    legendClicks: isTr ? 'Tıklama' : 'Clicks',
    columns: {
      product: isTr ? 'Ürün' : 'Item',
      category: isTr ? 'Kategori' : 'Category',
      views: isTr ? 'Görüntülenme' : 'Views',
      clicks: isTr ? 'Tıklama' : 'Clicks',
      interest: isTr ? 'İlgi' : 'Interest',
      status: isTr ? 'Durum' : 'Status',
    },
    statusLabels: {
      low_interest: isTr ? 'İlgi düşük' : 'Low interest',
      needs_review: isTr ? 'Hiç dokunulmadı' : 'Never tapped',
      check_description: isTr ? 'Fotoğraf veya açıklama ekle' : 'Add a photo or description',
    } as Record<LowInterestRow['status'], string>,
    sourceLabels: {
      qr: 'QR',
      direct: isTr ? 'Doğrudan' : 'Direct',
      table: isTr ? 'Masa' : 'Table',
      link: isTr ? 'Bağlantı' : 'Link',
      delivery: isTr ? 'Teslimat' : 'Delivery',
    } as Record<string, string>,
    draftTitle: isTr ? 'Menün henüz yayında değil' : "Your menu isn't live yet",
    draftBody: isTr
      ? 'Yayına aldığında ziyaretler burada görünür.'
      : 'Once you publish it, visits will show up here.',
    goToMenu: isTr ? 'Menüye git' : 'Go to menu',
    noVisitsTitle: isTr ? 'Henüz ziyaret yok' : 'No visits yet',
    noVisitsBody: isTr
      ? "QR'ı indirip masalara koy; ilk ziyaretçiler burada görünür."
      : 'Download the QR and put it on your tables; your first guests will show up here.',
    downloadQr: isTr ? "QR'ı indir" : 'Download QR',
    showAllTime: isTr ? 'Tüm zamanlara bak' : 'View all time',
    noFilterDataTitle: isTr ? 'Bu filtreyle veri yok' : 'No data for these filters',
    noFilterDataBody: isTr
      ? 'Farklı bir tarih aralığı, kategori ya da kaynak dene.'
      : 'Try a different date range, category or source.',
  };
}
type Copy = ReturnType<typeof buildCopy>;

/** Number / percent formatters for one locale (kept together so every figure on the page agrees). */
function useFormatters(isTr: boolean) {
  return useMemo(() => {
    const tag = isTr ? 'tr-TR' : 'en-US';
    const count = new Intl.NumberFormat(tag);
    const percent = new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 1 });
    const percentSigned = new Intl.NumberFormat(tag, {
      style: 'percent',
      maximumFractionDigits: 0,
      signDisplay: 'exceptZero',
    });
    const points = new Intl.NumberFormat(tag, { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
    return {
      count: (n: number) => (Number.isFinite(n) ? count.format(n) : '—'),
      // A rate above 100 % is meaningless (guests are de-duplicated over
      // different windows for views and taps) — the API already caps it; this
      // is the belt to its braces.
      rate: (r: number) => (Number.isFinite(r) ? percent.format(Math.min(1, Math.max(0, r))) : '—'),
      change: (r: number) => percentSigned.format(r),
      points: (r: number) => `${points.format(r * 100)} ${isTr ? 'puan' : 'pts'}`,
    };
  }, [isTr]);
}
type Formatters = ReturnType<typeof useFormatters>;

function seenAndTapped(isTr: boolean, fmt: Formatters, views: number, rate: number) {
  return isTr
    ? `${fmt.count(views)} görüldü · ${fmt.rate(rate)} dokunuldu`
    : `${fmt.count(views)} seen · ${fmt.rate(rate)} tapped`;
}

export default function MenuAnalyticsPage() {
  const params = useParams();
  const id = params?.id as string;
  const locale = (params?.locale as Locale) ?? 'tr';
  const isTr = locale === 'tr';

  const [range, setRange] = useState<Range>('30d');
  const [categoryId, setCategoryId] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the newest request may update the screen (range / filter clicks can
  // overlap and responses arrive out of order).
  const requestSeq = useRef(0);

  const copy = useMemo(() => buildCopy(isTr), [isTr]);
  const fmt = useFormatters(isTr);
  const timeZone = useMemo(() => resolveDisplayTimeZone(), []);

  const fetchAnalytics = useCallback(async () => {
    if (!id) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ range, locale });
      if (categoryId) qs.set('categoryId', categoryId);
      if (sourceType) qs.set('sourceType', sourceType);
      const res = await fetch(`/api/restaurants/${id}/analytics/menu?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw { status: res.status, code: json?.code, error: json?.error };
      }
      if (seq !== requestSeq.current) return;
      setData(json as AnalyticsResponse);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(mapMenuApiError(e as Parameters<typeof mapMenuApiError>[0], isTr));
    }
    if (seq === requestSeq.current) setLoading(false);
  }, [id, range, categoryId, sourceType, locale, isTr]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const base = `/${locale}/dashboard/restaurants/${id}`;
  const hasAnyData = !!data && (
    data.overview.totalMenuViews +
    data.overview.totalProductViews +
    data.overview.totalProductClicks +
    data.overview.totalCategoryClicks
  ) > 0;
  const hasActiveFilters = !!(categoryId || sourceType);
  const resetFilters = () => {
    setCategoryId('');
    setSourceType('');
  };

  // The report's date range, in the business's own time zone (CLAUDE.md §46).
  const dateOnly = (iso: string | null | undefined) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone,
    });
  };
  const windowLabel = data?.window?.start
    ? `${dateOnly(data.window.start)} → ${dateOnly(data.window.end)}`
    : null;

  // First request: the very same skeleton the route's loading.tsx shows.
  if (loading && !data && !error) return <AnalyticsSkeleton />;

  const daysWithTraffic = data
    ? data.trend.filter((d) => d.menuViews > 0 || d.productClicks > 0).length
    : 0;

  const live = !!data?.menu?.enabled && !!data?.menu?.published;
  const categoryOptions = data?.categories ?? [];
  // One category = the same numbers as "all": only offer the filter from two up
  // (or while it is in use, so it can be cleared).
  const showCategoryFilter = categoryOptions.length > 1 || !!categoryId;
  const ranges = [
    { key: '7d', short: copy.range7Short, long: copy.range7 },
    { key: '30d', short: copy.range30Short, long: copy.range30 },
    { key: '90d', short: copy.range90Short, long: copy.range90 },
    { key: 'all', short: copy.rangeAllShort, long: copy.rangeAll },
  ] as const;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 lg:py-8">
      <div className="space-y-2">
        {/* Analytics is opened from the builder ("Diğer → Analitik"): back goes there. */}
        <Link
          href={`${base}/menu`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-[#525252] transition-colors hover:text-pn-ink sm:min-h-[32px]"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          {copy.back}
        </Link>
        <PageHeader
          className="!mb-0"
          title={copy.title}
          titleScale="compact"
          subtitle={windowLabel}
          description={copy.subtitle}
        />
      </div>

      {/* §49 — one toolbar: period segments, category + source selects, reset,
          refresh. Filters apply immediately. Always shown — even with no visits
          in the period, an older (or taken-offline) menu may have data under a
          wider range. Phones: segments full width, the rest one row below.
          From sm the controls group sits beside the segments when it fits and
          moves to its own line (refresh right-aligned) when it does not. */}
      <div role="group" aria-label={copy.filters} className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label={copy.period}
          className="flex w-full items-center gap-0.5 rounded-full border border-pn-line bg-white p-0.5 sm:inline-flex sm:w-auto"
        >
          {ranges.map((opt) => {
            const active = range === opt.key;
            return (
              <button
                type="button"
                key={opt.key}
                onClick={() => setRange(opt.key)}
                aria-pressed={active}
                className={`inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent sm:h-[28px] sm:min-h-0 sm:flex-none sm:text-[12px] ${
                  active ? 'bg-pn-accent text-white' : 'text-[#525252] hover:bg-pn-canvas hover:text-pn-ink'
                }`}
              >
                <span className="sm:hidden">{opt.short}</span>
                <span className="hidden sm:inline">{opt.long}</span>
              </button>
            );
          })}
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-auto">
          {showCategoryFilter && (
            <PulseSelect
              value={categoryId}
              onChange={setCategoryId}
              ariaLabel={copy.categoryLabel}
              className="min-w-0 flex-1 sm:w-[170px] sm:flex-none"
              options={[
                { value: '', label: copy.allCategories },
                ...categoryOptions.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}
          <PulseSelect
            value={sourceType}
            onChange={setSourceType}
            ariaLabel={copy.sourceLabel}
            className="min-w-0 flex-1 sm:w-[160px] sm:flex-none"
            options={[
              { value: '', label: copy.allSources },
              ...Object.entries(copy.sourceLabels).map(([key, label]) => ({ value: key, label })),
            ]}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              aria-label={copy.resetFilters}
              className="bz-btn-ghost w-11 shrink-0 px-0 sm:w-auto sm:px-3"
            >
              <RotateCcw size={13} strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline">{copy.reset}</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            aria-label={copy.refresh}
            className="bz-btn w-11 shrink-0 px-0 disabled:opacity-50 sm:ml-auto sm:w-auto sm:px-3"
          >
            {loading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <RefreshCw size={14} strokeWidth={2} aria-hidden />}
            <span className="hidden sm:inline">{copy.refresh}</span>
          </button>
        </div>
      </div>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {/* The banner has its own "try again" button — drop the sentence the
              message already ends with so it does not read twice. */}
          {error.replace(/\.\s+(Tekrar dene|Try again)\.$/, '.')}{' '}
          <button
            type="button"
            onClick={fetchAnalytics}
            className="font-medium underline underline-offset-2"
          >
            {copy.retry}
          </button>
        </AlertBanner>
      )}

      {!data ? null : !hasAnyData ? (
        <EmptyReport
          copy={copy}
          base={base}
          live={live}
          filtered={hasActiveFilters}
          onReset={resetFilters}
          // A live menu can be quiet in "Son 7 gün" and still have older
          // visits — offer the widest range instead of implying "never".
          onShowAll={range !== 'all' ? () => setRange('all') : undefined}
        />
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <OverviewCards overview={data.overview} copy={copy} fmt={fmt} isTr={isTr} />

          <TodoSection data={data} copy={copy} fmt={fmt} isTr={isTr} base={base} />

          <div className="grid gap-5 lg:grid-cols-2">
            <TopProducts rows={data.topProducts} copy={copy} fmt={fmt} isTr={isTr} />
            <TopCategoriesChart rows={data.topCategories} copy={copy} />
          </div>

          {data.trend.length > 0 && daysWithTraffic >= MIN_TREND_DAYS ? (
            <TrendChart trend={data.trend} copy={copy} isTr={isTr} />
          ) : range === 'all' ? (
            <div className="flex items-center gap-3 rounded-[24px] border border-pn-line bg-[#FFFFFF] p-4 text-xs font-medium text-[#6B7280]">
              <Info size={14} className="shrink-0" strokeWidth={2} />
              <span>{copy.allTimeTrendNote}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function EmptyReport({
  copy, base, live, filtered, onReset, onShowAll,
}: {
  copy: Copy;
  base: string;
  live: boolean;
  filtered: boolean;
  onReset: () => void;
  onShowAll?: () => void;
}) {
  let title = copy.draftTitle;
  let body = copy.draftBody;
  let action: React.ReactNode = (
    <Link href={`${base}/menu`} className="bz-btn-primary">
      {copy.goToMenu}
    </Link>
  );
  if (filtered) {
    title = copy.noFilterDataTitle;
    body = copy.noFilterDataBody;
    action = (
      <button type="button" onClick={onReset} className="bz-btn-primary">
        {copy.resetFilters}
      </button>
    );
  } else if (live) {
    title = copy.noVisitsTitle;
    body = copy.noVisitsBody;
    action = (
      <Link href={`${base}/menu?share=1`} className="bz-btn-primary">
        {copy.downloadQr}
      </Link>
    );
  }
  return (
    <div className="bz-card px-6 py-10 text-center sm:p-12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pn-canvas">
        <Sparkles size={26} strokeWidth={2} className="text-[#6B7280]" />
      </div>
      <h2 className="text-lg font-medium tracking-tight text-pn-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#6B7280]">{body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {action}
        {live && !filtered && onShowAll ? (
          <button type="button" onClick={onShowAll} className="bz-btn">
            {copy.showAllTime}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function OverviewCards({
  overview, copy, fmt, isTr,
}: {
  overview: AnalyticsResponse['overview'];
  copy: Copy;
  fmt: Formatters;
  isTr: boolean;
}) {
  const cards: {
    label: string;
    value: string;
    delta: number | null | undefined;
    kind: 'change' | 'points';
    icon: typeof Eye;
    hint?: string;
  }[] = [
    { label: copy.kpiMenuViews, value: fmt.count(overview.totalMenuViews), delta: overview.compare?.menuViews, kind: 'change', icon: Eye },
    { label: copy.kpiProductViews, value: fmt.count(overview.totalProductViews), delta: overview.compare?.productViews, kind: 'change', icon: Eye },
    { label: copy.kpiCategoryClicks, value: fmt.count(overview.totalCategoryClicks), delta: overview.compare?.categoryClicks, kind: 'change', icon: MousePointerClick },
    { label: copy.kpiInterest, value: fmt.rate(overview.productClickRate), delta: overview.compare?.productClickRate, kind: 'points', icon: TrendingUp, hint: copy.kpiInterestHint },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const hasDelta = c.delta !== null && c.delta !== undefined && Number.isFinite(c.delta);
        const deltaValue = hasDelta ? (c.delta as number) : 0;
        // A change that rounds to "0" reads as "same", not as growth.
        const unchanged = hasDelta && (c.kind === 'points' ? Math.abs(deltaValue * 100) < 0.05 : Math.abs(deltaValue) < 0.005);
        const positive = hasDelta && deltaValue > 0;
        const deltaText = hasDelta
          ? c.kind === 'points'
            ? fmt.points(deltaValue)
            : fmt.change(deltaValue)
          : '';
        return (
          <div key={c.label} className="bz-card min-w-0 space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[12px] font-medium leading-3 text-[#525252]" title={c.hint ? `${c.label} — ${c.hint}` : c.label}>
                {c.label}
              </p>
              <Icon size={14} strokeWidth={2} className="shrink-0 text-pn-ink-2" />
            </div>
            <p className="truncate text-[26px] font-medium leading-7 tracking-tight text-pn-ink">{c.value}</p>
            {hasDelta ? (
              <div className={`flex min-w-0 items-start gap-1 text-[12px] font-medium leading-3 ${unchanged ? 'text-[#6B7280]' : positive ? 'text-[#166534]' : 'text-[#991B1B]'}`}>
                {unchanged ? <Minus size={11} strokeWidth={2.5} aria-hidden className="shrink-0" /> : positive ? <TrendingUp size={11} strokeWidth={2.5} aria-hidden className="shrink-0" /> : <TrendingDown size={11} strokeWidth={2.5} aria-hidden className="shrink-0" />}
                <span className="min-w-0">
                  {unchanged
                    ? (isTr ? 'Önceki dönemle aynı' : 'Same as previous period')
                    : (isTr ? `Önceki döneme göre ${deltaText}` : `${deltaText} vs previous period`)}
                </span>
              </div>
            ) : c.hint ? (
              <p className="text-[12px] font-medium leading-3 text-[#6B7280]">{c.hint}</p>
            ) : (
              <p className="text-[12px] leading-3 text-transparent" aria-hidden>·</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EditLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-pn-line bg-white px-3 text-[12px] font-medium text-pn-ink transition-colors hover:border-pn-ink sm:min-h-0 sm:py-1.5"
    >
      <Pencil size={12} strokeWidth={2.2} />
      {label}
    </Link>
  );
}

function TodoSection({
  data, copy, fmt, isTr, base,
}: {
  data: AnalyticsResponse;
  copy: Copy;
  fmt: Formatters;
  isTr: boolean;
  base: string;
}) {
  const editHref = (productId: string) => `${base}/menu?edit=${encodeURIComponent(productId)}`;
  const empty = data.lowInterest.length === 0 && data.insights.length === 0;

  return (
    <section className="bz-card min-w-0 p-5 sm:p-6" aria-labelledby="menu-analytics-todo">
      <div className="mb-4">
        <h2 id="menu-analytics-todo" className="text-[15px] font-medium text-pn-ink">
          {copy.todo}
        </h2>
        <p className="mt-1 text-xs font-medium text-[#6B7280]">{copy.todoSub}</p>
      </div>

      {empty ? (
        <p className="py-8 text-center text-sm font-medium text-[#6B7280]">{copy.todoEmpty}</p>
      ) : (
        <div className="space-y-6">
          {data.lowInterest.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-medium text-pn-ink">{copy.lowInterest}</h3>
              {/* ≥ sm: table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[12px] font-medium text-[#737373]">
                      <th scope="col" className="pb-2 pr-2">{copy.columns.product}</th>
                      <th scope="col" className="pb-2 pr-2">{copy.columns.category}</th>
                      <th scope="col" className="pb-2 pr-2 text-right">{copy.columns.views}</th>
                      <th scope="col" className="pb-2 pr-2 text-right">{copy.columns.clicks}</th>
                      <th scope="col" className="pb-2 pr-2 text-right">{copy.columns.interest}</th>
                      <th scope="col" className="pb-2 pr-2">{copy.columns.status}</th>
                      <th scope="col" className="pb-2"><span className="sr-only">{copy.editItem}</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pn-line">
                    {data.lowInterest.map((r) => (
                      <tr key={r.productId}>
                        <td className="py-3 pr-2 font-medium text-pn-ink">{r.productName}</td>
                        <td className="py-3 pr-2 text-pn-ink-2">{r.categoryName ?? '—'}</td>
                        <td className="py-3 pr-2 text-right font-medium tabular-nums text-pn-ink">{fmt.count(r.views)}</td>
                        <td className="py-3 pr-2 text-right font-medium tabular-nums text-pn-ink">{fmt.count(r.clicks)}</td>
                        <td className="py-3 pr-2 text-right font-medium tabular-nums text-[#991B1B]">{fmt.rate(r.ctr)}</td>
                        <td className="py-3 pr-2">
                          <span className="inline-flex rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[12px] font-medium text-[#92400E]">
                            {copy.statusLabels[r.status]}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <EditLink href={editHref(r.productId)} label={copy.editItem} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* < sm: two-line cards (CLAUDE.md §23.6 table-to-card) */}
              <ul className="divide-y divide-pn-line sm:hidden">
                {data.lowInterest.map((r) => (
                  <li key={r.productId} className="flex min-w-0 flex-col gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-pn-ink">
                        {r.productName}
                        {r.categoryName ? <span className="font-medium text-[#6B7280]"> · {r.categoryName}</span> : null}
                      </p>
                      <p className="mt-0.5 text-[12px] font-medium text-[#525252]">
                        {seenAndTapped(isTr, fmt, r.views, r.ctr)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[12px] font-medium text-[#92400E]">
                        {copy.statusLabels[r.status]}
                      </span>
                      <EditLink href={editHref(r.productId)} label={copy.editItem} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.insights.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.insights.map((insight, idx) => {
                const productId = insight.kind === 'low_ctr_product' ? insight.relatedIds?.[0] : undefined;
                return (
                  <div key={`${insight.kind}-${idx}`} className="flex min-w-0 gap-3 rounded-[24px] border border-pn-line bg-white p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[20px] bg-pn-accent-soft text-pn-accent">
                      <Lightbulb size={16} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight text-pn-ink">{insight.title}</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-pn-ink-2">{insight.description}</p>
                      {productId ? (
                        <div className="mt-2">
                          <EditLink href={editHref(productId)} label={copy.editItem} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TopProducts({
  rows, copy, fmt, isTr,
}: {
  rows: ProductRow[];
  copy: Copy;
  fmt: Formatters;
  isTr: boolean;
}) {
  const shown = rows.slice(0, 10);
  return (
    <section className="bz-card min-w-0 p-5 sm:p-6" aria-labelledby="menu-analytics-products">
      <h2 id="menu-analytics-products" className="mb-4 text-[15px] font-medium text-pn-ink">
        {copy.topProducts}
      </h2>
      {shown.length === 0 ? (
        <p className="py-10 text-center text-xs font-medium text-[#6B7280]">{copy.notEnoughData}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[12px] font-medium text-[#737373]">
                  <th scope="col" className="pb-2 pr-2">#</th>
                  <th scope="col" className="pb-2 pr-2">{copy.columns.product}</th>
                  <th scope="col" className="pb-2 pr-2">{copy.columns.category}</th>
                  <th scope="col" className="pb-2 pr-2 text-right">{copy.columns.views}</th>
                  <th scope="col" className="pb-2 pr-2 text-right">{copy.columns.clicks}</th>
                  <th scope="col" className="pb-2 text-right">{copy.columns.interest}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pn-line">
                {shown.map((r, i) => (
                  <tr key={r.productId}>
                    <td className="py-3 pr-2 font-medium text-[#6B7280]">{i + 1}</td>
                    <td className="py-3 pr-2 font-medium text-pn-ink">{r.productName}</td>
                    <td className="py-3 pr-2 text-pn-ink-2">{r.categoryName ?? '—'}</td>
                    <td className="py-3 pr-2 text-right font-medium tabular-nums text-pn-ink">{fmt.count(r.views)}</td>
                    <td className="py-3 pr-2 text-right font-medium tabular-nums text-pn-ink">{fmt.count(r.clicks)}</td>
                    <td className="py-3 text-right font-medium tabular-nums text-pn-ink">{fmt.rate(r.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ol className="divide-y divide-pn-line sm:hidden">
            {shown.map((r, i) => (
              <li key={r.productId} className="flex min-w-0 items-start gap-3 py-3">
                <span className="w-5 shrink-0 text-[12px] font-medium tabular-nums text-[#6B7280]">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-pn-ink">
                    {r.productName}
                    {r.categoryName ? <span className="font-medium text-[#6B7280]"> · {r.categoryName}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#525252]">
                    {seenAndTapped(isTr, fmt, r.views, r.ctr)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function TopCategoriesChart({ rows, copy }: { rows: CategoryRow[]; copy: Copy }) {
  // Truncate long category names so the YAxis label column doesn't push the
  // bars off the right edge on narrow screens.
  const truncate = (name: string) => (name.length > 14 ? `${name.slice(0, 13)}…` : name);
  const dataRows = rows
    .filter((r) => r.views + r.clicks > 0)
    .slice(0, 8)
    .map((r) => ({ name: truncate(r.categoryName), fullName: r.categoryName, clicks: r.clicks, views: r.views }));
  return (
    <section className="bz-card min-w-0 p-5 sm:p-6" aria-labelledby="menu-analytics-categories">
      <h2 id="menu-analytics-categories" className="mb-4 text-[15px] font-medium text-pn-ink">
        {copy.topCategories}
      </h2>
      {dataRows.length === 0 ? (
        <p className="py-10 text-center text-xs font-medium text-[#6B7280]">{copy.notEnoughData}</p>
      ) : (
        <MeasuredChart className="h-72 min-h-[288px] w-full min-w-[1px] overflow-hidden">
          {({ width, height }) => (
            <BarChart width={width} height={height} data={dataRows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#EBEBEB" allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#0A0A0A' }} stroke="#EBEBEB" width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #EBEBEB', borderRadius: 12, fontSize: 12 }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" formatter={legendLabel} />
              <Bar dataKey="views" fill="#0A0A0A" radius={[0, 6, 6, 0]} name={copy.legendViews} />
              <Bar dataKey="clicks" fill="#5D3EBC" radius={[0, 6, 6, 0]} name={copy.legendClicks} />
            </BarChart>
          )}
        </MeasuredChart>
      )}
    </section>
  );
}

function TrendChart({ trend, copy, isTr }: { trend: AnalyticsResponse['trend']; copy: Copy; isTr: boolean }) {
  // `date` is a UTC day bucket ("2026-10-12"); format it in UTC so a viewer
  // west of Greenwich does not see the previous day.
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  // Thin x-axis ticks for wider series so labels don't overlap on mobile:
  // ~7 labels on 7-day, ~6 labels on 30-day, ~6 labels on 90-day.
  const tickInterval = trend.length <= 7 ? 0 : trend.length <= 30 ? 5 : Math.floor(trend.length / 6);
  return (
    <section className="bz-card min-w-0 p-5 sm:p-6" aria-labelledby="menu-analytics-trend">
      <div className="mb-4">
        <h2 id="menu-analytics-trend" className="text-[15px] font-medium text-pn-ink">{copy.trends}</h2>
      </div>
      <MeasuredChart className="h-72 min-h-[288px] w-full min-w-[1px] overflow-hidden">
        {({ width, height }) => (
          <AreaChart width={width} height={height} data={trend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5D3EBC" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#5D3EBC" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A0A0A" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#0A0A0A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateFmt} interval={tickInterval} tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#EBEBEB" />
            <YAxis width={36} tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#EBEBEB" allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #EBEBEB', borderRadius: 12, fontSize: 12 }}
              labelFormatter={(label) => dateFmt(label as string)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" formatter={legendLabel} />
            <Area type="monotone" dataKey="menuViews" stroke="#5D3EBC" strokeWidth={2} fill="url(#gradViews)" name={copy.kpiMenuViews} />
            <Area type="monotone" dataKey="productClicks" stroke="#0A0A0A" strokeWidth={2} fill="url(#gradClicks)" name={copy.trendTaps} />
          </AreaChart>
        )}
      </MeasuredChart>
    </section>
  );
}
