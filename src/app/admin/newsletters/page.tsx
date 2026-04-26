'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  TrendingDown,
  Users,
  X,
} from 'lucide-react';

type Range = '7d' | '30d' | '90d' | 'all';
type Status = 'all' | 'active' | 'cancelled';
type LocaleFilter = 'all' | 'tr' | 'en';

interface SubscriberRow {
  id: string;
  email: string;
  locale: string;
  source: string | null;
  createdAt: string;
  unsubscribedAt: string | null;
}

interface SubscribersResponse {
  data: SubscriberRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  summary: { total: number; active: number; cancelled: number; cancelRate: number };
  facets: { sources: Array<{ value: string; count: number }> };
}

const PAGE_SIZE = 25;

export default function AdminNewslettersPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [data, setData] = useState<SubscribersResponse | null>(null);

  // Filters
  const [range, setRange] = useState<Range>('30d');
  const [status, setStatus] = useState<Status>('active');
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [range, status, localeFilter, sourceFilter, searchDebounced]);

  const buildQuery = useCallback((overrides: Partial<{ page: number }> = {}) => {
    const q = new URLSearchParams();
    q.set('range', range);
    q.set('status', status);
    if (localeFilter !== 'all') q.set('locale', localeFilter);
    if (sourceFilter !== 'all') q.set('source', sourceFilter);
    if (searchDebounced) q.set('search', searchDebounced);
    q.set('limit', String(PAGE_SIZE));
    q.set('page', String(overrides.page ?? page));
    return q;
  }, [range, status, localeFilter, sourceFilter, searchDebounced, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/newsletters?${buildQuery().toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Aboneler yüklenemedi');
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
      const res = await fetch(`/api/admin/newsletters/export?${q.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'CSV indirilemedi');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
    setExporting(false);
  };

  const triggerNewsletter = async () => {
    if (!confirm('Aylık bülteni aktif tüm abonelere şimdi göndermek istediğine emin misin? Bu işlem geri alınamaz.')) return;
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/newsletters/trigger', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Gönderim başarısız');
      setInfo(`Bülten gönderildi · ${body.sent ?? 0} mail · ${body.skipped ?? 0} atlandı · ${body.failed ?? 0} başarısız`);
      fetchData();
    } catch (e) {
      setError((e as Error).message);
    }
    setSending(false);
  };

  const hasActiveFilters = useMemo(
    () => !!(searchDebounced || (sourceFilter !== 'all') || (localeFilter !== 'all')) || range !== '30d' || status !== 'active',
    [searchDebounced, sourceFilter, localeFilter, range, status],
  );
  const resetFilters = () => {
    setRange('30d');
    setStatus('active');
    setLocaleFilter('all');
    setSourceFilter('all');
    setSearch('');
  };

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="pulse-eyebrow text-[#737373]">PANEL / BÜLTEN</p>
            <h1
              className="mt-1 flex items-center gap-3 text-[26px] sm:text-[32px] font-medium text-[#0A0A0A] tracking-[-0.025em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Mail size={22} strokeWidth={2} />
              Bülten Aboneleri
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#525252] max-w-[560px]">
              Pulse aylık bültenine kayıtlı kullanıcılar. KVKK uyumlu — tek tıkla iptal token\&apos;ı her abonede tutulur.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
              Yenile
            </button>
            <button
              onClick={downloadCsv}
              disabled={exporting || (data?.meta.total ?? 0) === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
              CSV İndir
            </button>
            <button
              onClick={triggerNewsletter}
              disabled={sending || (data?.summary.active ?? 0) === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C6F24E] px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] active:scale-95 disabled:opacity-50"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2} />}
              Şimdi gönder
            </button>
          </div>
        </div>

        {data && (
          <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-4">
            <SummaryCard icon={<Users size={14} />} label="Toplam Abone" value={data.summary.total.toLocaleString('tr-TR')} />
            <SummaryCard icon={<Mail size={14} />} label="Aktif" value={data.summary.active.toLocaleString('tr-TR')} accent />
            <SummaryCard icon={<X size={14} />} label="İptal" value={data.summary.cancelled.toLocaleString('tr-TR')} />
            <SummaryCard icon={<TrendingDown size={14} />} label="İptal Oranı" value={`%${data.summary.cancelRate.toFixed(1)}`} />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex w-full overflow-x-auto rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-1 pulse-eyebrow sm:w-auto">
            {(['7d', '30d', '90d', 'all'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setRange(opt)}
                className={`shrink-0 rounded-lg px-3 py-1.5 transition-all ${
                  range === opt ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#1A1A1A] hover:text-[#0A0A0A]'
                }`}
              >
                {opt === '7d' ? 'Son 7 gün' : opt === '30d' ? 'Son 30 gün' : opt === '90d' ? 'Son 90 gün' : 'Tümü'}
              </button>
            ))}
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-xs font-bold text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
          >
            <option value="active">Aktif</option>
            <option value="cancelled">İptal</option>
            <option value="all">Tümü</option>
          </select>

          <select
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value as LocaleFilter)}
            className="rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-xs font-bold text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
          >
            <option value="all">Tüm diller</option>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-xs font-bold text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
          >
            <option value="all">Tüm kaynaklar</option>
            {(data?.facets.sources ?? []).map((s) => (
              <option key={s.value} value={s.value}>{s.value} ({s.count})</option>
            ))}
          </select>

          <div className="relative w-full flex-1 sm:w-auto sm:min-w-[200px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="E-posta ara…"
              className="w-full rounded-xl border border-[#EDEDED] bg-white py-2 pl-9 pr-3 text-xs font-medium text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-[#EDEDED] bg-white px-3 py-2 pulse-eyebrow text-[#1A1A1A] hover:bg-[#FAFAFA] active:scale-95"
            >
              <X size={12} strokeWidth={2} />
              Filtreleri temizle
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div>
      )}
      {info && (
        <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8] p-4 text-xs font-semibold text-[#0A0A0A]">{info}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-sm">
        {loading && !data ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FAFAFA] text-[#6B7280]">
              <Mail size={22} strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-[#0A0A0A]">Kriterlere uyan abone yok</p>
            <p className="mt-1 text-xs font-medium text-[#6B7280]">Filtreleri değiştirerek veya temizleyerek tekrar deneyin.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA]">
                  <tr className="pulse-eyebrow text-[#737373]">
                    <th className="px-5 py-3">E-posta</th>
                    <th className="px-5 py-3">Dil</th>
                    <th className="px-5 py-3">Kaynak</th>
                    <th className="px-5 py-3">Kayıt Tarihi</th>
                    <th className="px-5 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDED]">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAFAFA]/50">
                      <td className="px-5 py-3 font-semibold text-[#0A0A0A]">
                        <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
                      </td>
                      <td className="px-5 py-3 text-[#1A1A1A]">
                        <span className="pulse-eyebrow text-[#525252]">{r.locale.toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-3 text-[#1A1A1A]">{r.source ?? '—'}</td>
                      <td className="px-5 py-3 text-[#1A1A1A]">
                        {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill cancelled={!!r.unsubscribedAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[#EDEDED] md:hidden">
              {rows.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <a href={`mailto:${r.email}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0A0A0A] hover:underline">{r.email}</a>
                    <StatusPill cancelled={!!r.unsubscribedAt} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pulse-eyebrow text-[#6B7280]">
                    <span>{r.locale.toUpperCase()}</span>
                    <span>·</span>
                    <span className="truncate">{r.source ?? 'Kaynak yok'}</span>
                    <span>·</span>
                    <span>{new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-[#EDEDED] bg-[#FAFAFA] px-5 py-3">
                <p className="pulse-eyebrow text-[#6B7280]">
                  Sayfa {data?.meta.page} / {totalPages} · Toplam {data?.meta.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 pulse-eyebrow text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-40"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 pulse-eyebrow text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-40"
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

function SummaryCard({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-[#C6F24E] bg-[#EAF9B8]/40' : 'border-[#EDEDED] bg-[#FAFAFA]'}`}>
      <p className="flex items-center gap-1.5 pulse-eyebrow text-[#737373]">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0A0A0A]">{value}</p>
    </div>
  );
}

function StatusPill({ cancelled }: { cancelled: boolean }) {
  return cancelled ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#737373]">İptal</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#C6F24E]/30 px-2 py-0.5 text-[11px] font-semibold text-[#0A0A0A]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A]" />Aktif
    </span>
  );
}
