// Phase 8c+ §38.24 — Analytics tasarım drift'i kapatma (.design-owner-2026/
// page-analytics.jsx YORUM YOĞUNLUĞU paterni). 7×24 (Gün × Saat) heatmap
// custom SVG — recharts dependency'si yok. Mevcut "Günlük Dağılım" + "Saat
// Bazlı Dağılım" 2 ayrı bar chart pattern'i KEEP edilir; bu yeni section
// owner'a 2D yoğunluk haritası sunar (peak gün × saat tek bakışta).
//
// Pure presentational — server + client component'lerin ikisinden de import
// edilebilir ('use client' yok). Mobile responsive: parent overflow-x-auto
// gerekirse min-w-[600px] cell layout korunur.

interface HeatmapCell {
  day: number; // 0=Mon..6=Sun
  hour: number; // 0..23
  count: number;
}

export interface HeatmapDayHourProps {
  /** 168 hücre (7 gün × 24 saat) — eksik combination'lar otomatik 0 sayılır. */
  cells: HeatmapCell[];
  isTr?: boolean;
}

const DAY_LABELS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
// X axis: 5 nokta (00, 06, 12, 18, 23) — tasarım kaynağı paterni.
const HOUR_TICKS = [0, 6, 12, 18, 23] as const;

export function HeatmapDayHour({ cells, isTr = true }: HeatmapDayHourProps) {
  const dayLabels = isTr ? DAY_LABELS_TR : DAY_LABELS_EN;

  // 7×24 matrix oluştur — eksik cell'ler 0 default.
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const c of cells) {
    if (c.day >= 0 && c.day < 7 && c.hour >= 0 && c.hour < 24) {
      matrix[c.day][c.hour] = c.count;
    }
  }

  // Max bul (color normalization için).
  let max = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (matrix[d][h] > max) max = matrix[d][h];
    }
  }

  // Peak bul (Pik · Cuma 20:00 · 14 yorum/saat hint için).
  let peakDay = 0;
  let peakHour = 0;
  let peakCount = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (matrix[d][h] > peakCount) {
        peakDay = d;
        peakHour = h;
        peakCount = matrix[d][h];
      }
    }
  }

  // SVG layout (tasarım paterni: 480×180 viewBox)
  const VB_W = 480;
  const VB_H = 180;
  const CELL_W = 18;
  const CELL_H = 20;
  const X_OFFSET = 28;
  const Y_OFFSET = 10;

  const totalReviews = cells.reduce((sum, c) => sum + c.count, 0);
  const hasData = totalReviews > 0;

  return (
    <div>
      <header className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <span className="pulse-eyebrow">{isTr ? 'YORUM YOĞUNLUĞU' : 'REVIEW DENSITY'}</span>
          <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
            {isTr ? 'Gün × Saat' : 'Day × Hour'}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="bz-mono text-[10px] text-[#737373]">{isTr ? 'az' : 'low'}</span>
          {[0.25, 0.45, 0.7, 0.95].map((o, i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{ width: 12, height: 12, background: `rgba(168, 214, 46, ${o})` }}
            />
          ))}
          <span className="bz-mono text-[10px] text-[#737373]">{isTr ? 'çok' : 'high'}</span>
        </div>
      </header>

      {hasData ? (
        <>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className="block w-full"
              style={{ minWidth: 480 }}
              role="img"
              aria-label={
                isTr
                  ? `Gün × saat yorum yoğunluğu heatmap'i, pik ${dayLabels[peakDay]} ${peakHour}:00 · ${peakCount} yorum/saat`
                  : `Day × hour review density heatmap, peak ${dayLabels[peakDay]} ${peakHour}:00 · ${peakCount} reviews/hour`
              }
            >
              {/* X axis labels (5 hour ticks) */}
              {HOUR_TICKS.map((h) => (
                <text
                  key={`hx-${h}`}
                  x={X_OFFSET + h * CELL_W + CELL_W / 2 - 2}
                  y={VB_H - 8}
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fill="#A3A3A3"
                  textAnchor="middle"
                >
                  {String(h).padStart(2, '0')}:00
                </text>
              ))}

              {/* Y axis labels (day names) */}
              {dayLabels.map((day, di) => (
                <text
                  key={`dy-${day}`}
                  x={X_OFFSET - 6}
                  y={Y_OFFSET + di * CELL_H + CELL_H / 2 + 3}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fill="#737373"
                  textAnchor="end"
                >
                  {day}
                </text>
              ))}

              {/* Heatmap cells */}
              {Array.from({ length: 7 }, (_, di) =>
                Array.from({ length: 24 }, (_, hi) => {
                  const v = matrix[di][hi];
                  const ratio = max > 0 ? v / max : 0;
                  // Alpha 0 cell → açık gri; aksi halde lime opacity (tasarım paterni).
                  const fill =
                    v === 0
                      ? '#F2F2F2'
                      : `rgba(168, 214, 46, ${0.15 + ratio * 0.85})`;
                  return (
                    <rect
                      key={`c-${di}-${hi}`}
                      x={X_OFFSET + hi * CELL_W}
                      y={Y_OFFSET + di * CELL_H}
                      width={CELL_W - 2}
                      height={CELL_H - 4}
                      rx={3}
                      fill={fill}
                    >
                      <title>
                        {`${dayLabels[di]} ${String(hi).padStart(2, '0')}:00 — ${v} ${isTr ? 'yorum' : 'reviews'}`}
                      </title>
                    </rect>
                  );
                }),
              )}
            </svg>
          </div>

          <p className="bz-mono mt-2 text-[11px] text-[#737373]">
            {isTr
              ? `Pik · ${dayLabels[peakDay]} ${String(peakHour).padStart(2, '0')}:00 · ${peakCount} yorum/saat`
              : `Peak · ${dayLabels[peakDay]} ${String(peakHour).padStart(2, '0')}:00 · ${peakCount} reviews/hour`}
          </p>
        </>
      ) : (
        <p className="text-[12px] text-[#737373]">
          {isTr
            ? 'Bu pencere için yeterli yorum yok.'
            : 'Not enough reviews for this window.'}
        </p>
      )}
    </div>
  );
}

export default HeatmapDayHour;
