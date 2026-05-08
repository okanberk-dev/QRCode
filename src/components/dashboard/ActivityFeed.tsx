'use client';

// Stage 16 §38.86 — ActivityFeed real-time push.
//
// Önce: server component, dashboard server component'inde Promise.all +
// buildActivityFeed sonrası prop ile render (CLAUDE.md §38.31). Page reload
// yeterli — düşük etkileşim.
//
// Şimdi: client component. `initialEvents` server-render snapshot, mount
// sonrası `useRealtimeActivity` hook'u Supabase Realtime ile feedback
// INSERT'lerini push'lar. 200ms debounce + 50 buffer cap (CLAUDE.md
// §38.86 spec). Toast on new events, slide-in highlight, connection
// state badge.
//
// Disable durumu (env yok / token endpoint 503): hook status='disabled'
// döner — Live badge "Pasif" görünür, page reload mode korunur.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr as trLocale, enUS as enLocale } from 'date-fns/locale';
import type { ActivityEvent, ActivitySentiment } from '@/lib/activity-feed';
import { Eyebrow } from '@/components/ui';
import { useRealtimeActivity, type RealtimeStatus } from '@/hooks/useRealtimeActivity';

const SENTIMENT_DOT: Record<ActivitySentiment, string> = {
  pos: '#16A34A',
  neu: '#737373',
  neg: '#DC2626',
};

const TOAST_AUTO_DISMISS_MS = 5000;

export interface ActivityFeedProps {
  /**
   * Server-render snapshot (CLAUDE.md §38.31). Hook bunu seed olarak alır,
   * sonradan realtime INSERT'leri tepe'ye prepend eder.
   */
  events: ActivityEvent[];
  /** "Tüm aktiviteyi gör" CTA href; default /tr/dashboard/feedbacks. */
  viewAllHref?: string;
  isTr?: boolean;
  /** Wrapper className override (örn. layout grid item). */
  className?: string;
}

interface BadgeStyle {
  label: string;
  dotClass: string;
  /** Aria-live politeness; status değişimleri SR'a duyurulur. */
  ariaLabel: string;
}

function describeStatus(status: RealtimeStatus, isTr: boolean): BadgeStyle {
  if (status === 'connected') {
    return {
      label: isTr ? 'Canlı' : 'Live',
      dotClass: 'bg-[#16A34A]',
      ariaLabel: isTr ? 'Canlı bağlantı aktif' : 'Live connection active',
    };
  }
  if (status === 'connecting' || status === 'reconnecting') {
    return {
      label: isTr ? 'Bağlanıyor' : 'Connecting',
      dotClass: 'bg-[#D97706]',
      ariaLabel: isTr ? 'Bağlantı kuruluyor' : 'Reconnecting',
    };
  }
  if (status === 'offline') {
    return {
      label: isTr ? 'Çevrimdışı' : 'Offline',
      dotClass: 'bg-[#DC2626]',
      ariaLabel: isTr ? 'Bağlantı koptu' : 'Offline',
    };
  }
  // idle | disabled
  return {
    label: isTr ? 'Pasif' : 'Standby',
    dotClass: 'bg-[#737373]',
    ariaLabel: isTr ? 'Canlı akış pasif — sayfa yenilemesi gerekli' : 'Live feed standby — refresh page',
  };
}

function ConnectionBadge({ status, isTr }: { status: RealtimeStatus; isTr: boolean }) {
  const style = describeStatus(status, isTr);
  // `bz-pulse-dot` lime nabız animasyonu zaten globals.css'te (CLAUDE.md
  // §11). Burada sadece connected status için reuse, diğer durumlarda
  // statik renk göstergesi.
  const isLive = status === 'connected';
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={style.ariaLabel}
      className="inline-flex items-center gap-1.5 text-[10.5px] font-medium tracking-wider uppercase text-[#525252]"
    >
      {isLive ? (
        <span aria-hidden="true" className="bz-pulse-dot" />
      ) : (
        <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${style.dotClass}`} />
      )}
      <span>{style.label}</span>
    </span>
  );
}

function NewEventsToast({
  count,
  onDismiss,
  isTr,
}: {
  count: number;
  onDismiss: () => void;
  isTr: boolean;
}) {
  // Auto-dismiss 5s sonra (CLAUDE.md §38.15 dwell timing — success tone).
  useEffect(() => {
    if (count === 0) return;
    const timer = setTimeout(onDismiss, TOAST_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [count, onDismiss]);

  if (count === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#A8D62E] bg-[#EAF9B8] px-3 py-1.5 text-[12px] text-[#0A0A0A]"
    >
      <Sparkles size={12} aria-hidden="true" />
      <span>
        {isTr
          ? count === 1
            ? '1 yeni aktivite'
            : `${count} yeni aktivite`
          : count === 1
            ? '1 new activity'
            : `${count} new activities`}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="bz-btn-icon ml-1"
        aria-label={isTr ? 'Bildirimi kapat' : 'Dismiss notification'}
      >
        <X size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ActivityFeed({
  events: initialEvents,
  isTr = true,
  viewAllHref = isTr ? '/tr/dashboard/feedbacks' : '/en/dashboard/feedbacks',
  className = '',
}: ActivityFeedProps) {
  const { events, status, newEventIds, pendingToastCount, acknowledgeToast } =
    useRealtimeActivity({ initialEvents, isTr });

  // Toast'ı suppress edebileceğimiz local state — kullanıcı X'e bastıktan
  // sonra aynı session'da yeni event gelirse tekrar açılır (yeni count
  // hook tarafından artırılır).
  const [toastSuppressed, setToastSuppressed] = useState(false);
  useEffect(() => {
    if (pendingToastCount === 0) setToastSuppressed(false);
  }, [pendingToastCount]);

  const toastCount = toastSuppressed ? 0 : pendingToastCount;

  if (events.length === 0) {
    return (
      <section className={`bz-card p-5 sm:p-6 ${className}`} aria-busy={status === 'connecting'}>
        <header className="mb-3 flex items-center justify-between gap-3">
          <Eyebrow>{isTr ? 'CANLI AKIŞ' : 'LIVE FEED'}</Eyebrow>
          <ConnectionBadge status={status} isTr={isTr} />
        </header>
        <p className="text-[13px] text-[#737373]">
          {isTr
            ? 'Henüz aktivite yok — yorum, yanıt veya AI taslağı geldikçe burada görünür.'
            : 'No activity yet — feedback, replies, and AI drafts will surface here.'}
        </p>
      </section>
    );
  }

  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`} aria-busy={status === 'connecting'}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eyebrow>{isTr ? 'CANLI AKIŞ' : 'LIVE FEED'}</Eyebrow>
          <ConnectionBadge status={status} isTr={isTr} />
        </div>
        {/*
          Stage 80 §38.160 — "Tüm aktiviteyi gör" CTA mobile 44px
          touch target garantisi (WCAG 2.5.5). sm:+ desktop'ta
          mevcut compact link intact. Realtime push state (§38.86)
          aria-live polite NotificationBell ile aynı paterni paralel.

          Stage 81 §38.161 — `min-h-[44px] sm:min-h-0` inline pattern
          → `bz-touch-target` utility migrate (CLAUDE.md §38.49 dead
          utility class disipline, callsite adopt). sm:+ desktop'ta
          override gerekmez (utility sadece mobile'da min-h sağlar).
        */}
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-[12px] text-[#525252] hover:text-[#0A0A0A] bz-motion-spring bz-touch-target sm:min-h-0 sm:min-w-0 px-2 sm:px-0 -mx-2 sm:mx-0 rounded-lg sm:rounded-none hover:bg-[#FAFAFA] sm:hover:bg-transparent"
        >
          {isTr ? 'Tüm aktiviteyi gör' : 'View all activity'}
          <ArrowRight size={11} strokeWidth={2} />
        </Link>
      </header>

      <NewEventsToast
        count={toastCount}
        onDismiss={() => {
          setToastSuppressed(true);
          acknowledgeToast();
        }}
        isTr={isTr}
      />

      <ol className="flex flex-col">
        {events.map((event, idx) => {
          const dotColor = SENTIMENT_DOT[event.sentiment];
          const relativeTime = formatDistanceToNowStrict(event.timestamp, {
            addSuffix: false,
            locale: isTr ? trLocale : enLocale,
          });
          const isNew = newEventIds.has(event.id);
          const inner = (
            <>
              <span
                className="bz-mono text-[10.5px] text-[#737373] tabular-nums shrink-0 w-[58px] sm:w-[64px]"
                aria-hidden="true"
              >
                {relativeTime}
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 inline-block h-2 w-2 rounded-full mt-1.5"
                style={{ background: dotColor }}
              />
              <span className="flex-1 min-w-0 text-[12.5px] leading-[1.5] text-[#525252]">
                <strong className="font-semibold text-[#0A0A0A]">{event.actor}</strong>
                {' '}
                {event.action}
                {event.target && (
                  <>
                    {' — '}
                    <span className="text-[#737373]">{event.target}</span>
                  </>
                )}
              </span>
            </>
          );
          const baseClass =
            'flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 ' +
            (idx < events.length - 1 ? 'border-b border-[#F2F2F2]' : '');
          // Slide-in highlight: globals.css `activity-row-in` keyframe
          // 1.2s lime-soft glow + translateY. Sadece newEventIds set'inde
          // olan ID'lerde uygulanır; CSS reduced-motion blanket'i
          // [style*='activity-row-in'] selector'ıyla yakalar.
          const slideStyle = isNew
            ? { animation: 'activity-row-in 350ms cubic-bezier(0.4, 0, 0.2, 1)' }
            : undefined;
          return (
            <li key={event.id} style={slideStyle}>
              {event.href ? (
                <Link
                  href={event.href}
                  className={`${baseClass} hover:bg-[#FAFAFA] -mx-2 px-2 rounded-md bz-motion-spring active:scale-[0.97] sm:active:scale-100`}
                >
                  {inner}
                </Link>
              ) : (
                <div className={baseClass}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default ActivityFeed;
