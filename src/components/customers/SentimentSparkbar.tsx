// Phase 8c++ §38.36 — Sentiment sparkbar (0-100 score progress bar + number).
// Tasarım kaynağı: .design-owner-2026/project/page-customers.jsx Sparkbar
// (line 25-35) — 60px × 5px progress + 24px number. Owner customers tablosu
// "Sentiment" sütununda mevcut SentimentBadge dot+label yerine.
//
// Pure presentational, server + client'tan import edilebilir ('use client' yok).
// Score derivation caller-side (avgRating × 20). Tone:
//   - ≥70 lime-deep (positive)
//   - 50-69 graphite-mute (neutral)
//   - <50 danger (negative)
//
// CLAUDE.md §7 — yeni dedicated component (3+ callsite olunca SentimentBadge
// variant 'sparkbar'a evrilir; şu an 1 yer kullanım — owner customers table).

export interface SentimentSparkbarProps {
  /** 0-100 score. Caller compute (örn. avgRating × 20, clamped). */
  score: number;
}

export function SentimentSparkbar({ score }: SentimentSparkbarProps) {
  const v = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    v >= 70 ? '#A8D62E' /* lime-deep */
    : v >= 50 ? '#A3A3A3' /* n-mute */
    : '#DC2626' /* danger */;

  return (
    <div
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`Sentiment skoru ${v}/100`}
    >
      <div
        className="h-[5px] w-[60px] rounded-[3px] overflow-hidden bg-[#F5F5F5] shrink-0"
      >
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${v}%`, backgroundColor: tone }}
        />
      </div>
      <span className="bz-mono tabular-nums text-[11px] text-[#525252] w-6 text-right">
        {v}
      </span>
    </div>
  );
}

export default SentimentSparkbar;
