'use client';

// §38.56 — PUAN & HACİM TRENDİ — Puan/Hacim/Sentiment 3-mode toggle restore
// (tasarım a/page-analytics.jsx line 102-105 birebir). §38.34'te vardı,
// §38.50'de simultaneous 3-series'a dönüştürülmüştü; yeni handoff bundle
// toggle istiyor.
//
// Mode davranışı:
//   - 'rating' (default): volume bars + rating line (lime) + target dashed
//   - 'volume': öne çıkan volume bars (lime fill) + rating line muted
//   - 'sentiment': sentiment % line (lime) + target dashed (50% line)
//
// Custom inline SVG — recharts kullanmaz. Client component (toggle state).

import { useState } from 'react';

export interface PulseTrendPoint {
  /** Etiket (örn. "H1"..."H14" veya "04 NIS"). */
  label: string;
  /** Ortalama puan (0-5). 0 = yorum yok (line gap). */
  rating: number;
  /** Yorum sayısı (volume). */
  volume: number;
  /**
   * Pozitif sentiment yüzdesi (rating ≥4 / total). 0-100; volume=0 → 0.
   * §38.50 sonrası simultaneous mode'da render edilmiyor; backwards-compat
   * için type'da kalıyor (caller hâlâ pas geçiyor — silmek breaking).
   */
  sentimentPct?: number;
}

export interface PulseTrendChartProps {
  /** N hafta seri (en eski → en yeni). */
  weeks: PulseTrendPoint[];
  /** Hedef puan (default 4.0; CLAUDE.md §38.26 Restaurant.targetRating). */
  targetRating?: number;
  isTr?: boolean;
}

const VB_W = 800;
const VB_H = 240;
const PAD_X = 40;
const PAD_TOP = 12;
const PAD_BOTTOM = 30;
const VOL_BAND_H = 80; // alt 80px volume bars için ayrılır
const LINE_BAND_H = VB_H - PAD_TOP - PAD_BOTTOM - VOL_BAND_H;

function computeRatingYRange(
  weeks: PulseTrendPoint[],
  target: number,
): { min: number; max: number } {
  const ratings = weeks.filter((w) => w.rating > 0).map((w) => w.rating);
  if (ratings.length === 0) return { min: 4.0, max: 5.0 };
  const minR = Math.min(...ratings, target);
  const maxR = Math.max(...ratings, target);
  return { min: Math.max(0, minR - 0.2), max: Math.min(5, maxR + 0.2) };
}

type TrendMode = 'rating' | 'volume' | 'sentiment';

export function PulseTrendChart({
  weeks,
  targetRating = 4.0,
  isTr = true,
}: PulseTrendChartProps) {
  // §38.56 — Mode toggle state (tasarım birebir Puan/Hacim/Sentiment 3-tab).
  const [mode, setMode] = useState<TrendMode>('rating');

  if (weeks.length < 2) {
    return (
      <section
        className="bz-card p-5 sm:p-6"
        aria-label={isTr ? 'Puan ve hacim trendi' : 'Rating and volume trend'}
      >
        <header className="mb-3">
          <h3 className="pulse-eyebrow text-[10.5px] text-[#737373]">
            {isTr ? 'PUAN VE HACİM TRENDİ' : 'RATING & VOLUME TREND'}
          </h3>
        </header>
        <p className="text-center text-[13px] text-[#737373] py-8">
          {isTr
            ? 'Trend için yeterli haftalık veri yok (en az 2 hafta gerekli).'
            : 'Not enough weekly data for trend (min 2 weeks needed).'}
        </p>
      </section>
    );
  }

  const stepX = (VB_W - PAD_X * 2) / Math.max(1, weeks.length - 1);
  const ratingRange = computeRatingYRange(weeks, targetRating);
  const maxVolume = Math.max(...weeks.map((w) => w.volume), 1);

  // Rating Y-position (üst band)
  function ratingY(value: number): number {
    if (ratingRange.max === ratingRange.min) {
      return PAD_TOP + LINE_BAND_H / 2;
    }
    const ratio = (value - ratingRange.min) / (ratingRange.max - ratingRange.min);
    return PAD_TOP + LINE_BAND_H * (1 - ratio);
  }

  // Volume bar Y-position (alt band)
  const volBandTop = PAD_TOP + LINE_BAND_H;
  function volumeY(value: number): number {
    const ratio = value / maxVolume;
    return volBandTop + VOL_BAND_H - ratio * VOL_BAND_H;
  }

  // Series points
  const points = weeks.map((w, i) => ({
    x: PAD_X + i * stepX,
    y: ratingY(w.rating),
    valid: w.rating > 0,
    label: w.label,
    rating: w.rating,
    volume: w.volume,
  }));

  const validPoints = points.filter((p) => p.valid);
  const linePath =
    validPoints.length > 0
      ? validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : '';
  const areaPath =
    validPoints.length > 0
      ? `${linePath} L ${validPoints[validPoints.length - 1].x} ${volBandTop} L ${validPoints[0].x} ${volBandTop} Z`
      : '';

  const targetY = ratingY(targetRating);
  const lastValid = validPoints[validPoints.length - 1];
  const lastValueLabel = lastValid ? lastValid.rating.toFixed(2) : null;

  // Header subtitle: "Hedef X.X · şu an +/-Y.Y"
  const lastRating = lastValid?.rating ?? null;
  const headerHint =
    lastRating !== null
      ? (() => {
          const diff = lastRating - targetRating;
          const tag =
            diff >= 0
              ? isTr
                ? `+${diff.toFixed(2)} üzerinde`
                : `+${diff.toFixed(2)} above`
              : isTr
                ? `${diff.toFixed(2)} altında`
                : `${diff.toFixed(2)} below`;
          return isTr
            ? `Hedef puan ${targetRating.toFixed(1)} · şu an ${tag}`
            : `Target ${targetRating.toFixed(1)} · currently ${tag}`;
        })()
      : null;

  return (
    <section
      className="bz-card p-5 sm:p-6"
      aria-label={isTr ? 'Puan ve hacim trendi' : 'Rating and volume trend'}
    >
      <header className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="pulse-eyebrow text-[10.5px] text-[#737373]">
            {isTr ? 'PUAN & HACİM TRENDİ' : 'RATING & VOLUME TREND'}
          </h3>
          <div className="bz-h-tight mt-1 text-[16px] sm:text-[18px]">
            {isTr ? `${weeks.length} haftalık görünüm` : `${weeks.length}-week view`}
          </div>
          {headerHint && (
            <div className="bz-mono mt-1 text-[11px] text-[#737373] tabular-nums">
              {headerHint}
            </div>
          )}
        </div>
        {/* §38.56 — Mode toggle (tasarım a/page-analytics.jsx line 102-105
            birebir 3-tab: Puan / Hacim / Sentiment). Default rating aktif. */}
        <div
          role="tablist"
          aria-label={isTr ? 'Trend modu' : 'Trend mode'}
          className="inline-flex items-center gap-0.5 rounded-full border border-[#EDEDED] bg-[#FAFAFA] p-0.5"
        >
          {(
            [
              { id: 'rating', tr: 'Puan', en: 'Rating' },
              { id: 'volume', tr: 'Hacim', en: 'Volume' },
              { id: 'sentiment', tr: 'Sentiment', en: 'Sentiment' },
            ] as const
          ).map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m.id)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                  active
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-[#525252] hover:bg-white'
                }`}
              >
                {isTr ? m.tr : m.en}
              </button>
            );
          })}
        </div>
      </header>

      <div className="overflow-x-auto no-scrollbar -mx-2 sm:mx-0">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="block"
          style={{ width: '100%', minWidth: 600, height: 240 }}
          role="img"
          aria-label={
            isTr
              ? `${weeks.length} haftalık puan ve hacim trendi`
              : `${weeks.length}-week rating and volume trend`
          }
        >
          <defs>
            <linearGradient id="pulseTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Gridlines (yatay, hafif) */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={PAD_X}
              x2={VB_W - PAD_X}
              y1={PAD_TOP + LINE_BAND_H * ratio}
              y2={PAD_TOP + LINE_BAND_H * ratio}
              stroke="#EDEDED"
              strokeWidth="1"
            />
          ))}

          {/* Volume bars — mode'a göre öne çıkar (lime fill) veya soluk (gri).
              §38.56: 'volume' mode'da bars ana focus + lime + büyük opacity. */}
          {weeks.map((w, i) => {
            const x = PAD_X + i * stepX;
            const barW = Math.max(8, stepX * 0.5);
            const barX = x - barW / 2;
            const barY = volumeY(w.volume);
            const barH = volBandTop + VOL_BAND_H - barY;
            const barFill = mode === 'volume' ? '#C6F24E' : '#E5E5E5';
            const barOpacity = mode === 'volume' ? 1 : mode === 'rating' ? 0.7 : 0.35;
            return (
              <rect
                key={i}
                x={barX}
                y={barY}
                width={barW}
                height={Math.max(0, barH)}
                fill={barFill}
                opacity={barOpacity}
                rx="1.5"
              />
            );
          })}

          {/* Rating area (lime gradient) — sadece rating mode'da */}
          {mode === 'rating' && areaPath && (
            <path d={areaPath} fill="url(#pulseTrendArea)" opacity="0.35" />
          )}

          {/* Target dashed line — rating + sentiment mode'da görünür */}
          {mode !== 'volume' && (
            <>
              <line
                x1={PAD_X}
                x2={VB_W - PAD_X}
                y1={mode === 'sentiment' ? PAD_TOP + LINE_BAND_H * 0.5 : targetY}
                y2={mode === 'sentiment' ? PAD_TOP + LINE_BAND_H * 0.5 : targetY}
                stroke="#A3A3A3"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={VB_W - PAD_X + 4}
                y={(mode === 'sentiment' ? PAD_TOP + LINE_BAND_H * 0.5 : targetY) + 4}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fill="#737373"
              >
                {mode === 'sentiment' ? '50%' : isTr ? 'HEDEF' : 'TARGET'}
              </text>
            </>
          )}

          {/* Rating line — rating mode'da (volume mode'da gizli, sentiment'ta yerini sentiment line alır) */}
          {mode === 'rating' && linePath && (
            <path
              d={linePath}
              stroke="#A8D62E"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Sentiment line — 'sentiment' mode'da Y axis 0-100% (sentimentPct) */}
          {mode === 'sentiment' && (() => {
            function sentY(pct: number): number {
              const ratio = Math.min(100, Math.max(0, pct)) / 100;
              return PAD_TOP + LINE_BAND_H * (1 - ratio);
            }
            const sentPoints = weeks.map((w, i) => ({
              x: PAD_X + i * stepX,
              y: sentY(w.sentimentPct ?? 0),
              valid: w.volume > 0,
              pct: w.sentimentPct ?? 0,
            }));
            const sentValid = sentPoints.filter((p) => p.valid);
            if (sentValid.length < 2) return null;
            const sentPath = sentValid
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
              .join(' ');
            return (
              <path
                d={sentPath}
                stroke="#A8D62E"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })()}

          {/* Highlight points (every 5th, tasarımda) */}
          {points.map((p, i) =>
            p.valid && i % 5 === 0 ? (
              <circle
                key={`hp-${i}`}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#FFFFFF"
                stroke="#A8D62E"
                strokeWidth="2"
              />
            ) : null,
          )}

          {/* Last point lime tooltip */}
          {lastValid && lastValueLabel && (
            <g>
              <circle
                cx={lastValid.x}
                cy={lastValid.y}
                r="5"
                fill="#C6F24E"
                stroke="#0A0A0A"
                strokeWidth="2"
              />
              <rect
                x={lastValid.x - 28}
                y={lastValid.y - 26}
                width="56"
                height="20"
                rx="6"
                fill="#0A0A0A"
              />
              <text
                x={lastValid.x}
                y={lastValid.y - 12}
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
                fill="#FFFFFF"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {lastValueLabel}
              </text>
            </g>
          )}

          {/* X axis labels (her 2 step'te, ya da son label) */}
          {weeks.map((w, i) => {
            if (i % 2 !== 0 && i !== weeks.length - 1) return null;
            const x = PAD_X + i * stepX;
            return (
              <text
                key={i}
                x={x}
                y={VB_H - 8}
                fontSize="10"
                fill="#A3A3A3"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {w.label}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export default PulseTrendChart;
