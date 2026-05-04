// Phase 8c+ §38.25 — Analytics tasarım drift'i kapatma (.design-owner-2026/
// page-analytics.jsx PUAN & HACİM TRENDİ paterni). 14-haftalık trend chart:
// volume bars (gri) + rating line (lime area + graphite stroke) + hedef line
// dashed + son point lime tooltip.
//
// Custom inline SVG — recharts dependency'si yok. Pure presentational, server
// + client component'lerin ikisinden de import edilebilir ('use client' yok).
// Mobile responsive: parent overflow-x-auto + min-width 600 fallback.

interface WeeklyTrendPoint {
  /** Hafta etiketi (örn. "H1", "H14") */
  label: string;
  /** Ortalama puan (0-5). 0 = yorum yok (line atlama). */
  rating: number;
  /** Yorum sayısı (volume bar). */
  volume: number;
}

export interface WeeklyTrendChartProps {
  /** 14 hafta seri (en eski → en yeni). Boş hafta'lar rating: 0 + volume: 0. */
  weeks: WeeklyTrendPoint[];
  /** Hedef puan (industry default 4.0). Render'da dashed line. */
  targetRating?: number;
  isTr?: boolean;
}

const VB_W = 800;
const VB_H = 240;
const PAD_X = 40;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

// Y axis: 4.0–4.8 range default; data dışında ise auto-scale.
function computeYRange(weeks: WeeklyTrendPoint[], target: number): { min: number; max: number } {
  const ratings = weeks.filter((w) => w.rating > 0).map((w) => w.rating);
  if (ratings.length === 0) return { min: target - 0.4, max: target + 0.4 };
  const dataMin = Math.min(...ratings, target);
  const dataMax = Math.max(...ratings, target);
  // 0.2 buffer üst + alt
  const min = Math.max(0, Math.floor((dataMin - 0.2) * 10) / 10);
  const max = Math.min(5, Math.ceil((dataMax + 0.2) * 10) / 10);
  return { min, max };
}

function ratingToY(rating: number, yMin: number, yMax: number): number {
  const range = yMax - yMin || 1;
  const innerH = VB_H - PAD_TOP - PAD_BOTTOM;
  return PAD_TOP + innerH - ((rating - yMin) / range) * innerH;
}

export function WeeklyTrendChart({ weeks, targetRating = 4.0, isTr = true }: WeeklyTrendChartProps) {
  const totalVolume = weeks.reduce((sum, w) => sum + w.volume, 0);
  const totalReviewedWeeks = weeks.filter((w) => w.rating > 0).length;

  if (totalVolume === 0 || totalReviewedWeeks < 2) {
    return (
      <div>
        <header className="mb-3">
          <span className="pulse-eyebrow">{isTr ? 'PUAN & HACİM TRENDİ' : 'RATING & VOLUME TREND'}</span>
          <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
            {isTr ? '14 haftalık görünüm' : '14-week view'}
          </div>
        </header>
        <p className="text-[12px] text-[#737373]">
          {isTr
            ? 'Trend için yeterli haftalık veri yok (≥2 hafta yorum gerekli).'
            : 'Not enough weekly data for trend (≥2 weeks with reviews).'}
        </p>
      </div>
    );
  }

  const { min: yMin, max: yMax } = computeYRange(weeks, targetRating);
  const stepX = (VB_W - PAD_X * 2) / (weeks.length - 1 || 1);
  const maxVolume = Math.max(...weeks.map((w) => w.volume), 1);

  // Line path (sadece rating > 0 olan hafta'lar; ara boşluklar atlanır)
  const linePoints: Array<{ x: number; y: number; rating: number; idx: number }> = [];
  weeks.forEach((w, i) => {
    if (w.rating > 0) {
      linePoints.push({
        x: PAD_X + i * stepX,
        y: ratingToY(w.rating, yMin, yMax),
        rating: w.rating,
        idx: i,
      });
    }
  });

  const linePath = linePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath = linePoints.length >= 2
    ? `${linePath} L ${linePoints[linePoints.length - 1].x} ${VB_H - PAD_BOTTOM} L ${linePoints[0].x} ${VB_H - PAD_BOTTOM} Z`
    : '';

  const targetY = ratingToY(targetRating, yMin, yMax);
  const lastPoint = linePoints[linePoints.length - 1];

  // Y-axis tick labels (4 satır)
  const yTickValues = [yMax, yMin + (yMax - yMin) * 0.66, yMin + (yMax - yMin) * 0.33, yMin];

  // Latest week vs target delta
  const latestRating = lastPoint?.rating ?? 0;
  const deltaToTarget = latestRating - targetRating;
  const deltaText = deltaToTarget >= 0 ? `+${deltaToTarget.toFixed(2)}` : deltaToTarget.toFixed(2);
  const deltaColor = deltaToTarget >= 0 ? '#16A34A' : '#DC2626';

  return (
    <div>
      <header className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span className="pulse-eyebrow">{isTr ? 'PUAN & HACİM TRENDİ' : 'RATING & VOLUME TREND'}</span>
          <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
            {isTr ? '14 haftalık görünüm' : '14-week view'}
          </div>
          <p className="mt-1 text-[12.5px] text-[#525252]">
            {isTr ? 'Hedef puan ' : 'Target '}
            <span className="bz-mono font-semibold text-[#0A0A0A]">{targetRating.toFixed(1)}</span>
            {' · '}
            {isTr ? 'şu an ' : 'now '}
            <span className="bz-mono font-semibold" style={{ color: deltaColor }}>
              {deltaText}
            </span>
            {' '}
            {isTr ? (deltaToTarget >= 0 ? 'üzerinde' : 'altında') : (deltaToTarget >= 0 ? 'above' : 'below')}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10.5px] text-[#737373]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ background: '#EDEDED' }} />
            {isTr ? 'Hacim' : 'Volume'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3" style={{ background: '#0A0A0A' }} />
            {isTr ? 'Puan' : 'Rating'}
          </span>
        </div>
      </header>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block w-full"
          style={{ minWidth: 600 }}
          role="img"
          aria-label={
            isTr
              ? `14 haftalık puan ve hacim trendi, son hafta ortalama ${latestRating.toFixed(2)} puan`
              : `14-week rating and volume trend, latest week avg rating ${latestRating.toFixed(2)}`
          }
        >
          {/* Grid lines (Y axis) */}
          {yTickValues.map((_, i) => {
            const y = PAD_TOP + (i / (yTickValues.length - 1)) * (VB_H - PAD_TOP - PAD_BOTTOM);
            return (
              <line
                key={`grid-${i}`}
                x1={PAD_X}
                x2={VB_W - PAD_X / 2}
                y1={y}
                y2={y}
                stroke="#EDEDED"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Y labels */}
          {yTickValues.map((val, i) => {
            const y = PAD_TOP + (i / (yTickValues.length - 1)) * (VB_H - PAD_TOP - PAD_BOTTOM);
            return (
              <text
                key={`yl-${i}`}
                x={PAD_X - 8}
                y={y + 4}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="#A3A3A3"
                textAnchor="end"
              >
                {val.toFixed(1)}
              </text>
            );
          })}

          {/* X labels (her 2 haftada bir) */}
          {weeks.map((w, i) =>
            i % 2 === 0 ? (
              <text
                key={`xl-${i}`}
                x={PAD_X + i * stepX}
                y={VB_H - 8}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="#A3A3A3"
                textAnchor="middle"
              >
                {w.label}
              </text>
            ) : null,
          )}

          {/* Volume bars (background gri) */}
          {weeks.map((w, i) => {
            if (w.volume === 0) return null;
            const barH = (w.volume / maxVolume) * (VB_H - PAD_TOP - PAD_BOTTOM - 20);
            const x = PAD_X + i * stepX - 10;
            const y = VB_H - PAD_BOTTOM - barH;
            return (
              <rect
                key={`v-${i}`}
                x={x}
                y={y}
                width={20}
                height={barH}
                fill="#EDEDED"
                rx={2}
              >
                <title>
                  {`${w.label} — ${w.volume} ${isTr ? 'yorum' : 'reviews'}`}
                </title>
              </rect>
            );
          })}

          {/* Target line (dashed) */}
          <line
            x1={PAD_X}
            x2={VB_W - PAD_X / 2}
            y1={targetY}
            y2={targetY}
            stroke="#A3A3A3"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={VB_W - PAD_X / 2 - 5}
            y={targetY - 5}
            fontSize="10"
            fontFamily="var(--font-mono)"
            fill="#737373"
            textAnchor="end"
          >
            {isTr ? `HEDEF ${targetRating.toFixed(1)}` : `TARGET ${targetRating.toFixed(1)}`}
          </text>

          {/* Lime area gradient */}
          <defs>
            <linearGradient id="trend-fade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#C6F24E" stopOpacity="0.4" />
              <stop offset="1" stopColor="#C6F24E" stopOpacity="0" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill="url(#trend-fade)" />}

          {/* Trend line (graphite stroke) */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0A0A0A"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Points + last-point tooltip */}
          {linePoints.map((p, i) => {
            const isLast = i === linePoints.length - 1;
            return (
              <g key={`p-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 5 : 3}
                  fill={isLast ? '#C6F24E' : '#0A0A0A'}
                  stroke={isLast ? '#0A0A0A' : '#FFF'}
                  strokeWidth={isLast ? 2 : 1.5}
                >
                  <title>
                    {`${weeks[p.idx].label} — ${p.rating.toFixed(2)} ${isTr ? 'puan' : 'rating'}`}
                  </title>
                </circle>
                {isLast && (
                  <g>
                    <rect
                      x={p.x - 32}
                      y={p.y - 36}
                      width={64}
                      height={24}
                      rx={6}
                      fill="#0A0A0A"
                    />
                    <text
                      x={p.x}
                      y={p.y - 19}
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                      fontWeight="600"
                      fill="#C6F24E"
                      textAnchor="middle"
                    >
                      {p.rating.toFixed(2)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default WeeklyTrendChart;
