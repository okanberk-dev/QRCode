'use client';

// Stage 29 §38.105 — Admin campaign moderation queue page.
//
// IDOR + RBAC gate'i backend tarafında zorunlu (`campaigns:read`); UI
// 401/403 fallback'inde "Yetki yok" gösterir. Filter chips (status:
// pending_approval default + approved/rejected/sent/failed/all) +
// paginated table + click-through detail.
//
// URL `/admin/campaign-approvals` — mevcut `/admin/campaigns` (QR placement
// campaigns, ayrı concept) ile çakışmayı önlemek için ayrı route.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  EmptyState,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import {
  campaignStatusBadge,
  campaignStatusLabel,
} from '@/lib/customer-campaign-stats';

interface CampaignRow {
  id: string;
  restaurantId: string;
  restaurantName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface FetchResponse {
  campaigns: CampaignRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  { value: 'pending_approval', tr: 'Onayda', en: 'Pending' },
  { value: 'approved', tr: 'Onaylanan', en: 'Approved' },
  { value: 'rejected', tr: 'Reddedilen', en: 'Rejected' },
  { value: 'sent', tr: 'Gönderildi', en: 'Sent' },
  { value: 'failed', tr: 'Başarısız', en: 'Failed' },
  { value: 'all', tr: 'Tümü', en: 'All' },
] as const;

function formatDateTime(iso: string | null, isTr: boolean): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminCampaignApprovalsPage() {
  const { locale } = useAdminTranslation();
  const isTr = locale !== 'en';

  const filters = useUrlFilter({
    status: 'pending_approval' as string,
    page: 1 as number,
  });

  const [data, setData] = useState<FetchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        status: filters.values.status,
        page: String(filters.values.page),
      });
      const res = await fetch(`/api/admin/campaigns?${qs}`, { cache: 'no-store' });
      if (res.status === 403) {
        setError(
          isTr
            ? 'Bu sayfayı görme yetkin yok.'
            : 'You do not have permission to view this page.',
        );
        setData(null);
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as FetchResponse;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, [filters.values.status, filters.values.page, isTr]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-6">
      <PageHeader
        eyebrow={isTr ? 'OPERASYON' : 'OPERATIONS'}
        eyebrowPulse
        title={isTr ? 'Kampanya Onayları' : 'Campaign Approvals'}
        description={
          isTr
            ? 'Owner kampanyaları admin onayından geçer. Onaylanan kampanyalar Resend ile otomatik teslim edilir; reddedilenler için owner mail ile gerekçeli bildirim alır.'
            : 'Owner campaigns require admin approval. Approved campaigns are auto-delivered via Resend; rejected ones notify the owner via email with the reviewer note.'
        }
        actions={
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="bz-btn-ghost flex items-center gap-1.5 px-3 min-h-[36px] text-[12.5px] disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isTr ? 'Yenile' : 'Refresh'}
          </button>
        }
      />

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 no-scrollbar">
        {STATUS_FILTERS.map((s) => {
          const active = filters.values.status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => filters.setMany({ status: s.value, page: 1 })}
              className={`px-3 min-h-[32px] rounded-full text-[12px] border transition-colors ${
                active
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#525252] border-[#EDEDED] hover:bg-[#FAFAFA]'
              }`}
            >
              {isTr ? s.tr : s.en}
            </button>
          );
        })}
      </div>

      {/* Queue table */}
      {loading && !data ? (
        <TableSkeleton rows={6} cols={6} />
      ) : !data || data.campaigns.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={28} strokeWidth={1.5} />}
          title={isTr ? 'Kampanya yok' : 'No campaigns'}
          body={
            isTr
              ? 'Bu filtreye uyan kampanya bulunmuyor.'
              : 'No campaigns match this filter.'
          }
        />
      ) : (
        <div className="bz-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="bz-table w-full">
              <thead>
                <tr>
                  <th className="text-left">{isTr ? 'İşletme' : 'Restaurant'}</th>
                  <th className="text-left">{isTr ? 'Sahip' : 'Owner'}</th>
                  <th className="text-left">{isTr ? 'Konu' : 'Subject'}</th>
                  <th className="text-right">{isTr ? 'Alıcı' : 'Recipients'}</th>
                  <th className="text-left">{isTr ? 'Durum' : 'Status'}</th>
                  <th className="text-left">{isTr ? 'Submit' : 'Submitted'}</th>
                  <th className="text-right" />
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id} className="bz-tr-hover">
                    <td>
                      <div className="bz-h-tight text-[13px]">
                        {c.restaurantName ?? c.restaurantId}
                      </div>
                    </td>
                    <td>
                      <div className="text-[12px] text-[#1A1A1A]">{c.ownerName ?? '—'}</div>
                      <div className="text-[11px] text-[#737373] bz-mono">
                        {c.ownerEmail ?? ''}
                      </div>
                    </td>
                    <td className="max-w-[280px]">
                      <div className="text-[12.5px] text-[#1A1A1A] truncate">{c.subject}</div>
                    </td>
                    <td className="text-right bz-mono text-[12px]">{c.recipientCount}</td>
                    <td>
                      <Badge kind={campaignStatusBadge(c.status)}>
                        {campaignStatusLabel(c.status, isTr ? 'tr' : 'en')}
                      </Badge>
                    </td>
                    <td className="text-[11.5px] text-[#525252]">
                      {formatDateTime(c.submittedAt ?? c.createdAt, isTr)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/campaign-approvals/${c.id}`}
                        className="bz-btn-ghost inline-flex items-center gap-1 px-3 min-h-[32px] text-[11.5px]"
                      >
                        {isTr ? 'Detay' : 'Detail'}
                        <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#EDEDED] px-4 py-3">
              <div className="text-[11.5px] text-[#737373] bz-mono">
                {data.page} / {data.totalPages} · {data.total}{' '}
                {isTr ? 'kampanya' : 'campaigns'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1 || loading}
                  onClick={() => filters.set('page', Math.max(1, data.page - 1))}
                  className="bz-btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={isTr ? 'Önceki' : 'Previous'}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages || loading}
                  onClick={() => filters.set('page', Math.min(data.totalPages, data.page + 1))}
                  className="bz-btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={isTr ? 'Sonraki' : 'Next'}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
