import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr as trLocale, enUS as enLocale } from 'date-fns/locale';
import type { ActivityEvent, ActivitySentiment } from '@/lib/activity-feed';
import { Eyebrow } from '@/components/ui';

// Phase 8c+ §38.31 — CANLI AKIŞ timeline section. Tasarım kaynağı:
// .design-owner-2026/project/page-dashboard.jsx ActivityRow line 120-132 +
// section line 17-23 (mock 5-row).
//
// Server component — data prop ile gelir, helper buildActivityFeed pure
// fonksiyon (dashboard server component'inde 4 query union edilir).

const SENTIMENT_DOT: Record<ActivitySentiment, string> = {
  pos: '#16A34A',
  neu: '#737373',
  neg: '#DC2626',
};

export interface ActivityFeedProps {
  /** En fazla 5-6 row önerilir; helper buildActivityFeed `limit` ile pre-slice. */
  events: ActivityEvent[];
  /** "Tüm aktiviteyi gör" CTA href; default /dashboard/feedbacks. */
  viewAllHref?: string;
  isTr?: boolean;
  /** Wrapper className override (örn. layout grid item). */
  className?: string;
}

export function ActivityFeed({
  events,
  viewAllHref = '/dashboard/feedbacks',
  isTr = true,
  className = '',
}: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <section className={`bz-card p-5 sm:p-6 ${className}`}>
        <header className="mb-3 flex items-center justify-between gap-3">
          <Eyebrow>{isTr ? 'CANLI AKIŞ' : 'LIVE FEED'}</Eyebrow>
          <span aria-hidden="true" className="bz-pulse-dot" />
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
    <section className={`bz-card p-5 sm:p-6 ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eyebrow>{isTr ? 'CANLI AKIŞ' : 'LIVE FEED'}</Eyebrow>
          <span aria-hidden="true" className="bz-pulse-dot" />
        </div>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-[12px] text-[#525252] hover:text-[#0A0A0A] transition-colors"
        >
          {isTr ? 'Tüm aktiviteyi gör' : 'View all activity'}
          <ArrowRight size={11} strokeWidth={2} />
        </Link>
      </header>

      <ol className="flex flex-col">
        {events.map((event, idx) => {
          const dotColor = SENTIMENT_DOT[event.sentiment];
          const relativeTime = formatDistanceToNowStrict(event.timestamp, {
            addSuffix: false,
            locale: isTr ? trLocale : enLocale,
          });
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
          const className =
            'flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 ' +
            (idx < events.length - 1 ? 'border-b border-[#F2F2F2]' : '');
          return (
            <li key={event.id}>
              {event.href ? (
                <Link
                  href={event.href}
                  className={`${className} hover:bg-[#FAFAFA] -mx-2 px-2 rounded-md transition-colors`}
                >
                  {inner}
                </Link>
              ) : (
                <div className={className}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default ActivityFeed;
