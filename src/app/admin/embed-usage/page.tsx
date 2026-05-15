'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Loader2 } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { AlertBanner, PageHeader, StatCard } from '@/components/ui';
import SuperadminBlock from '@/components/admin/SuperadminBlock';

interface UsageRow {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  parentDomain: string;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

interface UsageResponse {
  rows: UsageRow[];
  page: number;
  limit: number;
  total: number;
  totalViews: number;
  totalRestaurants: number;
  totalDomains: number;
  days: number;
}

const RANGES = [
  { id: '7', tr: '7 gün', en: '7d' },
  { id: '30', tr: '30 gün', en: '30d' },
  { id: '90', tr: '90 gün', en: '90d' },
] as const;

export default function AdminEmbedUsagePage() {
  return (
    <SuperadminBlock>
      <Body />
    </SuperadminBlock>
  );
}

function relativeTime(iso: string | null, isTr: boolean): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return '—';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return isTr ? `${m} dk önce` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isTr ? `${h} sa önce` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return isTr ? `${d} gün önce` : `${d}d ago`;
  const mo = Math.floor(d / 30);
  return isTr ? `${mo} ay önce` : `${mo}mo ago`;
}

function Body() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';

  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/embed-usage?days=${days}&page=${page}&limit=50`,
        );
        if (!cancelled && res.ok) {
          setData((await res.json()) as UsageResponse);
        } else if (!cancelled) {
          setError(isTr ? 'Veriler alınamadı.' : 'Failed to load.');
        }
      } catch {
        if (!cancelled) setError(isTr ? 'Ağ hatası.' : 'Network error.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days, page, isTr]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'SUPERADMIN' : 'SUPERADMIN'}
        title={isTr ? 'Embed kullanımı' : 'Embed usage'}
        description={
          isTr
            ? 'Widget yükleyen siteler ve işletmeler.'
            : 'Sites and businesses loading the widget.'
        }
      />

      {/* Range chips */}
      <div className="bz-card p-3 sm:p-4">
        <div className="flex items-center gap-2.5">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'ARALIK' : 'RANGE'}
          </span>
          <div
            className="inline-flex items-center gap-1 rounded-lg border border-[#EDEDED] p-1"
            role="group"
          >
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setDays(r.id);
                  setPage(1);
                }}
                className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${
                  days === r.id
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-[#525252] hover:bg-[#F5F5F5]'
                }`}
                aria-pressed={days === r.id}
              >
                {isTr ? r.tr : r.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <StatCard
          label={isTr ? 'Toplam görüntü' : 'Total views'}
          value={(data?.totalViews ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<Globe size={14} strokeWidth={2} />}
        />
        <StatCard
          label={isTr ? 'Kullanan işletme' : 'Active businesses'}
          value={(data?.totalRestaurants ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
        />
        <StatCard
          label={isTr ? 'Benzersiz alan adı' : 'Unique domains'}
          value={(data?.totalDomains ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
        />
      </div>

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}

      {/* Table */}
      <section className="bz-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-[#737373]">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="p-10 text-center">
            <Globe size={28} className="mx-auto mb-3 text-[#A3A3A3]" />
            <p className="text-[13px] text-[#737373]">
              {isTr
                ? 'Bu aralıkta widget yükleyen site bulunamadı.'
                : 'No sites loaded the widget in this range.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="flex flex-col gap-2.5 p-3 lg:hidden">
              {data.rows.map((r, i) => (
                <div key={`${r.restaurantId}-${r.parentDomain}-${i}`} className="bz-card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {r.slug ? (
                        <Link
                          href={`/admin/restaurants/${r.restaurantId}`}
                          className="text-[13px] font-semibold text-[#0A0A0A] hover:underline"
                        >
                          {r.restaurantName}
                        </Link>
                      ) : (
                        <span className="text-[13px] font-semibold text-[#0A0A0A]">
                          {r.restaurantName}
                        </span>
                      )}
                      {r.slug && (
                        <div className="mt-0.5 text-[11px] text-[#737373] bz-mono truncate">
                          /{r.slug}
                        </div>
                      )}
                      <div className="mt-1 text-[12px] text-[#525252] truncate">
                        {r.parentDomain}
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-[#737373]">
                        <span>{relativeTime(r.firstSeen, isTr)}</span>
                        <span className="text-[#A3A3A3]">·</span>
                        <span>{relativeTime(r.lastSeen, isTr)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[15px] font-semibold tabular-nums text-[#0A0A0A]">
                        {r.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                      </div>
                      <div className="pulse-eyebrow text-[#A3A3A3]">
                        {isTr ? 'GÖRÜNTÜ' : 'VIEWS'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-[13px]">
                <thead className="bg-[#FAFAFA]">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373]">
                      {isTr ? 'İŞLETME' : 'BUSINESS'}
                    </th>
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373]">
                      {isTr ? 'ALAN ADI' : 'DOMAIN'}
                    </th>
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373] text-right">
                      {isTr ? 'GÖRÜNTÜ' : 'VIEWS'}
                    </th>
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373] text-right">
                      {isTr ? 'İLK' : 'FIRST'}
                    </th>
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373] text-right">
                      {isTr ? 'SON' : 'LAST'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr
                      key={`${r.restaurantId}-${r.parentDomain}-${i}`}
                      className="border-t border-[#EDEDED] hover:bg-[#FAFAFA]"
                    >
                      <td className="px-4 py-3">
                        {r.slug ? (
                          <Link
                            href={`/admin/restaurants/${r.restaurantId}`}
                            className="font-medium text-[#0A0A0A] hover:underline"
                          >
                            {r.restaurantName}
                          </Link>
                        ) : (
                          <span className="font-medium text-[#0A0A0A]">{r.restaurantName}</span>
                        )}
                        {r.slug && (
                          <span className="ml-2 text-[11px] text-[#737373] bz-mono">
                            /{r.slug}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#525252] truncate max-w-[280px]">
                        {r.parentDomain}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {r.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-right text-[#737373]">
                        {relativeTime(r.firstSeen, isTr)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#737373]">
                        {relativeTime(r.lastSeen, isTr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.total > data.limit && (
              <div className="flex items-center justify-between border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-2.5">
                <span className="text-[12px] text-[#737373]">
                  {isTr
                    ? `Sayfa ${data.page} / ${Math.ceil(data.total / data.limit)} · ${data.total} kayıt`
                    : `Page ${data.page} / ${Math.ceil(data.total / data.limit)} · ${data.total} rows`}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={data.page <= 1}
                    className="bz-btn-ghost px-3 py-1 text-[12px] disabled:opacity-50"
                  >
                    {isTr ? '← Önceki' : '← Prev'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={data.page * data.limit >= data.total}
                    className="bz-btn-ghost px-3 py-1 text-[12px] disabled:opacity-50"
                  >
                    {isTr ? 'Sonraki →' : 'Next →'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
