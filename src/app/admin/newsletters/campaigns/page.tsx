'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, Plus, RefreshCw, Search } from 'lucide-react';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';

interface CampaignRow {
  id: string;
  title: string;
  intro: string;
  postIds: string[];
  locale: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number | null;
  failedCount: number | null;
  createdAt: string;
}

interface CampaignsResponse {
  data: CampaignRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_LABEL: Record<CampaignRow['status'], string> = {
  draft: 'Taslak',
  scheduled: 'Zamanlandı',
  sending: 'Gönderiliyor',
  sent: 'Gönderildi',
  failed: 'Başarısız',
};

const STATUS_COLOR: Record<CampaignRow['status'], string> = {
  draft: 'bg-pn-canvas text-[#525252] border-pn-line',
  scheduled: 'bg-pn-accent-soft/40 text-pn-ink border-pn-accent',
  sending: 'bg-blue-50 text-blue-700 border-blue-200',
  sent: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CampaignsResponse | null>(null);

  const [status, setStatus] = useState<'all' | CampaignRow['status']>('all');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, searchDebounced]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (status !== 'all') q.set('status', status);
      if (searchDebounced) q.set('search', searchDebounced);
      q.set('page', String(page));
      q.set('limit', '25');
      const res = await fetch(`/api/admin/newsletters/campaigns?${q.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Kampanyalar yüklenemedi');
      setData(body);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [status, searchDebounced, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <div className="rounded-[24px] border border-pn-line bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#737373]">PANEL / BÜLTEN</p>
            <h1 className="mt-1 flex items-center gap-3 text-[26px] sm:text-[32px] font-medium text-pn-ink tracking-[-0.025em]">
              <Mail size={22} strokeWidth={2} />
              Bülten Kampanyaları
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#525252] max-w-[560px]">
              Aylık bülten varsayılan olarak son 3 blog yazısını gönderir. Burada özel başlık, giriş metni ve yazı seçimiyle kendi kampanyanı hazırlayabilirsin.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="bz-btn disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
              Yenile
            </button>
            <Link
              href="/admin/newsletters/campaigns/new"
              className="inline-flex items-center gap-2 rounded-full bg-pn-accent px-4 py-2.5 text-xs font-medium text-pn-ink hover:bg-pn-accent-hover active:scale-95"
            >
              <Plus size={14} strokeWidth={2.5} />
              Yeni kampanya
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-pn-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Wraps on mobile instead of an overflow strip that pushed the page
              sideways / hid the last status at 390px. */}
          <div
            role="group"
            aria-label="Durum filtresi"
            className="flex w-full min-w-0 flex-wrap gap-1 rounded-[20px] border border-pn-line bg-pn-canvas p-1 text-[13px] font-medium sm:inline-flex sm:w-auto sm:flex-nowrap"
          >
            {(['all', 'draft', 'scheduled', 'sent', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`shrink-0 rounded-[14px] px-3 py-1.5 transition-all ${
                  status === s ? 'bg-pn-ink text-white ' : 'text-pn-ink-2 hover:text-pn-ink'
                }`}
              >
                {s === 'all' ? 'Tümü' : STATUS_LABEL[s as CampaignRow['status']]}
              </button>
            ))}
          </div>
          <div className="relative w-full flex-1 sm:w-auto sm:min-w-[200px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Başlık ara…"
              aria-label="Bülten kampanyası ara"
              className="w-full rounded-[20px] border border-pn-line bg-white py-2 pl-9 pr-3 text-xs font-medium text-pn-ink outline-none focus:ring-2 focus:ring-pn-accent"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-[24px] border border-pn-line bg-white ">
        {loading && !data ? (
          // Row skeleton (§40.10) instead of a second spinner after loading.tsx.
          <div className="divide-y divide-pn-line" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <SkBox className="h-4 w-56 max-w-[55%]" />
                <SkBox className="h-4 w-10" />
                <SkBox className="hidden h-5 w-20 rounded-full md:block" />
                <SkBox className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pn-canvas text-[#6B7280]">
              <Mail size={22} strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-pn-ink">Henüz kampanya yok</p>
            <p className="mt-1 text-xs font-medium text-[#6B7280]">Yeni kampanya oluşturmak için sağ üstteki butonu kullan.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-pn-canvas">
                  <tr className="text-[13px] font-medium text-[#737373]">
                    <th className="px-5 py-3">Başlık</th>
                    <th className="px-5 py-3">Dil</th>
                    <th className="px-5 py-3">Durum</th>
                    <th className="px-5 py-3">Tarih</th>
                    <th className="px-5 py-3 text-right">Sonuç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pn-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-pn-canvas/50">
                      <td className="px-5 py-3 font-medium text-pn-ink">
                        <Link href={`/admin/newsletters/campaigns/${r.id}`} className="hover:underline">{r.title}</Link>
                        <p className="text-[13px] font-medium mt-0.5 text-[#9CA3AF]">{r.postIds.length} yazı</p>
                      </td>
                      <td className="px-5 py-3 text-pn-ink-2">
                        <span className="text-[13px] font-medium text-[#525252]">{r.locale.toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-pn-ink-2">
                        {r.sentAt ? `Gönd. ${new Date(r.sentAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`
                          : r.scheduledAt ? `Plan. ${new Date(r.scheduledAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                          : new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.sentCount !== null ? (
                          <span className="font-medium text-pn-ink">
                            {r.sentCount} <span className="text-[#9CA3AF]">/ {r.failedCount ?? 0} hata</span>
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-pn-line md:hidden">
              {rows.map((r) => (
                <Link key={r.id} href={`/admin/newsletters/campaigns/${r.id}`} className="block p-4 hover:bg-pn-canvas">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-pn-ink">{r.title}</p>
                    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[12px] font-medium ${STATUS_COLOR[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-[#6B7280]">
                    <span>{r.locale.toUpperCase()}</span>
                    <span>·</span>
                    <span>{r.postIds.length} yazı</span>
                    {r.sentCount !== null && (
                      <>
                        <span>·</span>
                        <span>{r.sentCount} gönd · {r.failedCount ?? 0} hata</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-pn-line bg-pn-canvas px-5 py-3">
                <p className="text-[13px] font-medium text-[#6B7280]">
                  Sayfa {data?.meta.page} / {totalPages} · Toplam {data?.meta.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-[14px] border border-pn-line bg-white px-3 py-1.5 text-[13px] font-medium text-pn-ink hover:bg-pn-canvas active:scale-95 disabled:opacity-40"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-[14px] border border-pn-line bg-white px-3 py-1.5 text-[13px] font-medium text-pn-ink hover:bg-pn-canvas active:scale-95 disabled:opacity-40"
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
