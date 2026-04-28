'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertTriangle,
  Megaphone,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Settings,
} from 'lucide-react';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';

interface AttentionFeedback {
  id: string;
  rating: number;
  comment: string | null;
  name: string | null;
  createdAt: string;
  restaurant?: { name: string } | null;
}

interface NotificationBellProps {
  /** Locale for copy. */
  locale: 'tr' | 'en';
  /** Server-fetched active announcements (already deduped & sorted). */
  announcements?: DashboardAnnouncement[];
  /** Default-link prefix for "settings" + reviews. Admin shell passes
   *  `/admin`; owner shell passes `/${locale}/dashboard`. Used only as
   *  a fallback — explicit `reviewsHref` / `notificationsSettingsHref`
   *  win when present. */
  panelBase?: string;
  /** Where the "All reviews" footer link goes. Owner panel route is
   *  `/${locale}/dashboard/feedbacks`, not `/dashboard/reviews`, so
   *  callers should pass an explicit href. */
  reviewsHref?: string;
  /** Where the gear icon + "settings" footer link goes. Admin has
   *  `/admin/notifications`; owner doesn't have its own route so it
   *  re-uses the admin path (which works for owner role too). */
  notificationsSettingsHref?: string;
  /** Optional accent (defaults to lime — Pulse). */
  iconColor?: string;
}

/**
 * Sağ üstte bell + dropdown. Reuse target: owner DashboardShell + admin
 * AdminTopbar. Two data sources:
 *   1. Server-fetched announcements (passed in, no refetch).
 *   2. Last 5 low-rating feedbacks (`/api/feedback?rating=low&limit=5`)
 *      fetched lazily when the dropdown opens — keeps the initial paint
 *      cheap on every page load.
 *
 * UX:
 *   • Badge shows count of (announcements + attention feedback) capped at 99+.
 *   • Click outside / Escape closes.
 *   • Empty state when there's truly nothing.
 *   • "Bildirim ayarları" link bottom-right.
 *
 * Keeps zero dependencies on form / save flows — purely read.
 */
export default function NotificationBell({
  locale,
  announcements = [],
  panelBase,
  reviewsHref,
  notificationsSettingsHref,
  iconColor,
}: NotificationBellProps) {
  const isTr = locale === 'tr';
  const base = panelBase ?? '/admin';
  const reviewsLink = reviewsHref ?? `${base}/reviews`;
  const settingsLink = notificationsSettingsHref ?? `${base}/notifications`;

  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState<AttentionFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Lazy fetch on first open. Subsequent opens reuse the snapshot to
  // avoid hammering the API (page refresh restarts the cycle).
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/feedback?rating=low&limit=5');
        if (!res.ok) {
          if (!cancelled) {
            setAttention([]);
            setLoaded(true);
          }
          return;
        }
        const json = await res.json();
        const list: AttentionFeedback[] = Array.isArray(json) ? json : json?.data ?? [];
        if (!cancelled) {
          setAttention(list);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setAttention([]);
          setLoaded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  // Click-outside / Escape — close the panel.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const totalCount = announcements.length + attention.length;
  const badgeText = useMemo(() => {
    if (totalCount === 0) return '';
    if (totalCount > 99) return '99+';
    return String(totalCount);
  }, [totalCount]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={isTr ? 'Bildirimler' : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
      >
        <Bell size={16} strokeWidth={2} className={iconColor ? '' : 'text-[#0A0A0A]'} style={iconColor ? { color: iconColor } : undefined} />
        {totalCount > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-semibold text-white"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop on mobile so the user understands it's modal-ish.
              Desktop stays without backdrop — feels like a normal dropdown. */}
          <div
            className="fixed inset-0 z-40 bg-black/10 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label={isTr ? 'Bildirimler paneli' : 'Notifications panel'}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] origin-top-right rounded-2xl border border-[#EDEDED] bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] animate-slide-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#EDEDED] px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell size={14} strokeWidth={2} className="text-[#0A0A0A]" />
                <span
                  className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.01em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Bildirimler' : 'Notifications'}
                </span>
                {totalCount > 0 && (
                  <span className="pulse-eyebrow text-[#737373]">{totalCount}</span>
                )}
              </div>
              <Link
                href={settingsLink}
                onClick={() => setOpen(false)}
                aria-label={isTr ? 'Bildirim ayarları' : 'Notification settings'}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
              >
                <Settings size={13} strokeWidth={2} />
              </Link>
            </div>

            {/* Body — scrollable, max-height capped */}
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Announcements */}
              {announcements.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5">
                    <span className="pulse-eyebrow text-[#A8D62E]">
                      {isTr ? 'DUYURULAR' : 'ANNOUNCEMENTS'}
                    </span>
                  </div>
                  <ul className="px-2 pb-1">
                    {announcements.map((a) => (
                      <li key={a.id}>
                        {a.ctaLink ? (
                          <Link
                            href={a.ctaLink}
                            onClick={() => setOpen(false)}
                            className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-[#FAFAFA]"
                          >
                            <NotificationItem
                              icon={<Megaphone size={14} className="text-[#0A0A0A]" />}
                              title={a.title}
                              message={a.message}
                              isLink
                            />
                          </Link>
                        ) : (
                          <div className="block rounded-xl px-3 py-2.5">
                            <NotificationItem
                              icon={<Megaphone size={14} className="text-[#0A0A0A]" />}
                              title={a.title}
                              message={a.message}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attention feedbacks */}
              {(loading || attention.length > 0) && (
                <div>
                  <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                    <span className="pulse-eyebrow text-[#DC2626]">
                      {isTr ? 'DİKKAT GEREKEN YORUMLAR' : 'ATTENTION REVIEWS'}
                    </span>
                    {loading && <Loader2 size={12} className="animate-spin text-[#737373]" />}
                  </div>
                  <ul className="px-2 pb-2">
                    {attention.map((f) => (
                      <li key={f.id}>
                        <Link
                          href={`${reviewsLink}?focus=${f.id}`}
                          onClick={() => setOpen(false)}
                          className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-[#FAFAFA]"
                        >
                          <NotificationItem
                            icon={
                              <AlertTriangle
                                size={14}
                                className={f.rating <= 2 ? 'text-[#DC2626]' : 'text-[#F59E0B]'}
                              />
                            }
                            title={`${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)} · ${f.name || (isTr ? 'Anonim' : 'Anonymous')}${
                              f.restaurant?.name ? ` · ${f.restaurant.name}` : ''
                            }`}
                            message={
                              f.comment?.trim() ||
                              (isTr ? 'Yorum bırakılmadı' : 'No comment left')
                            }
                            isLink
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty state */}
              {!loading && announcements.length === 0 && attention.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF9B8]">
                    <CheckCircle2 size={18} className="text-[#16A34A]" />
                  </div>
                  <p className="text-[13px] font-medium text-[#0A0A0A]">
                    {isTr ? 'Yeni bildirim yok' : 'No new notifications'}
                  </p>
                  <p className="mt-1 text-[11px] text-[#737373]">
                    {isTr
                      ? 'Sistem duyuruları ve dikkat gereken yorumlar burada görünür.'
                      : 'System announcements and attention reviews appear here.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#EDEDED] px-4 py-2.5 flex items-center justify-between gap-2">
              <Link
                href={reviewsLink}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0A0A0A] hover:underline"
              >
                {isTr ? 'Tüm yorumlar' : 'All reviews'}
                <ExternalLink size={11} strokeWidth={2} />
              </Link>
              <Link
                href={settingsLink}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 pulse-eyebrow text-[#737373] hover:text-[#0A0A0A] transition-colors"
              >
                {isTr ? 'AYARLAR' : 'SETTINGS'}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationItem({
  icon,
  title,
  message,
  isLink = false,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F5F5]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] leading-[1.35] tracking-[-0.01em] ${
            isLink ? 'text-[#0A0A0A] font-semibold' : 'text-[#0A0A0A] font-medium'
          }`}
        >
          {title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.4] text-[#525252]">{message}</p>
      </div>
    </div>
  );
}
