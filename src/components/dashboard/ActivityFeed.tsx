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
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  MessageSquare,
  Reply,
  Settings,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { formatDistanceToNowStrict, subDays } from 'date-fns';
import { tr as trLocale, enUS as enLocale } from 'date-fns/locale';
import type { ActivityEvent, ActivitySentiment, ActivityType } from '@/lib/activity-feed';
import { Eyebrow } from '@/components/ui';
import { useRealtimeActivity, type RealtimeStatus } from '@/hooks/useRealtimeActivity';
import {
  formatClock,
  formatFullDateTimeInTimeZone,
  isSameDayInTimeZone,
} from '@/lib/timezone';

const SENTIMENT_DOT: Record<ActivitySentiment, string> = {
  pos: '#16A34A',
  neu: '#737373',
  neg: '#DC2626',
};

const TYPE_META: Record<
  ActivityType,
  { icon: typeof MessageSquare; tint: string; bg: string }
> = {
  feedback: { icon: MessageSquare, tint: '#0A0A0A', bg: '#FAFAFA' },
  reply: { icon: Reply, tint: '#0A0A0A', bg: '#EAF9B8' },
  ai_draft: { icon: Sparkles, tint: '#A8D62E', bg: '#0A0A0A' },
  system: { icon: Settings, tint: '#737373', bg: '#F5F5F5' },
};

const TOAST_AUTO_DISMISS_MS = 5000;

/**
 * Group events into "Bugün / Dün / Daha eski" buckets so the timeline
 * has visual rhythm beyond a single endless list. Buckets preserve
 * timestamp-desc order within and across groups.
 */
function groupEventsByDay(
  events: ActivityEvent[],
  isTr: boolean,
): { label: string; events: ActivityEvent[] }[] {
  if (events.length === 0) return [];
  const now = new Date();
  const yesterday = subDays(now, 1);
  const buckets = new Map<string, ActivityEvent[]>();
  const labelToday = isTr ? 'Bugün' : 'Today';
  const labelYesterday = isTr ? 'Dün' : 'Yesterday';
  const labelOlder = isTr ? 'Daha eski' : 'Earlier';

  for (const ev of events) {
    let key = labelOlder;
    // Gün sınırı işletmenin yerel saatine göre (CLAUDE.md §46). date-fns
    // `isSameDay` çalıştığı ortamın TZ'sini kullanır: sunucuda (UTC) gece
    // yarısına yakın bir yorum "Dün" grubuna düşerken tarayıcıda "Bugün"
    // görünüyordu.
    if (isSameDayInTimeZone(ev.timestamp, now)) key = labelToday;
    else if (isSameDayInTimeZone(ev.timestamp, yesterday)) key = labelYesterday;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(ev);
  }
  // Insertion order is preserved; events were already sorted desc.
  const order: string[] = [];
  for (const key of [labelToday, labelYesterday, labelOlder]) {
    if (buckets.has(key)) order.push(key);
  }
  return order.map((key) => ({ label: key, events: buckets.get(key)! }));
}

/**
 * Pulls a 1–5 star rating embedded in the `target` string (e.g.
 * "★★★★★ Google" or "★★ — Müşteri T."). Returns null when no leading
 * star sequence is present so non-feedback rows render normally.
 */
function extractRatingFromTarget(target: string | undefined): number | null {
  if (!target) return null;
  const match = target.match(/^(★+)/);
  if (!match) return null;
  const count = match[1].length;
  if (count < 1 || count > 5) return null;
  return count;
}

export interface ActivityFeedProps {
  /**
   * Server-render snapshot (CLAUDE.md §38.31). Hook bunu seed olarak alır,
   * sonradan realtime INSERT'leri tepe'ye prepend eder.
   */
  events: ActivityEvent[];
  /**
   * Businesses the feed covers; live pushes outside them are ignored. Key the
   * component by the same scope so a business switch also resets the list.
   */
  restaurantIds?: string[];
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
  // Only meaningful states get a badge: "Canlı" while connected and a warning
  // when a live connection drops. The first connect attempt and the
  // no-realtime fallback (idle / disabled) show nothing — a permanent
  // "Pasif" chip next to the title was noise.
  if (status === 'idle' || status === 'disabled' || status === 'connecting') return null;
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
  restaurantIds,
  isTr = true,
  viewAllHref = isTr ? '/tr/dashboard/feedbacks' : '/en/dashboard/feedbacks',
  className = '',
}: ActivityFeedProps) {
  const { events, status, newEventIds, pendingToastCount, acknowledgeToast } =
    useRealtimeActivity({ initialEvents, restaurantIds, isTr });

  // §46 — mutlak saat artık sabit bir saat diliminde (işletmenin yerel
  // saati) üretiliyor, yani sunucu ve tarayıcı aynı string'i basıyor.
  // Eski `clockReady` hydration gate'i (§38.237) bu yüzden kaldırıldı:
  // saat ilk paint'te görünür, boş bir satır olarak beklemez.

  // Toast'ı suppress edebileceğimiz local state — kullanıcı X'e bastıktan
  // sonra aynı session'da yeni event gelirse tekrar açılır (yeni count
  // hook tarafından artırılır).
  const [toastSuppressed, setToastSuppressed] = useState(false);
  useEffect(() => {
    if (pendingToastCount === 0) setToastSuppressed(false);
  }, [pendingToastCount]);

  const toastCount = toastSuppressed ? 0 : pendingToastCount;

  const groupedEvents = useMemo(() => groupEventsByDay(events, isTr), [events, isTr]);

  if (events.length === 0) {
    return (
      <section className={`bz-card p-5 sm:p-6 ${className}`} aria-busy={status === 'connecting'}>
        <header className="mb-3 flex items-center justify-between gap-3">
          <Eyebrow>{isTr ? 'SON AKTİVİTE' : 'RECENT ACTIVITY'}</Eyebrow>
          <ConnectionBadge status={status} isTr={isTr} />
        </header>
        <div className="flex flex-col items-center gap-2.5 py-6 text-center">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA]"
          >
            <Sparkles size={16} strokeWidth={1.6} className="text-[#A3A3A3]" />
          </span>
          <p className="text-[13px] leading-[1.5] text-[#525252] max-w-[260px]">
            {isTr
              ? 'Henüz aktivite yok — yorum, yanıt veya AI taslağı geldikçe burada görünür.'
              : 'No activity yet — feedback, replies, and AI drafts will surface here.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`} aria-busy={status === 'connecting'}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eyebrow>{isTr ? 'SON AKTİVİTE' : 'RECENT ACTIVITY'}</Eyebrow>
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

      <div className="flex flex-col gap-3">
        {groupedEvents.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h3 className="bz-mono text-[10px] font-semibold tracking-[0.18em] uppercase text-[#A3A3A3] mb-1.5">
              {group.label}
            </h3>
            <ol className="flex flex-col">
              {group.events.map((event, idx) => {
                const dotColor = SENTIMENT_DOT[event.sentiment];
                const meta = TYPE_META[event.type];
                const Icon = meta.icon;
                const relativeTime = formatDistanceToNowStrict(event.timestamp, {
                  addSuffix: false,
                  locale: isTr ? trLocale : enLocale,
                });
                // §38.237 — mutlak saat. Göreli süre tek başına "yorum tam
                // olarak ne zaman geldi" sorusunu yanıtlamıyordu.
                // §46 — işletmenin yerel saati. Sabit TZ olduğu için sunucu
                // ve tarayıcı aynı string'i üretir (hydration-safe).
                const clockTime = formatClock(event.timestamp, isTr ? 'tr' : 'en');
                const fullTime = formatFullDateTimeInTimeZone(
                  event.timestamp,
                  isTr ? 'tr' : 'en',
                );
                const isNew = newEventIds.has(event.id);
                const inlineRating =
                  event.type === 'feedback' ? extractRatingFromTarget(event.target) : null;
                // Strip the leading "★★★★ " segment so we don't double-render
                // when we surface stars as visual chips above.
                const targetWithoutStars = inlineRating
                  ? event.target?.replace(/^★+\s*[—-]?\s*/, '').trim() ?? ''
                  : event.target;

                const inner = (
                  <>
                    <span
                      className="bz-mono text-[10.5px] text-[#737373] tabular-nums shrink-0 w-[52px] sm:w-[58px] pt-0.5 flex flex-col leading-[1.3]"
                      aria-hidden="true"
                      title={fullTime}
                    >
                      {/* Relative time moves with the clock: server render and
                          hydration can land in different minutes. */}
                      <span suppressHydrationWarning>{relativeTime}</span>
                      <span className="text-[#A3A3A3]">{clockTime}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="relative shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md mt-[1px]"
                      style={{ background: meta.bg, color: meta.tint }}
                    >
                      <Icon size={11} strokeWidth={2.2} />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 inline-block h-1.5 w-1.5 rounded-full ring-2 ring-white"
                        style={{ background: dotColor }}
                      />
                    </span>
                    <span className="flex-1 min-w-0 text-[12.5px] leading-[1.5] text-[#525252]">
                      <strong className="font-semibold text-[#0A0A0A]">{event.actor}</strong>{' '}
                      {event.action}
                      {inlineRating !== null && (
                        <span
                          className="ml-1 inline-flex items-center align-middle gap-0.5"
                          aria-label={`${inlineRating} ${isTr ? 'yıldız' : 'stars'}`}
                        >
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={9}
                              className={s <= inlineRating ? 'text-[#0A0A0A]' : 'text-[#EDEDED]'}
                              fill={s <= inlineRating ? '#0A0A0A' : 'transparent'}
                              strokeWidth={1.5}
                            />
                          ))}
                        </span>
                      )}
                      {targetWithoutStars && (
                        <>
                          {' — '}
                          <span className="text-[#737373]">{targetWithoutStars}</span>
                        </>
                      )}
                    </span>
                    {event.href && (
                      <ChevronRight
                        size={12}
                        strokeWidth={2}
                        className="shrink-0 self-center text-[#A3A3A3] opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden="true"
                      />
                    )}
                  </>
                );
                const baseClass =
                  'group flex items-start gap-2 py-2.5 first:pt-0 last:pb-0 ' +
                  (idx < group.events.length - 1 ? 'border-b border-[#F2F2F2]' : '');
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
        ))}
      </div>
    </section>
  );
}

export default ActivityFeed;
