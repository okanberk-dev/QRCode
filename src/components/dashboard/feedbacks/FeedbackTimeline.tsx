import { formatDistanceToNowStrict } from 'date-fns';
import { tr as trLocale, enUS as enLocale } from 'date-fns/locale';
import type { TimelineEvent, TimelineEventType } from '@/lib/feedback-timeline';

// Phase 8c+ §38.33 — Yorumlar detay panelinde ZAMAN ÇİZELGESİ. Tasarım:
// .design-owner-2026/project/page-reviews.jsx line 223-243.
//
// Server-friendly (data prop). Timeline asc compute edilir helper'da; UI
// kronolojik üst → alt render eder (en eski üstte). Empty fallback "Henüz
// aktivite yok" — feedback yeni geldiğinde sadece received event görünür.

const DOT_COLOR: Record<TimelineEventType, string> = {
  received: '#16A34A', // pozitif lime/green — yeni yorum geldi
  ai_draft: '#A8D62E', // lime-deep — AI aktif
  notification: '#737373', // grey — sistem event
  replied: '#0A0A0A', // graphite — owner aksiyon
};

export interface FeedbackTimelineProps {
  events: TimelineEvent[];
  isTr?: boolean;
  /** Header eyebrow override (default "ZAMAN ÇİZELGESİ"). */
  eyebrowLabel?: string;
}

export function FeedbackTimeline({
  events,
  isTr = true,
  eyebrowLabel,
}: FeedbackTimelineProps) {
  const eyebrow = eyebrowLabel ?? (isTr ? 'ZAMAN ÇİZELGESİ' : 'TIMELINE');

  if (events.length === 0) {
    return (
      <section>
        <h3 className="pulse-eyebrow text-[10.5px] mb-3 text-[#737373]">{eyebrow}</h3>
        <p className="text-[12.5px] text-[#737373]">
          {isTr ? 'Henüz aktivite yok.' : 'No activity yet.'}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="pulse-eyebrow text-[10.5px] mb-3 text-[#737373]">{eyebrow}</h3>
      <ol className="flex flex-col gap-3">
        {events.map((event) => {
          const dotColor = DOT_COLOR[event.type] ?? '#737373';
          const relativeTime = formatDistanceToNowStrict(event.timestamp, {
            addSuffix: false,
            locale: isTr ? trLocale : enLocale,
          });
          return (
            <li key={event.id} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="shrink-0 inline-block h-2 w-2 rounded-full mt-1.5"
                style={{ background: dotColor }}
              />
              <div className="flex-1 min-w-0 text-[12.5px] leading-[1.5]">
                <div className="font-semibold text-[#0A0A0A]">{event.title}</div>
                <div className="text-[11px] text-[#737373] mt-0.5">
                  <span className="bz-mono tabular-nums">
                    {isTr ? `${relativeTime} önce` : `${relativeTime} ago`}
                  </span>
                  {event.meta && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span>{event.meta}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default FeedbackTimeline;
