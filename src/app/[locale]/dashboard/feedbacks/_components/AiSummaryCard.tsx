'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

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
      <div className="rounded-[10px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
        <div className="flex items-center gap-2 text-[12px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? 'AI özet hazırlanıyor…' : 'Preparing AI summary…'}
        </div>
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
  const intentColor =
    returnIntent === 'high' ? '#16A34A' : returnIntent === 'low' ? '#DC2626' : '#737373';

  return (
    <section
      className="rounded-[10px] border border-[#EDEDED] bg-[#FAFAFA] p-4"
      aria-label={isTr ? 'AI özeti' : 'AI summary'}
    >
      <header className="mb-2 flex items-center gap-2">
        <Sparkles size={13} className="text-[#A8D62E]" strokeWidth={2.2} />
        <span className="text-[13px] font-semibold text-[#0A0A0A]">
          {isTr
            ? `${totalSignals} sinyal tespit edildi`
            : `${totalSignals} signals detected`}
        </span>
      </header>
      <ul className="m-0 list-none p-0 space-y-1.5 text-[12.5px] leading-[1.55] text-[#525252]">
        {positives.length > 0 && (
          <li className="flex gap-2">
            <span className="font-semibold text-[#16A34A] shrink-0">
              {isTr ? 'Pozitif:' : 'Positive:'}
            </span>
            <span>{positives.join(', ')}</span>
          </li>
        )}
        {improvements.length > 0 && (
          <li className="flex gap-2">
            <span className="font-semibold text-[#D97706] shrink-0">
              {isTr ? 'İyileştirme:' : 'Improvement:'}
            </span>
            <span>{improvements.join(', ')}</span>
          </li>
        )}
        <li className="flex gap-2">
          <span className="font-semibold text-[#525252] shrink-0">
            {isTr ? 'Tekrar gelme niyeti:' : 'Return intent:'}
          </span>
          <span className="font-semibold" style={{ color: intentColor }}>
            {intentLabel}
          </span>
        </li>
      </ul>
    </section>
  );
}

export default AiSummaryCard;
