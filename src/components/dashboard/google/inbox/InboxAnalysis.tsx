'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, ChevronDown, Loader2 } from 'lucide-react';
import { ReputationHealthCard } from '@/components/dashboard/google-reviews/ReputationHealthCard';
import { type ReviewInsights } from '@/lib/google-review-inbox';
import { describeChange, formatDuration } from '@/lib/feedback-metrics';

const OPEN_KEY = 'buaze:google-inbox:analysis-open';

/**
 * Collapsible "Analiz" (CLAUDE.md §54): health score, star distribution,
 * reply time, new reviews and frequent words — all computed on the server
 * from every stored review. Loads only when opened.
 */
export function InboxAnalysis({
  restaurantId,
  locale,
  refreshKey,
  profileSlot,
  embedded = false,
}: {
  restaurantId: string;
  locale: 'tr' | 'en';
  /** Changes when the list changed (a reply was sent) so the numbers follow. */
  refreshKey: number;
  /** The Google Maps profile (rating + checklist), rendered only when open. */
  profileSlot?: ReactNode;
  /** Shown as a page tab: always open, no collapsible header. */
  embedded?: boolean;
}) {
  const isTr = locale === 'tr';
  const [openState, setOpen] = useState(false);
  const open = embedded || openState;
  const [stats, setStats] = useState<ReviewInsights | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(OPEN_KEY) === '1') setOpen(true);
    } catch {
      /* storage blocked */
    }
  }, []);

  const toggle = () => {
    setOpen((v) => {
      try {
        window.localStorage.setItem(OPEN_KEY, v ? '0' : '1');
      } catch {
        /* storage blocked */
      }
      return !v;
    });
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(false);
    fetch(`/api/restaurants/${restaurantId}/google/business/inbox/stats`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: ReviewInsights) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId, refreshKey]);

  const max = Math.max(1, ...(stats?.distribution.map((d) => d.count) ?? [1]));
  const rt = stats?.responseTime;

  return (
    <section className="bz-card">
      {!embedded && (
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left sm:px-5"
      >
        <BarChart3 size={15} aria-hidden="true" className="text-[#525252]" />
        <span className="text-[13.5px] font-semibold text-[#0A0A0A]">{isTr ? 'Analiz' : 'Analysis'}</span>
        <span className="hidden text-[12px] text-[#737373] sm:inline">
          {isTr ? 'Sağlık skoru, puan dağılımı, yanıt süresi, sık geçen kelimeler' : 'Health score, rating mix, reply time, frequent words'}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`ml-auto text-[#737373] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      )}

      {open && (
        <div className={`space-y-5 px-4 py-4 sm:px-5 ${embedded ? 'sm:py-5' : 'border-t border-[#EDEDED]'}`}>
          {error ? (
            <p className="text-[13px] text-[#991B1B]">{isTr ? 'Analiz yüklenemedi.' : 'Analysis could not be loaded.'}</p>
          ) : !stats ? (
            <div className="flex items-center gap-2 text-[13px] text-[#737373]">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              {isTr ? 'Hesaplanıyor…' : 'Calculating…'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-[12.5px] font-medium text-[#525252]">{isTr ? 'Puan dağılımı' : 'Rating mix'}</p>
                  <ul className="mt-2 space-y-1.5">
                    {stats.distribution.map((d) => (
                      <li key={d.rating} className="flex items-center gap-2 text-[12px]">
                        <span className="w-6 tabular-nums text-[#525252]">{d.rating}★</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${(d.count / max) * 100}%`, background: d.rating >= 4 ? '#0A0A0A' : d.rating === 3 ? '#D97706' : '#DC2626' }}
                          />
                        </span>
                        <span className="w-10 text-right tabular-nums text-[#525252]">{d.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[12.5px] font-medium text-[#525252]">{isTr ? 'Yanıt süresi (medyan)' : 'Reply time (median)'}</p>
                  <p className="mt-2 text-[24px] font-semibold tabular-nums text-[#0A0A0A]">
                    {rt?.currentHours != null ? formatDuration(rt.currentHours * 3600_000, isTr) : '—'}
                  </p>
                  {rt?.currentHours != null && rt.previousHours != null ? (() => {
                    const c = describeChange(rt.currentHours, rt.previousHours, { isTr, lowerIsBetter: true });
                    const color = c.tone === 'good' ? '#15803D' : c.tone === 'bad' ? '#B91C1C' : '#737373';
                    return (
                      <p className="mt-1 text-[12px] font-medium" style={{ color }}>
                        {c.arrow ? `${c.arrow} ` : ''}
                        {c.text}
                        {c.arrow ? (isTr ? (c.tone === 'good' ? ' daha hızlı' : ' daha yavaş') : c.tone === 'good' ? ' faster' : ' slower') : ''}
                        <span className="text-[#737373] font-normal">
                          {' · '}
                          {isTr ? 'önceki 30 gün' : 'previous 30 days'}: {formatDuration(rt.previousHours * 3600_000, isTr)}
                        </span>
                      </p>
                    );
                  })() : (
                    <p className="mt-1 text-[12px] text-[#737373]">
                      {rt?.currentHours == null
                        ? isTr ? 'Son 30 günde gelip yanıtlanan yorum yok.' : 'No review from the last 30 days was replied to.'
                        : isTr ? 'Önceki 30 günle karşılaştırma için yeterli yanıt yok.' : 'Not enough replies to compare with the previous 30 days.'}
                    </p>
                  )}
                  <p className="mt-0.5 text-[12px] text-[#737373]">
                    {isTr ? 'Son 30 günde gelen yorumlar' : 'Reviews from the last 30 days'}
                    {rt && rt.backlogReplies > 0
                      ? isTr
                        ? ` · eski yorumlara ${rt.backlogReplies} toplu yanıt ayrı sayıldı`
                        : ` · ${rt.backlogReplies} replies to older reviews counted apart`
                      : ''}
                  </p>
                </div>

                <div>
                  <p className="text-[12.5px] font-medium text-[#525252]">{isTr ? 'Yeni yorumlar' : 'New reviews'}</p>
                  <p className="mt-2 text-[24px] font-semibold tabular-nums text-[#0A0A0A]">{stats.newLast30}</p>
                  <p className="mt-1 text-[12px] text-[#737373]">
                    {isTr ? `Son 30 gün · önceki 30 gün: ${stats.newPrev30}` : `Last 30 days · previous 30 days: ${stats.newPrev30}`}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#A3A3A3]">
                    {isTr ? `Yanıt oranı: %${stats.replyRate ?? 0}` : `Reply rate: ${stats.replyRate ?? 0}%`}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[12.5px] font-medium text-[#525252]">{isTr ? 'Sık geçen kelimeler' : 'Frequent words'}</p>
                {stats.keywords.length === 0 ? (
                  <p className="mt-2 text-[12.5px] text-[#737373]">
                    {isTr ? 'Henüz yeterli yorum metni yok.' : 'Not enough review text yet.'}
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {stats.keywords.map((k) => (
                      <li
                        key={k.word}
                        className={`rounded-full px-2.5 py-1 text-[12px] ${
                          k.sentiment === 'pos'
                            ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                            : k.sentiment === 'neg'
                              ? 'bg-[#FEF2F2] text-[#991B1B]'
                              : 'bg-[#F5F5F5] text-[#525252]'
                        }`}
                      >
                        {k.word} <span className="tabular-nums opacity-70">{k.mentions}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1.5 text-[11px] text-[#A3A3A3]">
                  {isTr
                    ? 'Yalnız müşterinin kendi yazdığı metinden; Google çevirileri sayılmaz.'
                    : "From the customer's own words only; Google translations are not counted."}
                </p>
              </div>

              <ReputationHealthCard restaurantId={restaurantId} locale={locale} />
              {profileSlot}
            </>
          )}
        </div>
      )}
    </section>
  );
}
