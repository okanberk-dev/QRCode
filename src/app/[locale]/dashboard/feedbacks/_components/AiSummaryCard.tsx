'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Repeat, Sparkles, ThumbsUp, Wrench } from 'lucide-react';

// §38.53 — AI ÖZET card (3-sinyal: Pozitif / İyileştirme / Tekrar gelme niyeti).
// Tasarım kaynağı: .design-owner-2026/page-feedbacks.jsx FeedbackDetail body
// "AI ÖZET" card (n-50 bg + n-150 border + Zap icon + 3-bullet list).
//
// Backend: /api/feedback/[id]/summary POST (CLAUDE.md §38.53). 24h cache,
// rate-limited 30/dk/owner. The card starts as one row with an "Özet çıkar"
// button: the AI call runs only when the owner asks (§15).

interface SummaryData {
  positives: string[];
  improvements: string[];
  returnIntent: 'high' | 'medium' | 'low';
  source: 'openai' | 'fallback';
}

export interface AiSummaryCardProps {
  feedbackId: string;
  isTr: boolean;
  /** Locale query param for AI prompt (TR/EN). */
  locale: 'tr' | 'en';
}

// Session cache: a review summarised once shows its result at once when it
// is opened again (no repeat request). `null` = nothing to show (fallback /
// empty). Errors are not cached. The parent keys this card by feedback id,
// so state below is read from the cache on mount.
const summaryCache = new Map<string, SummaryData | null>();

const INTENT_LABELS = {
  tr: { high: 'Yüksek', medium: 'Orta', low: 'Düşük' },
  en: { high: 'High', medium: 'Medium', low: 'Low' },
};

export function AiSummaryCard({ feedbackId, isTr, locale }: AiSummaryCardProps) {
  const cacheKey = `${feedbackId}:${locale}`;
  const [data, setData] = useState<SummaryData | null>(() => summaryCache.get(cacheKey) ?? null);
  // idle → the owner has not asked yet; done → asked (data or nothing to show).
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done' | 'error'>(() =>
    summaryCache.has(cacheKey) ? 'done' : 'idle',
  );
  // The parent keys this card by feedback id; guard a late answer anyway.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // On request only: the summary is an AI call, so opening a review never
  // spends tokens (same rule as reply drafts).
  const run = () => {
    if (phase === 'loading') return;
    setPhase('loading');
    fetch(`/api/feedback/${feedbackId}/summary?locale=${locale}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SummaryData | null) => {
        if (!aliveRef.current) return;
        if (!d) {
          setPhase('error');
          return;
        }
        const usable = d.source === 'fallback' ? null : d;
        summaryCache.set(cacheKey, usable);
        setData(usable);
        setPhase('done');
      })
      .catch(() => {
        if (aliveRef.current) setPhase('error');
      });
  };

  const hasSignals =
    data !== null && data.positives.length + data.improvements.length + (data.returnIntent ? 1 : 0) > 0;

  if (phase !== 'done' || !data || !hasSignals) {
    const busy = phase === 'loading';
    const note =
      phase === 'error'
        ? isTr
          ? 'Özet çıkarılamadı. Tekrar deneyebilirsin.'
          : 'The summary could not be prepared. You can try again.'
        : phase === 'done'
          ? isTr
            ? 'Bu yorumda özetlenecek bir sinyal bulunamadı.'
            : 'No signal to summarise in this review.'
          : isTr
            ? 'Yorumdaki olumlu ve geliştirilecek noktaları çıkarır.'
            : 'Pulls out what went well and what to improve.';
    return (
      <div className="flex items-center gap-3 rounded-[20px] bg-[#F6F6F6] p-3 sm:p-4">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} strokeWidth={2} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-pn-ink">{isTr ? 'AI özeti' : 'AI summary'}</p>
          <p className="text-[13px] text-[#737373]" role={phase === 'error' ? 'alert' : undefined}>
            {busy ? (isTr ? 'Hazırlanıyor…' : 'Preparing…') : note}
          </p>
        </div>
        {phase !== 'done' && (
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-medium text-pn-ink transition-colors duration-200 hover:bg-[#EDEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink active:scale-[.97] disabled:opacity-60 max-sm:min-h-[44px]"
          >
            {phase === 'error' ? (isTr ? 'Tekrar dene' : 'Try again') : isTr ? 'Özet çıkar' : 'Summarise'}
          </button>
        )}
      </div>
    );
  }

  const { positives, improvements, returnIntent } = data;
  const totalSignals = positives.length + improvements.length + (returnIntent ? 1 : 0);
  if (totalSignals === 0) return null;

  const intentLabel = INTENT_LABELS[isTr ? 'tr' : 'en'][returnIntent];
  const intentBadge =
    returnIntent === 'high'
      ? 'bg-[#E6F7EA] text-[#23863A]'
      : returnIntent === 'low'
        ? 'bg-[#FDECEC] text-[#D92D20]'
        : 'bg-[#F6F6F6] text-[#525252]';

  // Fintora list: a grey panel inside the white detail card, a black
  // sparkle circle in the header and one white row per signal.
  return (
    <section
      className="rounded-[20px] bg-[#F6F6F6] p-3 sm:p-4"
      aria-label={isTr ? 'AI özeti' : 'AI summary'}
    >
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          <Sparkles size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-pn-ink">{isTr ? 'AI özeti' : 'AI summary'}</p>
          <p className="text-[13px] text-[#9A9A9A]">
            {isTr
              ? `${totalSignals} sinyal tespit edildi`
              : `${totalSignals} signals detected`}
          </p>
        </div>
      </header>
      <ul className="m-0 mt-3 list-none space-y-2 p-0">
        {positives.length > 0 && (
          <li className="flex items-start gap-3 rounded-[16px] bg-white p-3">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
            >
              <ThumbsUp size={14} strokeWidth={2} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14px] font-medium text-pn-ink">{isTr ? 'Pozitif' : 'Positive'}</p>
              <p className="mt-0.5 text-[13px] leading-[1.5] text-[#737373]">{positives.join(', ')}</p>
            </div>
          </li>
        )}
        {improvements.length > 0 && (
          <li className="flex items-start gap-3 rounded-[16px] bg-white p-3">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pn-ink text-white"
            >
              <Wrench size={14} strokeWidth={2} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14px] font-medium text-pn-ink">{isTr ? 'İyileştirme' : 'Improvement'}</p>
              <p className="mt-0.5 text-[13px] leading-[1.5] text-[#737373]">{improvements.join(', ')}</p>
            </div>
          </li>
        )}
        <li className="flex items-center gap-3 rounded-[16px] bg-white p-3">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6F6F6] text-pn-ink"
          >
            <Repeat size={14} strokeWidth={2} />
          </span>
          <p className="min-w-0 flex-1 text-[14px] font-medium text-pn-ink">
            {isTr ? 'Tekrar gelme niyeti' : 'Return intent'}
          </p>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${intentBadge}`}>
            {intentLabel}
          </span>
        </li>
      </ul>
    </section>
  );
}

export default AiSummaryCard;
