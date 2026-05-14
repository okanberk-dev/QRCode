'use client';

// Stage 29 §38.105 — Admin campaign moderation detail page.
//
// Server-side fetch (admin endpoint /api/admin/campaigns/[id]) + client
// island for approve/reject actions (AdminCampaignApprovalActions). Audit
// history reuse — direct link to /admin/audit-logs?targetId=<id>.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  PageHeader,
} from '@/components/ui';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import AdminCampaignApprovalActions from '@/components/admin/AdminCampaignApprovalActions';
import {
  campaignStatusBadge,
  campaignStatusLabel,
} from '@/lib/customer-campaign-stats';

interface Detail {
  campaign: {
    id: string;
    restaurantId: string;
    restaurantName: string | null;
    restaurantSlug: string | null;
    subject: string;
    body: string;
    status: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    submittedAt: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    sentAt: string | null;
    reviewerNote: string | null;
    createdAt: string;
    updatedAt: string;
  };
  owner: { id: string; name: string | null; email: string | null } | null;
  creator: { id: string; name: string | null; email: string | null } | null;
  // Stage 30 §38.106 — backend `id` field expose etmiyor (PII).
  approver: { username: string } | null;
  rejecter: { username: string } | null;
  stats: {
    pending: number;
    sent: number;
    failed: number;
    unsubscribed: number;
    total: number;
    deliveryRate: number;
  };
}

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

export default function AdminCampaignApprovalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { locale } = useAdminTranslation();
  const isTr = locale !== 'en';

  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { cache: 'no-store' });
      if (res.status === 403) {
        setError(
          isTr
            ? 'Bu kampanyayı görme yetkin yok.'
            : 'You do not have permission to view this campaign.',
        );
        setData(null);
        return;
      }
      if (res.status === 404) {
        setError(isTr ? 'Kampanya bulunamadı.' : 'Campaign not found.');
        setData(null);
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as Detail;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, [id, isTr]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // §40.10 clean slate — skeleton return kaldırıldı; data gelene kadar null.
  if (loading && !data) return null;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <Link
          href="/admin/campaign-approvals"
          className="bz-btn-ghost inline-flex items-center gap-1 px-3 min-h-[34px] text-[12px]"
        >
          <ArrowLeft size={13} />
          {isTr ? 'Geri' : 'Back'}
        </Link>
        <AlertBanner kind="danger">{error ?? 'unknown'}</AlertBanner>
      </div>
    );
  }

  const c = data.campaign;
  const ownerLabel = data.owner?.name ?? data.creator?.name ?? '—';
  const ownerEmail = data.owner?.email ?? data.creator?.email ?? '';

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <Link
        href="/admin/campaign-approvals"
        className="bz-btn-ghost inline-flex items-center gap-1 px-3 min-h-[34px] text-[12px]"
      >
        <ArrowLeft size={13} />
        {isTr ? 'Kuyruğa dön' : 'Back to queue'}
      </Link>

      <PageHeader
        eyebrow={isTr ? 'KAMPANYA DETAYI' : 'CAMPAIGN DETAIL'}
        title={c.subject}
        description={c.restaurantName ?? c.restaurantId}
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

      {/* Status badge + actions row */}
      <div className="bz-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge kind={campaignStatusBadge(c.status)}>
            {campaignStatusLabel(c.status, isTr ? 'tr' : 'en')}
          </Badge>
          <span className="text-[12px] text-[#525252]">
            {isTr ? 'Submit' : 'Submitted'}: {formatDateTime(c.submittedAt ?? c.createdAt, isTr)}
          </span>
        </div>
        <AdminCampaignApprovalActions
          campaignId={c.id}
          status={c.status}
          isTr={isTr}
        />
      </div>

      {/* Owner + restaurant info */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bz-card p-5">
          <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-2">
            {isTr ? 'İŞLETME' : 'RESTAURANT'}
          </div>
          <div className="bz-h-tight text-[15px] mb-1">{c.restaurantName ?? c.restaurantId}</div>
          {c.restaurantSlug && (
            <div className="bz-mono text-[11.5px] text-[#737373]">/{c.restaurantSlug}</div>
          )}
          <Link
            href={`/admin/restaurants/${c.restaurantId}`}
            className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#525252] underline-offset-2 hover:underline"
          >
            {isTr ? 'Restoran detayı' : 'Restaurant detail'}
            <ExternalLink size={11} />
          </Link>
        </div>

        <div className="bz-card p-5">
          <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-2">
            {isTr ? 'OWNER' : 'OWNER'}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#1A1A1A]">
            <UserIcon size={14} className="text-[#525252]" />
            {ownerLabel}
          </div>
          {ownerEmail && (
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[#525252]">
              <Mail size={12} />
              <span className="bz-mono">{ownerEmail}</span>
            </div>
          )}
          {data.owner?.id && (
            <Link
              href={`/admin/members/${data.owner.id}`}
              className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#525252] underline-offset-2 hover:underline"
            >
              {isTr ? 'Owner profili' : 'Owner profile'}
              <ExternalLink size={11} />
            </Link>
          )}
        </div>
      </div>

      {/* Subject + body preview */}
      <div className="bz-card p-5 space-y-3">
        <div>
          <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-1.5">
            {isTr ? 'KONU' : 'SUBJECT'}
          </div>
          <div className="bz-h-tight text-[14.5px]">{c.subject}</div>
        </div>
        <div>
          <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-1.5">
            {isTr ? 'MESAJ İÇERİĞİ' : 'MESSAGE BODY'}
          </div>
          <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-4 text-[12.5px] text-[#1A1A1A] whitespace-pre-wrap leading-[1.6] max-h-[420px] overflow-y-auto">
            {c.body}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="bz-card p-5">
        <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-3">
          {isTr ? 'TESLİM ÖZETİ' : 'DELIVERY SUMMARY'}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[11px] text-[#737373]">{isTr ? 'Alıcı' : 'Recipients'}</div>
            <div className="bz-h-tight text-[20px] mt-1">{c.recipientCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#737373]">{isTr ? 'Gönderildi' : 'Sent'}</div>
            <div className="bz-h-tight text-[20px] mt-1 text-[#16A34A]">{c.sentCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#737373]">{isTr ? 'Başarısız' : 'Failed'}</div>
            <div className="bz-h-tight text-[20px] mt-1 text-[#DC2626]">{c.failedCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#737373]">
              {isTr ? 'Pazarlama onayı yok' : 'No consent'}
            </div>
            <div className="bz-h-tight text-[20px] mt-1 text-[#737373]">
              {data.stats.unsubscribed}
            </div>
          </div>
        </div>
      </div>

      {/* Reviewer note (rejected only) */}
      {c.status === 'rejected' && c.reviewerNote && (
        <div className="rounded-[12px] border-l-[3px] border-l-[#FDE68A] border-y border-r border-y-[#FDE68A] border-r-[#FDE68A] bg-[#FFFBEB] p-4">
          <div className="pulse-eyebrow text-[10.5px] text-[#92400E] mb-1.5">
            {isTr ? 'GEREKÇE' : 'REASON'}
          </div>
          <div className="text-[12.5px] text-[#1A1A1A] whitespace-pre-wrap leading-[1.55]">
            {c.reviewerNote}
          </div>
          {data.rejecter && (
            <div className="mt-2 text-[11px] text-[#92400E]">
              {isTr ? 'Reddeden' : 'Rejected by'}: <strong>{data.rejecter.username}</strong>
              {c.rejectedAt && ` · ${formatDateTime(c.rejectedAt, isTr)}`}
            </div>
          )}
        </div>
      )}

      {/* Approver info (approved only) */}
      {c.status !== 'pending_approval' && c.status !== 'draft' && data.approver && c.approvedAt && (
        <div className="bz-card-soft p-4">
          <div className="text-[11.5px] text-[#525252]">
            {isTr ? 'Onaylayan' : 'Approved by'}: <strong>{data.approver.username}</strong>
            {' · '}
            {formatDateTime(c.approvedAt, isTr)}
          </div>
        </div>
      )}

      {/* Audit history link */}
      <div className="bz-card-soft p-4 flex items-center justify-between">
        <div>
          <div className="bz-h-tight text-[13px]">
            {isTr ? 'Audit geçmişi' : 'Audit history'}
          </div>
          <div className="text-[11.5px] text-[#737373]">
            {isTr
              ? 'Bu kampanya için yapılan tüm submit/approve/reject/send aksiyonlarını görüntüle.'
              : 'View all submit/approve/reject/send actions for this campaign.'}
          </div>
        </div>
        <Link
          href={`/admin/audit-logs?targetId=${c.id}`}
          className="bz-btn-ghost inline-flex items-center gap-1.5 px-3 min-h-[36px] text-[12.5px]"
        >
          {isTr ? 'Audit log' : 'Audit log'}
          <ExternalLink size={11} />
        </Link>
      </div>

      {/* Logs link */}
      <div className="bz-card-soft p-4 flex items-center justify-between">
        <div>
          <div className="bz-h-tight text-[13px]">
            {isTr ? 'Teslim logları' : 'Delivery logs'}
          </div>
          <div className="text-[11.5px] text-[#737373]">
            {isTr
              ? 'Per-recipient gönderim durumu (sent / failed / unsubscribed).'
              : 'Per-recipient delivery status (sent / failed / unsubscribed).'}
          </div>
        </div>
        <Link
          href={`/api/admin/campaigns/${c.id}/logs`}
          className="bz-btn-ghost inline-flex items-center gap-1.5 px-3 min-h-[36px] text-[12.5px]"
          target="_blank"
          rel="noopener noreferrer"
        >
          JSON
          <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  );
}
