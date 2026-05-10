'use client';

// Stage 29 §38.105 — Admin in-app campaign moderation notification bell.
//
// AdminTopbar'da feedback NotificationBell (CLAUDE.md §38.100) yanında
// side-by-side mount edilir. Backend: GET /api/admin/notifications
// (broadcast + per-admin feed). Polling 60s + visibilitychange (owner
// NotificationBell paterni paralel). Click → mark-as-read + click-through
// /admin/campaigns/[campaignId].

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';

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

const POLL_MS = 60_000;

function formatRelative(iso: string, isTr: boolean): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return isTr ? 'şimdi' : 'just now';
    if (ms < 3_600_000) {
      const m = Math.floor(ms / 60_000);
      return isTr ? `${m} dk önce` : `${m}m ago`;
    }
    if (ms < 86_400_000) {
      const h = Math.floor(ms / 3_600_000);
      return isTr ? `${h} sa önce` : `${h}h ago`;
    }
    const d = Math.floor(ms / 86_400_000);
    return isTr ? `${d} gün önce` : `${d}d ago`;
  } catch {
    return iso;
  }
}

export default function AdminCampaignBell({
  locale,
}: {
  locale: 'tr' | 'en';
}) {
  const isTr = locale !== 'en';
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?limit=10');
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: AdminNotificationItem[];
        unreadCount?: number;
      };
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* silent — caller endpoint ihatasında bell silent kalır */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount + polling + visibilitychange resume
  useEffect(() => {
    void fetchFeed();
    const armPoll = () => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') void fetchFeed();
      }, POLL_MS);
    };
    armPoll();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void fetchFeed();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('buaze:admin-notifications-changed', fetchFeed);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('buaze:admin-notifications-changed', fetchFeed);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [fetchFeed]);

  // Click outside close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, { method: 'POST' });
      void fetchFeed();
    } catch {
      /* silent */
    }
  }, [fetchFeed]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/admin/notifications', { method: 'POST' });
      void fetchFeed();
    } catch {
      /* silent */
    }
  }, [fetchFeed]);

  const hasUnread = unreadCount > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={isTr ? 'Kampanya bildirimleri' : 'Campaign notifications'}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#525252] transition-colors hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
      >
        <Sparkles size={16} strokeWidth={2} />
        {hasUnread && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={isTr ? 'Kampanya bildirim paneli' : 'Campaign notification panel'}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] max-w-[90vw] rounded-[12px] border border-[#EDEDED] bg-white shadow-[0_12px_32px_rgba(10,10,10,0.10)]"
        >
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-4 py-3">
            <div className="bz-h-tight text-[13px]">
              {isTr ? 'Kampanya bildirimleri' : 'Campaign notifications'}
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={() => {
                  void markAllRead();
                }}
                className="text-[11px] text-[#525252] hover:text-[#0A0A0A] underline-offset-2 hover:underline"
              >
                {isTr ? 'Hepsini okundu işaretle' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-[#737373]">
                <Loader2 size={14} className="animate-spin" />
                {isTr ? 'Yükleniyor…' : 'Loading…'}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-[#737373]">
                {isTr ? 'Henüz bildirim yok.' : 'No notifications yet.'}
              </div>
            ) : (
              <ul className="divide-y divide-[#EDEDED]">
                {items.map((n) => {
                  const campaignId = n.payload?.campaignId;
                  const href = campaignId
                    ? `/admin/campaign-approvals/${String(campaignId)}`
                    : '/admin/campaign-approvals';
                  const unread = !n.readAt;
                  return (
                    <li key={n.id} className={unread ? 'bg-[#EAF9B8]/40' : ''}>
                      <Link
                        href={href}
                        onClick={() => {
                          if (unread) void markAsRead(n.id);
                          setOpen(false);
                        }}
                        className="flex items-start gap-2 px-4 py-3 hover:bg-[#FAFAFA]"
                      >
                        {unread && (
                          <span
                            aria-hidden
                            className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#C6F24E]"
                          />
                        )}
                        <div className={`flex-1 min-w-0 ${unread ? '' : 'pl-4'}`}>
                          <div className="bz-h-tight truncate text-[12.5px]">{n.title}</div>
                          {n.body && (
                            <div className="mt-0.5 truncate text-[11.5px] text-[#525252]">
                              {n.body}
                            </div>
                          )}
                          <div className="mt-1 text-[10.5px] text-[#737373]">
                            {formatRelative(n.createdAt, isTr)}
                          </div>
                        </div>
                        <ExternalLink size={12} className="mt-1 shrink-0 text-[#A3A3A3]" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-[#EDEDED] px-4 py-2.5 text-right">
            <Link
              href="/admin/campaign-approvals"
              onClick={() => setOpen(false)}
              className="text-[11.5px] text-[#525252] hover:text-[#0A0A0A] underline-offset-2 hover:underline"
            >
              {isTr ? 'Kampanya kuyruğunu aç →' : 'Open campaign queue →'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
