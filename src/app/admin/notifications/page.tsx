'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Circle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { AlertBanner, EmptyState, PageHeader } from '@/components/ui';

interface AdminNotificationItem {
  id: string;
  adminId: string | null;
  type: string;
  title: string;
  body: string | null;
  payload: { campaignId?: string; restaurantName?: string; [key: string]: unknown } | null;
  readAt: string | null;
  createdAt: string;
}

function formatRelative(iso: string, isTr: boolean) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return isTr ? 'şimdi' : 'just now';
    if (ms < 3_600_000) {
      const minutes = Math.floor(ms / 60_000);
      return isTr ? `${minutes} dk önce` : `${minutes}m ago`;
    }
    if (ms < 86_400_000) {
      const hours = Math.floor(ms / 3_600_000);
      return isTr ? `${hours} sa önce` : `${hours}h ago`;
    }
    const days = Math.floor(ms / 86_400_000);
    return isTr ? `${days} gün önce` : `${days}d ago`;
  } catch {
    return iso;
  }
}

function notificationHref(notification: AdminNotificationItem) {
  const campaignId = notification.payload?.campaignId;
  if (campaignId) return `/admin/campaign-approvals/${String(campaignId)}`;
  return '/admin/campaign-approvals';
}

export default function AdminNotificationsPage() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/admin/notifications', window.location.origin);
      url.searchParams.set('limit', '50');
      if (unreadOnly) url.searchParams.set('unreadOnly', 'true');
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (err) {
      console.error('[admin-notifications] feed', err);
      setError(isTr ? 'Bildirimler yüklenemedi.' : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [isTr, unreadOnly]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  const hasUnreadInList = useMemo(() => items.some((item) => !item.readAt), [items]);

  const notifyBell = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('buaze:admin-notifications-changed'));
    }
  };

  const markOne = async (id: string) => {
    if (pendingId) return;
    const now = new Date().toISOString();
    const previous = items;
    setPendingId(id);
    setItems((list) => list.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? now } : item)));
    try {
      const res = await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('mark_failed');
      notifyBell();
      await fetchFeed();
    } catch (err) {
      console.error('[admin-notifications] mark one', err);
      setItems(previous);
      setError(isTr ? 'Bildirim okundu işaretlenemedi.' : 'Could not mark notification as read.');
    } finally {
      setPendingId(null);
    }
  };

  const markAll = async () => {
    if (bulkPending) return;
    const now = new Date().toISOString();
    const previous = items;
    setBulkPending(true);
    setItems((list) => list.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('mark_all_failed');
      notifyBell();
      await fetchFeed();
    } catch (err) {
      console.error('[admin-notifications] mark all', err);
      setItems(previous);
      setError(isTr ? 'Bildirimler okundu işaretlenemedi.' : 'Could not mark notifications as read.');
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-7 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'ADMIN FEED' : 'ADMIN FEED'}
        title={isTr ? 'Bildirimler' : 'Notifications'}
        description={
          isTr
            ? 'Kampanya onayları ve yönetim olayları burada gerçek admin bildirim akışı olarak görünür.'
            : 'Campaign approvals and admin events appear here as the real admin notification feed.'
        }
        titleScale="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUnreadOnly((value) => !value)}
              className={`bz-btn inline-flex items-center gap-1.5 px-3 text-[12.5px] ${
                unreadOnly ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]' : ''
              }`}
              aria-pressed={unreadOnly}
            >
              <Circle size={12} fill={unreadOnly ? '#C6F24E' : 'none'} />
              {isTr ? 'Okunmamış' : 'Unread'}
              {unreadCount > 0 ? <span className="font-mono">{unreadCount}</span> : null}
            </button>
            <button
              type="button"
              onClick={() => void fetchFeed()}
              disabled={loading}
              className="bz-btn inline-flex items-center gap-1.5 px-3 text-[12.5px] disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {isTr ? 'Yenile' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={bulkPending || unreadCount === 0}
              className="bz-btn-primary inline-flex items-center gap-1.5 px-3 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
              {isTr ? 'Hepsini okundu işaretle' : 'Mark all read'}
            </button>
          </div>
        }
      />

      {error ? (
        <div className="mt-4">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-[16px] border border-[#EDEDED] bg-white">
        {loading && items.length === 0 ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-xl bg-[#F5F5F5]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<Bell size={24} strokeWidth={1.8} />}
              title={unreadOnly ? (isTr ? 'Okunmamış bildirim yok' : 'No unread notifications') : (isTr ? 'Henüz bildirim yok' : 'No notifications yet')}
              body={
                unreadOnly
                  ? isTr
                    ? 'Tüm admin bildirimleri okunmuş görünüyor.'
                    : 'All admin notifications are currently read.'
                  : isTr
                    ? 'Yeni kampanya ve yönetim olayları burada listelenecek.'
                    : 'New campaign and admin events will appear here.'
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#EDEDED]">
            {items.map((item) => {
              const unread = !item.readAt;
              const href = notificationHref(item);
              return (
                <li key={item.id} className={unread ? 'bg-[#F8FDE8]' : 'bg-white'}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <Link href={href} className="group flex min-w-0 flex-1 items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          unread ? 'bg-[#C6F24E]' : 'bg-[#D4D4D4]'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-semibold text-[#0A0A0A] group-hover:underline group-hover:decoration-[#C6F24E] group-hover:decoration-2">
                            {item.title}
                          </span>
                          <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">
                            {item.type}
                          </span>
                        </span>
                        {item.body ? (
                          <span className="mt-1 block text-[12.5px] leading-[1.55] text-[#525252]">
                            {item.body}
                          </span>
                        ) : null}
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-[#737373]">
                          <span>{formatRelative(item.createdAt, isTr)}</span>
                          {item.payload?.restaurantName ? <span>· {String(item.payload.restaurantName)}</span> : null}
                          <ExternalLink size={12} />
                        </span>
                      </span>
                    </Link>
                    {unread ? (
                      <button
                        type="button"
                        onClick={() => void markOne(item.id)}
                        disabled={pendingId === item.id}
                        className="bz-btn self-start px-3 py-1.5 text-[12px] disabled:opacity-60"
                      >
                        {pendingId === item.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCheck size={12} />
                        )}
                        {isTr ? 'Okundu' : 'Read'}
                      </button>
                    ) : (
                      <span className="pulse-eyebrow self-start rounded-full bg-[#F5F5F5] px-3 py-1.5 text-[#737373]">
                        {isTr ? 'OKUNDU' : 'READ'}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!loading && hasUnreadInList ? (
        <p className="mt-3 text-[12px] text-[#737373]">
          {isTr
            ? 'Broadcast bildirimlerde okundu bilgisi her admin için ayrı tutulur.'
            : 'Broadcast notification read state is tracked separately for each admin.'}
        </p>
      ) : null}
    </div>
  );
}
