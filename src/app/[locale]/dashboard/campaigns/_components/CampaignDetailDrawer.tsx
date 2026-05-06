'use client';

// CLAUDE.md §38.99 — Owner campaign detail drawer (slide-from-right).
// Pattern: CustomerDetailDrawer §38.14 paterni reuse.

import { useEffect, useMemo, useState } from 'react';
import { Badge, AlertBanner } from '@/components/ui';
import {
  X,
  Loader2,
  Mail,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  campaignStatusBadge,
  campaignStatusLabel,
  logStatusBadge,
  logStatusLabel,
} from '@/lib/customer-campaign-stats';

interface CampaignDetail {
  id: string;
  restaurantId: string;
  restaurantName: string | null;
  subject: string;
  body: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CampaignStats {
  pending: number;
  sent: number;
  failed: number;
  unsubscribed: number;
  total: number;
  deliveryRate: number;
}

interface CampaignLog {
  id: string;
  contactKey: string;
  email: string;
  status: string;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface Props {
  campaignId: string;
  isTr: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function maskEmailDisplay(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return `${email[0] || ''}***`;
  return `${email[0]}***${email.slice(at)}`;
}

function formatDate(iso: string | null, isTr: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function CampaignDetailDrawer({ campaignId, isTr, onClose, onChanged }: Props) {
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'delete' | 'send' | null>(null);

  // ESC + body scroll lock + focus trap (Modal primitive paterni reuse).
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const drawer = document.getElementById('campaign-detail-drawer');
    if (drawer) {
      const focusables = drawer.querySelectorAll<HTMLElement>(FOCUSABLE);
      focusables[0]?.focus();
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && drawer) {
        const focusables = drawer.querySelectorAll<HTMLElement>(FOCUSABLE);
        const arr = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
        if (arr.length === 0) return;
        const first = arr[0];
        const last = arr[arr.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  // Fetch campaign detail.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/customer-campaigns/${campaignId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('campaign_fetch_failed');
        const data = await res.json();
        if (!cancelled) {
          setCampaign(data?.campaign ?? null);
          setStats(data?.stats ?? null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(isTr ? 'Kampanya yüklenemedi.' : 'Failed to load campaign.');
          console.error('[campaign-drawer] fetch', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, isTr]);

  // Fetch logs lazily on expand.
  useEffect(() => {
    if (!logsExpanded || logs.length > 0) return;
    let cancelled = false;
    setLogsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/customer-campaigns/${campaignId}/logs`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('logs_fetch_failed');
        const data = await res.json();
        if (!cancelled) {
          setLogs(Array.isArray(data?.logs) ? data.logs : []);
        }
      } catch (err) {
        console.error('[campaign-drawer] logs', err);
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logsExpanded, logs.length, campaignId]);

  const isDraft = campaign?.status === 'draft';

  const handleSend = async () => {
    if (!isDraft) return;
    if (!confirm(isTr ? 'Kampanyayı şimdi gönder?' : 'Send campaign now?')) return;
    setActionLoading('send');
    setError(null);
    try {
      const res = await fetch(`/api/customer-campaigns/${campaignId}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyMarketingConsent: true }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || 'send_failed');
      }
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown_error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!isDraft) return;
    if (!confirm(isTr ? 'Taslak silinsin mi?' : 'Delete draft?')) return;
    setActionLoading('delete');
    setError(null);
    try {
      const res = await fetch(`/api/customer-campaigns/${campaignId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || 'delete_failed');
      }
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown_error');
    } finally {
      setActionLoading(null);
    }
  };

  const eligibleCount = useMemo(() => {
    if (!stats) return 0;
    return Math.max(stats.total - stats.unsubscribed, 0);
  }, [stats]);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label={isTr ? 'Kapat' : 'Close'}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Drawer */}
      <aside
        id="campaign-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={isTr ? 'Kampanya detayı' : 'Campaign detail'}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] md:w-[480px] bg-white bz-elev-3 overflow-y-auto"
        style={{ animation: 'cust-drawer-in 180ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-[#EDEDED] px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-1">
              {isTr ? 'KAMPANYA' : 'CAMPAIGN'}
            </div>
            <h2 className="bz-h-tight-2 text-[16px] truncate">
              {campaign?.subject ?? (loading ? '...' : isTr ? 'Yüklenemedi' : 'Failed to load')}
            </h2>
            {campaign?.restaurantName ? (
              <div className="text-[11.5px] text-[#525252] mt-0.5">{campaign.restaurantName}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bz-btn-icon-lg shrink-0"
            aria-label={isTr ? 'Kapat' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-[#A3A3A3]" />
            </div>
          ) : !campaign ? (
            <AlertBanner kind="danger">
              {error || (isTr ? 'Kampanya bulunamadı.' : 'Campaign not found.')}
            </AlertBanner>
          ) : (
            <>
              {error ? (
                <AlertBanner kind="danger" onDismiss={() => setError(null)}>
                  {error}
                </AlertBanner>
              ) : null}

              {/* Status row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge kind={campaignStatusBadge(campaign.status)}>
                  {campaignStatusLabel(campaign.status, isTr ? 'tr' : 'en')}
                </Badge>
                <span className="text-[11px] text-[#737373]">
                  {isTr ? 'Oluşturuldu' : 'Created'}: {formatDate(campaign.createdAt, isTr)}
                </span>
              </div>

              {/* Stats grid */}
              {stats ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label={isTr ? 'ALICI' : 'RECIPIENTS'}
                    value={stats.total}
                    icon={<Mail size={14} />}
                    isTr={isTr}
                  />
                  <StatTile
                    label={isTr ? 'TESLİM EDİLEN' : 'DELIVERED'}
                    value={stats.sent}
                    icon={<CheckCircle2 size={14} className="text-[#16A34A]" />}
                    isTr={isTr}
                  />
                  <StatTile
                    label={isTr ? 'BAŞARISIZ' : 'FAILED'}
                    value={stats.failed}
                    icon={<XCircle size={14} className="text-[#DC2626]" />}
                    isTr={isTr}
                  />
                  <StatTile
                    label={isTr ? 'PAZARLAMA ONAYSIZ' : 'NO CONSENT'}
                    value={stats.unsubscribed}
                    icon={<Clock size={14} className="text-[#92400E]" />}
                    isTr={isTr}
                  />
                </div>
              ) : null}

              {stats && stats.sent > 0 ? (
                <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-3.5">
                  <div className="flex items-center justify-between text-[11.5px] text-[#525252] mb-1.5">
                    <span>{isTr ? 'Teslim oranı' : 'Delivery rate'}</span>
                    <span className="bz-mono tabular-nums text-[#0A0A0A] text-[13px]">
                      %{stats.deliveryRate}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden border border-[#EDEDED]">
                    <div
                      className="h-full bg-[#A8D62E] rounded-full"
                      style={{ width: `${Math.min(stats.deliveryRate, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10.5px] text-[#737373] mt-1.5">
                    {stats.sent} / {eligibleCount} {isTr ? 'teslim edildi' : 'delivered'}
                  </div>
                </div>
              ) : null}

              {/* Subject + body preview */}
              <div className="rounded-[12px] border border-[#EDEDED] bg-white p-4">
                <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-1.5">
                  {isTr ? 'KONU' : 'SUBJECT'}
                </div>
                <div className="bz-h-tight text-[13.5px] mb-3">{campaign.subject}</div>
                <div className="pulse-eyebrow text-[10.5px] text-[#737373] mb-1.5">
                  {isTr ? 'MESAJ' : 'MESSAGE'}
                </div>
                <div className="text-[12.5px] text-[#1A1A1A] whitespace-pre-wrap leading-[1.55] max-h-[240px] overflow-y-auto">
                  {campaign.body}
                </div>
              </div>

              {/* Sent timestamp */}
              {campaign.sentAt ? (
                <div className="text-[11.5px] text-[#525252]">
                  <span className="text-[#737373]">
                    {isTr ? 'Gönderildi' : 'Sent at'}:
                  </span>{' '}
                  {formatDate(campaign.sentAt, isTr)}
                </div>
              ) : null}

              {/* Logs section (expandable) */}
              {campaign.status !== 'draft' ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setLogsExpanded(!logsExpanded)}
                    className="bz-btn-ghost w-full flex items-center justify-between px-3 min-h-[40px] text-[12px]"
                  >
                    <span>
                      {isTr ? 'Gönderim kayıtları' : 'Delivery logs'}
                      {stats ? ` (${stats.total})` : ''}
                    </span>
                    <span className="text-[10.5px] text-[#737373]">
                      {logsExpanded ? (isTr ? 'Gizle' : 'Hide') : (isTr ? 'Göster' : 'Show')}
                    </span>
                  </button>
                  {logsExpanded ? (
                    <div className="mt-2 rounded-[12px] border border-[#EDEDED] bg-white max-h-[320px] overflow-y-auto">
                      {logsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 size={16} className="animate-spin text-[#A3A3A3]" />
                        </div>
                      ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-[12px] text-[#737373]">
                          {isTr ? 'Henüz kayıt yok' : 'No logs yet'}
                        </div>
                      ) : (
                        <ul className="divide-y divide-[#EDEDED]">
                          {logs.map((l) => (
                            <li key={l.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] bz-mono truncate">
                                  {maskEmailDisplay(l.email)}
                                </div>
                                {l.errorMessage ? (
                                  <div className="text-[10.5px] text-[#92400E] truncate" title={l.errorMessage}>
                                    {l.errorMessage}
                                  </div>
                                ) : (
                                  <div className="text-[10.5px] text-[#737373]">
                                    {formatDate(l.sentAt || l.createdAt, isTr)}
                                  </div>
                                )}
                              </div>
                              <Badge kind={logStatusBadge(l.status)}>
                                {logStatusLabel(l.status, isTr ? 'tr' : 'en')}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Action row (drafts only) */}
              {isDraft ? (
                <div className="pt-3 border-t border-[#EDEDED] flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={actionLoading !== null}
                    className="bz-btn-primary flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px] flex-1 justify-center disabled:opacity-50"
                  >
                    {actionLoading === 'send' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {isTr ? 'Şimdi gönder' : 'Send now'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={actionLoading !== null}
                    className="bz-btn-ghost flex items-center gap-1.5 px-3 min-h-[40px] text-[12.5px] text-[#DC2626] disabled:opacity-50"
                  >
                    {actionLoading === 'delete' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {isTr ? 'Sil' : 'Delete'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function StatTile({
  label,
  value,
  icon,
  isTr,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  isTr: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-[#EDEDED] bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1.5 text-[#737373]">
        {icon}
        <span className="pulse-eyebrow text-[9.5px]">{label}</span>
      </div>
      <div className="bz-h-tight text-[20px] tabular-nums">
        {value.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
      </div>
    </div>
  );
}
