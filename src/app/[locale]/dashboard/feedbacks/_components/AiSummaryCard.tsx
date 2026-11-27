'use client';

import { useEffect, useState } from 'react';
import { Loader2, Repeat, Sparkles, ThumbsUp, Wrench } from 'lucide-react';

// §38.53 — AI ÖZET card (3-sinyal: Pozitif / İyileştirme / Tekrar gelme niyeti).
// Tasarım kaynağı: .design-owner-2026/page-feedbacks.jsx FeedbackDetail body
// "AI ÖZET" card (n-50 bg + n-150 border + Zap icon + 3-bullet list).
//
// Backend: /api/feedback/[id]/summary POST (CLAUDE.md §38.53). 24h cache,
// rate-limited 30/dk/owner. Empty state (positives + improvements her ikisi
// boş + intent='medium' default) → kart gizli (graceful).

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

// Session cache: a review opened again shows its result at once (no loader,
// no repeat request). `null` = no summary to show (fallback / empty). Errors
// are not cached, so the next open retries. The parent keys this card by
// feedback id, so state below is read from the cache on mount.
const summaryCache = new Map<string, SummaryData | null>();

const INTENT_LABELS = {
  tr: { high: 'Yüksek', medium: 'Orta', low: 'Düşük' },
  en: { high: 'High', medium: 'Medium', low: 'Low' },
};

export function AiSummaryCard({ feedbackId, isTr, locale }: AiSummaryCardProps) {
  const cacheKey = `${feedbackId}:${locale}`;
  const [data, setData] = useState<SummaryData | null>(() => summaryCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(() => !summaryCache.has(cacheKey));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (summaryCache.has(cacheKey)) {
      setData(summaryCache.get(cacheKey) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setData(null);
    setError(false);
    setLoading(true);

    fetch(`/api/feedback/${feedbackId}/summary?locale=${locale}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SummaryData | null) => {
        if (!d) {
          if (!cancelled) setError(true);
          return;
        }
        summaryCache.set(cacheKey, d.source === 'fallback' ? null : d);
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, feedbackId, locale]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-[20px] bg-[#F6F6F6] p-3 sm:p-4">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          <Loader2 size={16} className="animate-spin" />
        </span>
        <span className="text-[13px] text-[#737373]">
          {isTr ? 'AI özet hazırlanıyor…' : 'Preparing AI summary…'}
        </span>
      </div>
    );
  }

  if (error || !data || data.source === 'fallback') {
    // Fallback durumda kart gizli (yorum boş, AI key yok, parse fail vb.)
    return null;
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
