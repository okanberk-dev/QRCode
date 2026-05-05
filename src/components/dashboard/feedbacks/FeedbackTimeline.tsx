import { formatDistanceToNowStrict } from 'date-fns';
import { tr as trLocale, enUS as enLocale } from 'date-fns/locale';
import type { TimelineEvent, TimelineEventType } from '@/lib/feedback-timeline';

// §38.59 — Yorumlar detay panelinde ZAMAN ÇİZELGESİ (rebuild).
// Tasarım: .design-owner-2026/page-reviews.jsx line 223-243 + kullanıcı
// ekran görüntüsü (Yorumlar Inbox detail panel).
//
// İyileştirmeler (eski helper'a göre):
// - İlk event'te (en güncel) lime-soft halo dot pulse
// - Vertical connecting line dot'lar arasında (n200 ince)
// - Latency event meta'sında varsa inline graphite badge ('1.4s' gibi)
// - Title + meta hierarchy daha sıkı (font-size 12.5/10.5)

const DOT_TONE: Record<TimelineEventType, { dot: string; halo: string | null }> = {
  received: { dot: '#16A34A', halo: 'rgba(22,163,74,0.18)' }, // pozitif yeşil
  ai_draft: { dot: '#A8D62E', halo: 'rgba(168,214,46,0.22)' }, // lime-deep
  notification: { dot: '#A3A3A3', halo: null }, // sistem (no halo)
  replied: { dot: '#0A0A0A', halo: null }, // owner aksiyon (no halo)
};

// Latency-like meta fragment'larını ('1.4s', '12.4 ms', '350ms') kapanış
// badge formatına ayır. Diğer meta (örn. 'Slack #yorumlar') olduğu gibi
// metin kalır.
const LATENCY_REGEX = /^(\d+(?:\.\d+)?\s?(?:ms|s|sn|saniye|saniyede))$/i;

function splitLatency(meta?: string): { rest: string | null; latency: string | null } {
  if (!meta) return { rest: null, latency: null };
  // Meta tipik olarak "Google üzerinden" ya da "Slack #yorumlar · 1.4s"
  // formatında gelir. Son segment latency ise ayır.
  const parts = meta.split('·').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { rest: null, latency: null };
  const last = parts[parts.length - 1];
  if (LATENCY_REGEX.test(last)) {
    const rest = parts.slice(0, -1).join(' · ');
    return { rest: rest || null, latency: last };
  }
  return { rest: meta, latency: null };
}

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
      <h3 className="pulse-eyebrow text-[10.5px] mb-3.5 text-[#737373]">{eyebrow}</h3>
      <ol className="relative flex flex-col">
        {events.map((event, idx) => {
          const tone = DOT_TONE[event.type] ?? DOT_TONE.notification;
          const isFirst = idx === 0;
          const isLast = idx === events.length - 1;
          const relativeTime = formatDistanceToNowStrict(event.timestamp, {
            addSuffix: false,
            locale: isTr ? trLocale : enLocale,
          });
          const { rest: metaRest, latency } = splitLatency(event.meta);
          return (
            <li key={event.id} className="relative flex items-start gap-3 pb-3.5 last:pb-0">
              {/* Vertical connecting line — dot'lar arasında ince çizgi.
                  Son item'da render etme; ilk item'da line üstten başlamasın
                  (top: dot center'dan başlasın). */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[5px] top-[14px] bottom-[-2px] w-px bg-[#EDEDED]"
                />
              )}
              {/* Dot — type'a göre renk; ilk event lime-soft halo (pulse) */}
              <span aria-hidden className="relative z-10 mt-1 shrink-0">
                {isFirst && tone.halo && (
                  <span
                    className="absolute inset-0 -m-1.5 rounded-full"
                    style={{ background: tone.halo }}
                  />
                )}
                <span
                  className="relative inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white"
                  style={{ background: tone.dot }}
                />
              </span>

              {/* Title + meta + latency badge */}
              <div className="flex-1 min-w-0 text-[12.5px] leading-[1.5] pt-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-[#0A0A0A] truncate">{event.title}</span>
                  {latency && (
                    <span
                      className="shrink-0 rounded bg-[#0A0A0A] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#C6F24E] tabular-nums"
                      aria-label={isTr ? `Süre: ${latency}` : `Latency: ${latency}`}
                    >
                      {latency}
                    </span>
                  )}
                </div>
                <div className="text-[10.5px] text-[#737373] mt-0.5">
                  <span className="bz-mono tabular-nums">
                    {isTr ? `${relativeTime} önce` : `${relativeTime} ago`}
                  </span>
                  {metaRest && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span>{metaRest}</span>
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
