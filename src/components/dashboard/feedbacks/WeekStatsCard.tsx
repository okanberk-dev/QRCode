import { Star } from 'lucide-react';

// Phase 8c+ §38.33 — Yorumlar filter rail altında "BU HAFTA" stat card.
// Tasarım kaynağı: .design-owner-2026/project/page-reviews.jsx line 83-92.
// Pure presentational — owner-scoped weekStats server-side compute edilir.

export interface WeekStatsCardProps {
  /** Son 7 gün ortalama puan (0-5). 0 → "—" render. */
  avgRating: number;
  /** Önceki 7 gün ile fark. null → render gizli. */
  delta?: number | null;
  /** Son 7 gün toplam yorum sayısı. */
  totalCount: number;
  isTr?: boolean;
}

export function WeekStatsCard({
  avgRating,
  delta = null,
  totalCount,
  isTr = true,
}: WeekStatsCardProps) {
  const ratingDisplay = avgRating > 0 ? avgRating.toFixed(2) : '—';
  const ratingRound = avgRating > 0 ? Math.round(avgRating) : 0;
  const deltaText =
    delta === null || Math.abs(delta) < 0.05
      ? null
      : `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(2)}`;
  const deltaTone = delta === null ? null : delta > 0 ? 'up' : 'down';

  return (
    <section
      className="bz-card-soft p-4 flex flex-col gap-2"
      aria-label={isTr ? 'Bu hafta özet' : 'This week summary'}
    >
      <h3 className="pulse-eyebrow text-[10px] text-[#737373]">
        {isTr ? 'BU HAFTA' : 'THIS WEEK'}
      </h3>
      <div className="flex items-baseline gap-2">
        <span
          className="bz-mono tabular-nums"
          style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: '#0A0A0A' }}
        >
          {ratingDisplay}
        </span>
        <span className="flex gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={11}
              className={s <= ratingRound ? 'text-[#C6F24E]' : 'text-[#EDEDED]'}
              fill={s <= ratingRound ? '#C6F24E' : 'transparent'}
              strokeWidth={1.5}
            />
          ))}
        </span>
      </div>
      <div className="bz-mono text-[11px] tabular-nums text-[#737373] flex items-center gap-1.5">
        {deltaText && (
          <span
            className={`font-semibold ${
              deltaTone === 'up' ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}
          >
            {deltaText}
          </span>
        )}
        {deltaText && <span>·</span>}
        <span>
          {totalCount}{' '}
          {isTr ? 'yorum' : totalCount === 1 ? 'review' : 'reviews'}
        </span>
      </div>
    </section>
  );
}

export default WeekStatsCard;
