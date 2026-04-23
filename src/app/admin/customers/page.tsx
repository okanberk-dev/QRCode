'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Mail, MapPin, Phone, RefreshCw, Search, Star, Store, Users, X } from 'lucide-react';

type Range = '7d' | '30d' | '90d' | 'all';

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
  feedbackCount: number;
  lastAt: string;
}

interface CustomersResponse {
  data: CustomerRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  summary: { customers: number; feedbacks: number; avgRating: number | null };
}

interface RestaurantOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 25;

const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
};

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [data, setData] = useState<CustomersResponse | null>(null);

  // Filters
  const [range, setRange] = useState<Range>('30d');
  const [restaurantId, setRestaurantId] = useState('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasComment, setHasComment] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page whenever a non-page filter changes.
  useEffect(() => {
    setPage(1);
  }, [range, restaurantId, searchDebounced, hasEmail, hasPhone, hasComment]);

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
    if (hasEmail) q.set('hasEmail', '1');
    if (hasPhone) q.set('hasPhone', '1');
    if (hasComment) q.set('hasComment', '1');
    q.set('limit', String(PAGE_SIZE));
    q.set('page', String(overrides.page ?? page));
    return q;
  }, [range, restaurantId, searchDebounced, hasEmail, hasPhone, hasComment, page]);

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
    () => !!(restaurantId || searchDebounced || hasEmail || hasPhone || hasComment) || range !== '30d',
    [restaurantId, searchDebounced, hasEmail, hasPhone, hasComment, range],
  );
  const resetFilters = () => {
    setRange('30d');
    setRestaurantId('');
    setSearch('');
    setHasEmail(false);
    setHasPhone(false);
    setHasComment(false);
  };

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="rounded-[24px] border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[#0A0A0A] sm:text-3xl">
              <Users size={22} strokeWidth={2} />
              Müşteriler
            </h1>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              QR üzerinden geri bildirim bırakmış restoran müşterilerinin birleşik listesi. KVKK onayı olanlar gösterilir.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
              Yenile
            </button>
            <button
              onClick={downloadCsv}
              disabled={exporting || (data?.meta.total ?? 0) === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A0A0A] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
              CSV İndir
            </button>
          </div>
        </div>

        {data && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryCard icon={<Users size={14} />} label="Tekil Müşteri" value={data.summary.customers.toLocaleString('tr-TR')} />
            <SummaryCard icon={<Mail size={14} />} label="Toplam Feedback" value={data.summary.feedbacks.toLocaleString('tr-TR')} />
            <SummaryCard
              icon={<Star size={14} />}
              label="Ortalama Puan"
              value={data.summary.avgRating !== null ? data.summary.avgRating.toFixed(2) : '—'}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-[24px] border border-[#EDEDED] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#EDEDED] bg-[#FFFFFF] p-1 text-[11px] font-black uppercase tracking-widest">
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

          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-xs font-bold text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
          >
            <option value="">Tüm restoranlar</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, e-posta, telefon veya yorumda ara…"
              className="w-full rounded-xl border border-[#EDEDED] bg-white py-2 pl-9 pr-3 text-xs font-medium text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] hover:bg-[#FFFFFF] active:scale-95"
            >
              <X size={12} strokeWidth={2} />
              Filtreleri temizle
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-widest">
          <FilterToggle active={hasEmail} onClick={() => setHasEmail((v) => !v)}>E-posta var</FilterToggle>
          <FilterToggle active={hasPhone} onClick={() => setHasPhone((v) => !v)}>Telefon var</FilterToggle>
          <FilterToggle active={hasComment} onClick={() => setHasComment((v) => !v)}>Yorum var</FilterToggle>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[24px] border border-[#EDEDED] bg-white shadow-sm">
        {loading && !data ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFFFF] text-[#6B7280]">
              <Users size={22} strokeWidth={2} />
            </div>
            <p className="text-sm font-extrabold text-[#0A0A0A]">Kriterlere uyan müşteri yok</p>
            <p className="mt-1 text-xs font-medium text-[#6B7280]">Filtreleri değiştirerek veya temizleyerek tekrar deneyin.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFFFF]">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                    <th className="px-5 py-3">Müşteri</th>
                    <th className="px-5 py-3">İletişim</th>
                    <th className="px-5 py-3">Restoran</th>
                    <th className="px-5 py-3 text-right">Son Puan</th>
                    <th className="px-5 py-3 text-right">Feedback</th>
                    <th className="px-5 py-3">Son Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDED]">
                  {rows.map((r) => (
                    <tr key={r.key} className="hover:bg-[#FFFFFF]/50">
                      <td className="px-5 py-3 font-extrabold text-[#0A0A0A]">{r.name || 'İsimsiz'}</td>
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
                          {r.platform && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
                              {PLATFORM_LABEL[r.platform] || r.platform}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.lastRating !== null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#C6F24E]/15 px-2 py-0.5 font-black text-[#0A0A0A]">
                            <Star size={11} fill="#C6F24E" strokeWidth={0} />
                            {r.lastRating}
                          </span>
                        ) : (
                          <span className="text-[#6B7280]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums text-[#0A0A0A]">{r.feedbackCount}</td>
                      <td className="px-5 py-3 text-[#1A1A1A]">{new Date(r.lastAt).toLocaleDateString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[#EDEDED] md:hidden">
              {rows.map((r) => (
                <div key={r.key} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-[#0A0A0A]">{r.name || 'İsimsiz'}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] font-bold text-[#1A1A1A]">
                        <Store size={11} strokeWidth={2} />
                        {r.restaurantName || '—'}
                      </p>
                    </div>
                    {r.lastRating !== null && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#C6F24E]/15 px-2 py-0.5 text-[11px] font-black text-[#0A0A0A]">
                        <Star size={11} fill="#C6F24E" strokeWidth={0} />
                        {r.lastRating}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5 text-[11px] text-[#1A1A1A]">
                    {r.email && <p className="truncate"><Mail size={10} className="mr-1 inline" strokeWidth={2} />{r.email}</p>}
                    {r.phone && <p><Phone size={10} className="mr-1 inline" strokeWidth={2} />{r.phone}</p>}
                    {r.branch && <p><MapPin size={10} className="mr-1 inline" strokeWidth={2} />{r.branch}</p>}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
                    <span>{r.feedbackCount} feedback</span>
                    <span>{new Date(r.lastAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-[#EDEDED] bg-[#FFFFFF] px-5 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">
                  Sayfa {data?.meta.page} / {totalPages} · Toplam {data?.meta.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-40"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-[#FFFFFF] active:scale-95 disabled:opacity-40"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0A0A0A]">{value}</p>
    </div>
  );
}

function FilterToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 transition-all active:scale-95 ${
        active
          ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
          : 'border-[#EDEDED] bg-white text-[#1A1A1A] hover:bg-[#FFFFFF]'
      }`}
    >
      {children}
    </button>
  );
}
