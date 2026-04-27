'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BarChart3, Eye, Info, Loader2, Lightbulb,
  MousePointerClick, RefreshCw, Sparkles, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { formatPct } from '@/lib/analytics-heuristics';
import type { Locale } from '@/lib/translations';
import { AlertBanner } from '@/components/ui';

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
}

function buildCopy(isTr: boolean) {
  return {
    back: isTr ? 'Menü Düzenleyici' : 'Menu Editor',
    title: isTr ? 'Menü Analitiği' : 'Menu Analytics',
    subtitle: isTr
      ? 'En ilgi çeken ürünleri, kategori performansını ve menü iyileştirme fırsatlarını takip edin.'
      : 'Track your most engaging products, category performance, and menu improvement opportunities.',
    range7: isTr ? 'Son 7 gün' : 'Last 7 days',
    range30: isTr ? 'Son 30 gün' : 'Last 30 days',
    range90: isTr ? 'Son 90 gün' : 'Last 90 days',
    rangeAll: isTr ? 'Tüm zamanlar' : 'All time',
    allCategories: isTr ? 'Tüm kategoriler' : 'All categories',
    allSources: isTr ? 'Tüm kaynaklar' : 'All sources',
    refresh: isTr ? 'Yenile' : 'Refresh',
    resetFilters: isTr ? 'Filtreleri temizle' : 'Reset filters',
    allTimeTrendNote: isTr
      ? 'Zaman içi grafik "Son 7/30/90 gün" seçildiğinde görüntülenir.'
      : 'Trend chart appears when a 7/30/90-day range is selected.',
    kpiMenuViews: isTr ? 'Menü Görüntülenme' : 'Menu Views',
    kpiProductViews: isTr ? 'Ürün Görüntülenme' : 'Product Views',
    kpiCategoryClicks: isTr ? 'Kategori Tıklamaları' : 'Category Interactions',
    kpiClickRate: isTr ? 'Ürün Tıklama Oranı' : 'Product Click Rate',
    previousPeriod: isTr ? 'önceki döneme göre' : 'vs previous period',
    topProducts: isTr ? 'En Çok Görüntülenen Ürünler' : 'Top Viewed Products',
    topProductsEmpty: isTr ? 'Henüz yeterli veri yok.' : 'Not enough data yet.',
    topCategories: isTr ? 'En Çok Tıklanan Kategoriler' : 'Top Clicked Categories',
    lowInterest: isTr ? 'Düşük İlgili Ürünler' : 'Low Interest Products',
    lowInterestSub: isTr
      ? 'Görüntülenmesi yüksek ama tıklama oranı düşük ürünler — görsel veya açıklamayı gözden geçirmeyi değerlendirin.'
      : 'Products with solid exposure but weak engagement — consider improving photos or descriptions.',
    upsell: isTr ? 'Upsell Fırsatları' : 'Upsell Opportunities',
    upsellSub: isTr
      ? 'Kurallı analizlerle menü düzenini ve sunumu iyileştirme önerileri.'
      : 'Rule-based suggestions to improve menu flow and presentation.',
    trends: isTr ? 'Zaman İçinde Menü Performansı' : 'Menu Performance Over Time',
    columns: {
      rank: '#',
      product: isTr ? 'Ürün' : 'Product',
      category: isTr ? 'Kategori' : 'Category',
      views: isTr ? 'Görüntülenme' : 'Views',
      clicks: isTr ? 'Tıklama' : 'Clicks',
      ctr: isTr ? 'TO' : 'CTR',
      share: isTr ? 'Pay' : 'Share',
      status: isTr ? 'Durum' : 'Status',
    },
    emptyHeadline: isTr ? 'Henüz yeterli veri yok' : 'Not enough data yet',
    emptyBody: isTr
      ? 'Müşterileriniz menüyle etkileşim kurdukça içgörüler burada belirmeye başlayacak.'
      : 'As customers interact with your menu, insights will appear here.',
    statusLabels: {
      low_interest: isTr ? 'Düşük İlgi' : 'Low Interest',
      needs_review: isTr ? 'Gözden Geçir' : 'Needs Review',
      check_description: isTr ? 'Açıklama/Görsel' : 'Check Description',
    } as Record<LowInterestRow['status'], string>,
    sourceLabels: {
      qr: 'QR',
      direct: isTr ? 'Doğrudan' : 'Direct',
      table: isTr ? 'Masa' : 'Table',
      link: isTr ? 'Bağlantı' : 'Link',
      delivery: isTr ? 'Teslimat' : 'Delivery',
    } as Record<string, string>,
  };
}
type Copy = ReturnType<typeof buildCopy>;

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

  const copy = useMemo(() => buildCopy(isTr), [isTr]);

  const fetchAnalytics = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ range, locale });
      if (categoryId) qs.set('categoryId', categoryId);
      if (sourceType) qs.set('sourceType', sourceType);
      const res = await fetch(`/api/restaurants/${id}/analytics/menu?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analitik yüklenemedi');
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [id, range, categoryId, sourceType, locale]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const hasAnyData =
    data &&
    (data.overview.totalMenuViews + data.overview.totalProductViews + data.overview.totalProductClicks + data.overview.totalCategoryClicks) > 0;

  const dateFmt = (iso: string | null | undefined) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const windowLabel = data?.window?.start
    ? `${dateFmt(data.window.start)} → ${dateFmt(data.window.end)}`
    : null;
  const hasActiveFilters = !!(categoryId || sourceType);
  const resetFilters = () => {
    setCategoryId('');
    setSourceType('');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 bz-card p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Link
              href={`/${locale}/dashboard/restaurants/${id}/menu`}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#1A1A1A] hover:text-[#0A0A0A]"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              {copy.back}
            </Link>
            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-[#0A0A0A] sm:text-3xl">
              <BarChart3 size={22} strokeWidth={2} />
              {copy.title}
            </h1>
            <p className="text-sm font-medium text-[#6B7280]">{copy.subtitle}</p>
            {windowLabel && (
              <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">
                {windowLabel}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
              {copy.refresh}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="inline-flex rounded-xl border border-[#EDEDED] bg-[#FFFFFF] p-1 text-[11px] font-semibold uppercase tracking-widest">
            {([
              { key: '7d', label: copy.range7 },
              { key: '30d', label: copy.range30 },
              { key: '90d', label: copy.range90 },
              { key: 'all', label: copy.rangeAll },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`rounded-lg px-3 py-2 transition-all ${
                  range === opt.key ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#1A1A1A] hover:text-[#0A0A0A]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-xs font-bold text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
          >
            <option value="">{copy.allCategories}</option>
            {(data?.categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-xs font-bold text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
          >
            <option value="">{copy.allSources}</option>
            {Object.entries(copy.sourceLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] hover:bg-[#FFFFFF] active:scale-95"
            >
              <X size={12} strokeWidth={2} />
              {copy.resetFilters}
            </button>
          )}
        </div>
      </div>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center bz-card p-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </div>
      ) : !data ? null : !hasAnyData ? (
        <div className="bz-card p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFFFFF]">
            <Sparkles size={26} strokeWidth={2} className="text-[#6B7280]" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">{copy.emptyHeadline}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#6B7280]">{copy.emptyBody}</p>
        </div>
      ) : (
        <>
          <OverviewCards overview={data.overview} copy={copy} />

          {data.trend.length > 0 ? (
            <TrendChart trend={data.trend} copy={copy} isTr={isTr} />
          ) : range === 'all' ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] p-4 text-xs font-medium text-[#6B7280]">
              <Info size={14} className="shrink-0" strokeWidth={2} />
              <span>{copy.allTimeTrendNote}</span>
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <TopProductsTable rows={data.topProducts} copy={copy} isTr={isTr} />
            <TopCategoriesChart rows={data.topCategories} copy={copy} />
          </div>

          <LowInterestTable rows={data.lowInterest} copy={copy} />

          <UpsellInsights insights={data.insights} copy={copy} />
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function OverviewCards({ overview, copy }: { overview: AnalyticsResponse['overview']; copy: Copy }) {
  const cards = [
    { label: copy.kpiMenuViews, value: overview.totalMenuViews, delta: overview.compare?.menuViews, icon: Eye, fmt: fmtNum },
    { label: copy.kpiProductViews, value: overview.totalProductViews, delta: overview.compare?.productViews, icon: Eye, fmt: fmtNum },
    { label: copy.kpiCategoryClicks, value: overview.totalCategoryClicks, delta: overview.compare?.categoryClicks, icon: MousePointerClick, fmt: fmtNum },
    { label: copy.kpiClickRate, value: overview.productClickRate, delta: overview.compare?.productClickRate, icon: TrendingUp, fmt: (v: number) => formatPct(v, 1), pctDelta: true },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const deltaPositive = c.delta !== null && c.delta !== undefined && c.delta >= 0;
        return (
          <div key={c.label} className="rounded-xl border border-[#EDEDED] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">{c.label}</p>
              <Icon size={16} strokeWidth={2} className="text-[#1A1A1A]" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#0A0A0A]">{c.fmt(c.value)}</p>
            {c.delta !== null && c.delta !== undefined && (
              <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${deltaPositive ? 'text-[#166534]' : 'text-[#991B1B]'}`}>
                {deltaPositive ? <TrendingUp size={11} strokeWidth={2.5} /> : <TrendingDown size={11} strokeWidth={2.5} />}
                {c.pctDelta ? `${c.delta >= 0 ? '+' : ''}${(c.delta * 100).toFixed(1)} pp` : `${c.delta >= 0 ? '+' : ''}${(c.delta * 100).toFixed(1)} %`}
                <span className="font-medium text-[#6B7280]">· {copy.previousPeriod}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ trend, copy, isTr }: { trend: AnalyticsResponse['trend']; copy: Copy; isTr: boolean }) {
  const dateFmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric' });
  };
  // Thin x-axis ticks for wider series so labels don't overlap on mobile:
  // ~7 labels on 7-day, ~6 labels on 30-day, ~6 labels on 90-day.
  const tickInterval = trend.length <= 7 ? 0 : trend.length <= 30 ? 5 : Math.floor(trend.length / 6);
  return (
    <div className="bz-card p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">{copy.trends}</h2>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6F24E" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#C6F24E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A0A0A" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#0A0A0A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateFmt} interval={tickInterval} tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#EDEDED" />
            <YAxis width={36} tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#EDEDED" allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #EDEDED', borderRadius: 12, fontSize: 12 }}
              labelFormatter={(label) => dateFmt(label as string)}
            />
            <Area type="monotone" dataKey="menuViews" stroke="#C6F24E" strokeWidth={2} fill="url(#gradViews)" name={copy.kpiMenuViews} />
            <Area type="monotone" dataKey="productClicks" stroke="#0A0A0A" strokeWidth={2} fill="url(#gradClicks)" name={isTr ? 'Ürün Tıklama' : 'Product Clicks'} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopProductsTable({ rows, copy }: { rows: ProductRow[]; copy: Copy; isTr: boolean }) {
  return (
    <div className="bz-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">{copy.topProducts}</h2>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-[#6B7280]">{copy.topProductsEmpty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
                <th className="pb-2 pr-2">{copy.columns.rank}</th>
                <th className="pb-2 pr-2">{copy.columns.product}</th>
                <th className="pb-2 pr-2">{copy.columns.category}</th>
                <th className="pb-2 pr-2 text-right">{copy.columns.views}</th>
                <th className="pb-2 pr-2 text-right">{copy.columns.clicks}</th>
                <th className="pb-2 text-right">{copy.columns.ctr}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED]">
              {rows.slice(0, 10).map((r, i) => (
                <tr key={r.productId}>
                  <td className="py-3 pr-2 font-semibold text-[#6B7280]">{i + 1}</td>
                  <td className="py-3 pr-2 font-semibold text-[#0A0A0A]">{r.productName}</td>
                  <td className="py-3 pr-2 text-[#1A1A1A]">{r.categoryName ?? '—'}</td>
                  <td className="py-3 pr-2 text-right font-bold tabular-nums text-[#0A0A0A]">{fmtNum(r.views)}</td>
                  <td className="py-3 pr-2 text-right font-bold tabular-nums text-[#0A0A0A]">{fmtNum(r.clicks)}</td>
                  <td className="py-3 text-right font-bold tabular-nums text-[#0A0A0A]">{formatPct(r.ctr, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
    <div className="bz-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">{copy.topCategories}</h2>
      {dataRows.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-[#6B7280]">{copy.topProductsEmpty}</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataRows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEDED" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#EDEDED" allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#0A0A0A' }} stroke="#EDEDED" width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #EDEDED', borderRadius: 12, fontSize: 12 }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
              />
              <Bar dataKey="clicks" fill="#C6F24E" radius={[0, 6, 6, 0]} name={copy.columns.clicks} />
              <Bar dataKey="views" fill="#0A0A0A" radius={[0, 6, 6, 0]} name={copy.columns.views} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function LowInterestTable({ rows, copy }: { rows: LowInterestRow[]; copy: Copy }) {
  return (
    <div className="bz-card p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">{copy.lowInterest}</h2>
        <p className="mt-1 text-xs font-medium text-[#6B7280]">{copy.lowInterestSub}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-[#6B7280]">{copy.topProductsEmpty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
                <th className="pb-2 pr-2">{copy.columns.product}</th>
                <th className="pb-2 pr-2">{copy.columns.category}</th>
                <th className="pb-2 pr-2 text-right">{copy.columns.views}</th>
                <th className="pb-2 pr-2 text-right">{copy.columns.clicks}</th>
                <th className="pb-2 pr-2 text-right">{copy.columns.ctr}</th>
                <th className="pb-2 pr-2">{copy.columns.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDED]">
              {rows.map((r) => (
                <tr key={r.productId}>
                  <td className="py-3 pr-2 font-semibold text-[#0A0A0A]">{r.productName}</td>
                  <td className="py-3 pr-2 text-[#1A1A1A]">{r.categoryName ?? '—'}</td>
                  <td className="py-3 pr-2 text-right font-bold tabular-nums text-[#0A0A0A]">{fmtNum(r.views)}</td>
                  <td className="py-3 pr-2 text-right font-bold tabular-nums text-[#0A0A0A]">{fmtNum(r.clicks)}</td>
                  <td className="py-3 pr-2 text-right font-bold tabular-nums text-[#991B1B]">{formatPct(r.ctr, 1)}</td>
                  <td className="py-3 pr-2">
                    <span className="inline-flex rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#92400E]">
                      {copy.statusLabels[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UpsellInsights({ insights, copy }: { insights: Insight[]; copy: Copy }) {
  return (
    <div className="bz-card p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#0A0A0A]">{copy.upsell}</h2>
        <p className="mt-1 text-xs font-medium text-[#6B7280]">{copy.upsellSub}</p>
      </div>
      {insights.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-[#6B7280]">{copy.topProductsEmpty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((i, idx) => (
            <div key={idx} className="flex gap-3 rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E]/15 text-[#C6F24E]">
                <Lightbulb size={16} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-[#0A0A0A]">{i.title}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[#1A1A1A]">{i.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Number formatter: adds thin separators for readability, no decimals.
function fmtNum(n: number) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('tr-TR');
}
