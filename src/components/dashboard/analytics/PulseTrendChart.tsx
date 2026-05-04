'use client';

import { useState } from 'react';

// Phase 8c+ §38.34 — Analitik PUAN & HACİM TRENDİ tek-chart (Puan/Hacim/
// Sentiment toggle). Tasarım kaynağı: .design-owner-2026/project/
// page-analytics.jsx line 135-200 (14-haftalık görünüm + sağ üst toggle +
// dashed hedef line + son nokta lime tooltip).
//
// Custom inline SVG — recharts kullanmaz, server + client uyumlu (mode
// state için 'use client' gereklidir; toggle interactive).
//
// Mode davranışları:
//   - 'rating': line + lime gradient area + bars (mevcut WeeklyTrendChart §38.25)
//   - 'volume': sadece bars (rating line gizli)
//   - 'sentiment': sentimentPct line + lime gradient area (rating-based heuristic)

type Mode = 'rating' | 'volume' | 'sentiment';

export interface PulseTrendPoint {
  /** Hafta etiketi (örn. "H1"..."H14"). */
  label: string;
  /** Ortalama puan (0-5). 0 = yorum yok (line gap). */
  rating: number;
  /** Yorum sayısı (volume). */
  volume: number;
  /** Pozitif sentiment yüzdesi (rating ≥4 / total). 0-100; volume=0 → 0. */
  sentimentPct: number;
}

export interface PulseTrendChartProps {
  /** 14 hafta seri (en eski → en yeni). */
  weeks: PulseTrendPoint[];
  /** Hedef puan (default 4.0; CLAUDE.md §38.26 Restaurant.targetRating). */
  targetRating?: number;
  /** Default mode. */
  defaultMode?: Mode;
  isTr?: boolean;
}

const VB_W = 800;
const VB_H = 240;
const PAD_X = 40;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

const MODE_LABELS: Record<Mode, { tr: string; en: string }> = {
  rating: { tr: 'Puan', en: 'Rating' },
  volume: { tr: 'Hacim', en: 'Volume' },
  sentiment: { tr: 'Sentiment', en: 'Sentiment' },
};

const MODE_ORDER: Mode[] = ['rating', 'volume', 'sentiment'];

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

export function PulseTrendChart({
  weeks,
  targetRating = 4.0,
  defaultMode = 'rating',
  isTr = true,
}: PulseTrendChartProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  if (weeks.length < 2) {
    return (
      <div className="bz-card p-5 sm:p-6 text-center text-[13px] text-[#737373]">
        {isTr
          ? 'Trend için yeterli haftalık veri yok (en az 2 hafta gerekli).'
          : 'Not enough weekly data for trend (min 2 weeks needed).'}
      </div>
    );
  }

  const stepX = (VB_W - PAD_X * 2) / Math.max(1, weeks.length - 1);

  // Mode-aware Y range
  let yMin: number;
  let yMax: number;
  if (mode === 'rating') {
    const r = computeRatingYRange(weeks, targetRating);
    yMin = r.min;
    yMax = r.max;
  } else if (mode === 'volume') {
    const maxV = Math.max(...weeks.map((w) => w.volume), 1);
    yMin = 0;
    yMax = maxV * 1.15;
  } else {
    yMin = 0;
    yMax = 100;
  }

  function yPos(value: number): number {
    if (yMax === yMin) return PAD_TOP + (VB_H - PAD_TOP - PAD_BOTTOM) / 2;
    const ratio = (value - yMin) / (yMax - yMin);
    return VB_H - PAD_BOTTOM - ratio * (VB_H - PAD_TOP - PAD_BOTTOM);
  }

  // Series points
  const points = weeks.map((w, i) => {
    const x = PAD_X + i * stepX;
    const series =
      mode === 'rating' ? w.rating : mode === 'volume' ? w.volume : w.sentimentPct;
    const valid = mode === 'volume' ? true : series > 0;
    return { x, y: yPos(series), valid, label: w.label, raw: series, volume: w.volume };
  });

  const validPoints = points.filter((p) => p.valid);
  const linePath = validPoints.length > 0
    ? validPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ')
    : '';
  const areaPath =
    validPoints.length > 0
      ? `${linePath} L ${validPoints[validPoints.length - 1].x} ${VB_H - PAD_BOTTOM} L ${validPoints[0].x} ${VB_H - PAD_BOTTOM} Z`
      : '';

  const targetY = mode === 'rating' ? yPos(targetRating) : null;
  const lastValid = validPoints[validPoints.length - 1];
  const lastRaw = lastValid ? weeks[points.findIndex((p) => p === lastValid)] : null;
  const lastValueLabel =
    lastValid && lastRaw
      ? mode === 'rating'
        ? lastRaw.rating.toFixed(2)
        : mode === 'volume'
          ? String(lastRaw.volume)
          : `${Math.round(lastRaw.sentimentPct)}%`
      : null;

  // Header subtitle: rating mode → "Hedef X.X · Y.Y üzerinde/altında"
  const lastRating = weeks.filter((w) => w.rating > 0).pop()?.rating ?? null;
  const headerHint =
    mode === 'rating' && lastRating !== null
      ? (() => {
          const diff = lastRating - targetRating;
          const tag = diff >= 0
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
    <section className="bz-card p-5 sm:p-6">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3 className="pulse-eyebrow text-[10.5px] text-[#737373]">
            {isTr ? 'PUAN & HACİM TRENDİ' : 'RATING & VOLUME TREND'}
          </h3>
          <div className="bz-h-tight mt-1 text-[16px] sm:text-[18px]">
            {isTr ? '14 haftalık görünüm' : '14-week view'}
          </div>
          {headerHint && (
            <div className="bz-mono mt-1 text-[11px] text-[#737373] tabular-nums">
              {headerHint}
            </div>
          )}
        </div>
        {/* Mode toggle */}
        <div
          role="tablist"
          aria-label={isTr ? 'Trend modu' : 'Trend mode'}
          className="flex gap-1.5"
        >
          {MODE_ORDER.map((m) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(m)}
                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-white border border-[#EDEDED] text-[#525252] hover:text-[#0A0A0A] hover:border-[#A3A3A3]'
                }`}
              >
                {isTr ? MODE_LABELS[m].tr : MODE_LABELS[m].en}
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
              ? `14 haftalık ${MODE_LABELS[mode].tr.toLowerCase()} trendi`
              : `14-week ${MODE_LABELS[mode].en.toLowerCase()} trend`
          }
        >
          <defs>
            <linearGradient id="pulseTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Volume bars — rating ve sentiment mode'da background, volume mode'da primary */}
          {weeks.map((w, i) => {
            const x = PAD_X + i * stepX;
            const barW = Math.max(8, stepX * 0.5);
            const barX = x - barW / 2;
            const barH =
              mode === 'volume'
                ? VB_H - PAD_BOTTOM - yPos(w.volume)
                : (w.volume / Math.max(...weeks.map((wk) => wk.volume), 1)) *
                  (VB_H - PAD_TOP - PAD_BOTTOM) *
                  0.4;
            const barY = VB_H - PAD_BOTTOM - barH;
            return (
              <rect
                key={i}
                x={barX}
                y={barY}
                width={barW}
                height={barH}
                fill={mode === 'volume' ? '#A8D62E' : '#EDEDED'}
                opacity={mode === 'volume' ? 1 : 0.6}
                rx="2"
              />
            );
          })}

          {/* Area (rating + sentiment modes) */}
          {mode !== 'volume' && areaPath && (
            <path d={areaPath} fill="url(#pulseTrendArea)" />
          )}

          {/* Line (rating + sentiment) */}
          {mode !== 'volume' && linePath && (
            <path
              d={linePath}
              stroke="#0A0A0A"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Target dashed line (rating mode only) */}
          {mode === 'rating' && targetY !== null && (
            <>
              <line
                x1={PAD_X}
                x2={VB_W - PAD_X}
                y1={targetY}
                y2={targetY}
                stroke="#A3A3A3"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x={VB_W - PAD_X + 4}
                y={targetY + 4}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fill="#737373"
              >
                {isTr ? 'HEDEF' : 'TARGET'} {targetRating.toFixed(1)}
              </text>
            </>
          )}

          {/* Last point dot + tooltip */}
          {lastValid && lastValueLabel && (
            <g>
              <circle cx={lastValid.x} cy={lastValid.y} r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
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

          {/* X axis labels (every other week to avoid crowding) */}
          {weeks.map((w, i) => {
            if (i % 2 !== 0 && i !== weeks.length - 1) return null;
            const x = PAD_X + i * stepX;
            return (
              <text
                key={i}
                x={x}
                y={VB_H - 6}
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
