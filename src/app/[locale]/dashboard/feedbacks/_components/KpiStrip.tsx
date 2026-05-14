'use client';

import { useEffect, useState } from 'react';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';

// §38.53 — Yorumlar sayfası KPI 4-card strip. Tasarım kaynağı:
// .design-owner-2026/page-feedbacks.jsx PageHeader altı 4-card grid:
// Bu hafta (count + delta) / Ort puan (delta) / Yanıt süresi (saat) / Yanıt oranı (%).
//
// Backend reuse: /api/feedback/stats?days=all (kpiStrip object §38.53).
// Workspace owner-scoped IDOR. WeekStatsCard rail altından kaldırıldı (KPI
// strip ile redundant).

interface KpiStripData {
  thisWeekCount: number;
  thisWeekDelta: number;
  avgRating: number;
  avgRatingDelta: number | null;
  avgResponseTimeMs: number | null;
  replyRatePct: number;
  repliedCount: number;
  totalCount: number;
}

export interface KpiStripProps {
  isTr: boolean;
  /** Filter scope — analytics page'in dateFilter ile uyumlu. */
  filters?: { restaurantId?: string; branch?: string; platform?: string };
}

function formatResponseTime(ms: number | null, isTr: boolean): string {
  if (ms === null) return '—';
  const hours = ms / 3600000;
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}${isTr ? 'dk' : 'm'}`;
  }
  return `${hours.toFixed(1)}${isTr ? 'sa' : 'h'}`;
}

export function KpiStrip({ isTr, filters }: KpiStripProps) {
  const [data, setData] = useState<KpiStripData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ days: 'all' });
    if (filters?.restaurantId) params.set('restaurantId', filters.restaurantId);
    if (filters?.branch) params.set('branch', filters.branch);
    if (filters?.platform) params.set('platform', filters.platform);

    fetch(`/api/feedback/stats?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.kpiStrip) return;
        setData({
          thisWeekCount: d.kpiStrip.thisWeekCount ?? 0,
          thisWeekDelta: d.kpiStrip.thisWeekDelta ?? 0,
          avgRating: d.avgRating ?? 0,
          avgRatingDelta: d.kpiStrip.avgRatingDelta ?? null,
          avgResponseTimeMs: d.kpiStrip.avgResponseTimeMs ?? null,
          replyRatePct: d.kpiStrip.replyRatePct ?? 0,
          repliedCount: d.kpiStrip.repliedCount ?? 0,
          totalCount: d.totalCount ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters?.restaurantId, filters?.branch, filters?.platform]);

  // §40.10 (clean slate) — skeleton render kaldırıldı. Data yüklenene kadar
  // hiçbir şey gösterme; flicker yerine net bir delay.
  if (loading || !data) return null;

  const ratingDeltaSign = data.avgRatingDelta !== null && data.avgRatingDelta >= 0 ? '+' : '';
  const ratingDeltaUp = data.avgRatingDelta !== null && data.avgRatingDelta >= 0;
  const weekDeltaUp = data.thisWeekDelta >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Bu hafta */}
      <article className="bz-card p-4 flex flex-col gap-2" aria-label={isTr ? 'Bu hafta' : 'This week'}>
        <div className="pulse-eyebrow text-[10px] text-[#737373]">
          {isTr ? 'BU HAFTA' : 'THIS WEEK'}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="bz-mono tabular-nums"
            style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#0A0A0A', letterSpacing: '-0.02em' }}
          >
            {data.thisWeekCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          </span>
          {data.thisWeekDelta !== 0 && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
                weekDeltaUp ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              {weekDeltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {weekDeltaUp ? '+' : ''}
              {data.thisWeekDelta}%
            </span>
          )}
        </div>
        <div className="bz-mono text-[10.5px] text-[#737373] tabular-nums">
          {isTr ? 'önceki haftaya göre' : 'vs prev week'}
        </div>
      </article>

      {/* Ortalama puan */}
      <article className="bz-card p-4 flex flex-col gap-2" aria-label={isTr ? 'Ortalama puan' : 'Average rating'}>
        <div className="pulse-eyebrow text-[10px] text-[#737373]">
          {isTr ? 'ORTALAMA PUAN' : 'AVG RATING'}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span
              className="bz-mono tabular-nums"
              style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              {data.avgRating > 0 ? data.avgRating.toFixed(1) : '—'}
            </span>
            <Star size={12} fill="#C6F24E" stroke="#0A0A0A" strokeWidth={1.5} />
          </div>
          {data.avgRatingDelta !== null && data.avgRatingDelta !== 0 && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
                ratingDeltaUp ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              {ratingDeltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {ratingDeltaSign}
              {data.avgRatingDelta.toFixed(2)}
            </span>
          )}
        </div>
        <div className="bz-mono text-[10.5px] text-[#737373] tabular-nums">
          {isTr ? `${data.totalCount} yorum` : `${data.totalCount} reviews`}
        </div>
      </article>

      {/* Yanıt süresi */}
      <article className="bz-card p-4 flex flex-col gap-2" aria-label={isTr ? 'Yanıt süresi' : 'Reply time'}>
        <div className="pulse-eyebrow text-[10px] text-[#737373]">
          {isTr ? 'YANIT SÜRESİ' : 'REPLY TIME'}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="bz-mono tabular-nums"
            style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#0A0A0A', letterSpacing: '-0.02em' }}
          >
            {formatResponseTime(data.avgResponseTimeMs, isTr)}
          </span>
        </div>
        <div className="bz-mono text-[10.5px] text-[#737373] tabular-nums">
          {data.avgResponseTimeMs !== null
            ? isTr
              ? 'son 90 gün ortalaması'
              : 'last 90 days avg'
            : isTr
              ? 'henüz yanıt yok'
              : 'no replies yet'}
        </div>
      </article>

      {/* Yanıt oranı */}
      <article className="bz-card p-4 flex flex-col gap-2" aria-label={isTr ? 'Yanıt oranı' : 'Reply rate'}>
        <div className="pulse-eyebrow text-[10px] text-[#737373]">
          {isTr ? 'YANIT ORANI' : 'REPLY RATE'}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="bz-mono tabular-nums"
            style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#0A0A0A', letterSpacing: '-0.02em' }}
          >
            %{data.replyRatePct}
          </span>
        </div>
        <div className="bz-mono text-[10.5px] text-[#737373] tabular-nums">
          {data.totalCount > 0
            ? isTr
              ? `${data.repliedCount} / ${data.totalCount} yanıtlandı`
              : `${data.repliedCount} / ${data.totalCount} replied`
            : isTr
              ? 'henüz yorum yok'
              : 'no reviews yet'}
        </div>
      </article>
    </div>
  );
}

export default KpiStrip;
