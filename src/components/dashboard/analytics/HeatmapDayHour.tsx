// Phase 8c+ §38.24 — Analytics tasarım drift'i kapatma (.design-owner-2026/
// page-analytics.jsx YORUM YOĞUNLUĞU paterni). 7×24 (Gün × Saat) heatmap
// custom HTML grid — recharts dependency'si yok. Mevcut "Günlük Dağılım" + "Saat
// Bazlı Dağılım" 2 ayrı bar chart pattern'i KEEP edilir; bu yeni section
// owner'a 2D yoğunluk haritası sunar (peak gün × saat tek bakışta).
//
// Pure presentational — server + client component'lerin ikisinden de import
// edilebilir ('use client' yok). Mobile responsive: parent overflow-x-auto
// gerekirse min-w-[480px] cell layout korunur.

import { Fragment } from 'react';

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
// Day-label column + 24 equal hour columns (shared by cells and the x axis).
const GRID_TEMPLATE = '32px repeat(24, minmax(0, 1fr))';

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

  const totalReviews = cells.reduce((sum, c) => sum + c.count, 0);
  const hasData = totalReviews > 0;

  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="pn-card-title text-pn-ink">{isTr ? 'Gün ve saate göre puan' : 'Ratings by day and hour'}</h2>
          <p className="mt-1 text-[13px] text-[#9A9A9A]">
            {isTr ? 'Puanların geldiği gün ve saatler' : 'When ratings come in'}
          </p>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full bg-pn-canvas px-3 py-1.5 sm:flex">
          <span className="text-[12px] text-[#737373]">{isTr ? 'Az' : 'Low'}</span>
          {['#E3F4A6', '#111110', '#C6F24E'].map((c) => (
            <span key={c} aria-hidden="true" className="pn-legend-dot h-2.5 w-2.5" style={{ background: c }} />
          ))}
          <span className="text-[12px] text-[#737373]">{isTr ? 'Çok' : 'High'}</span>
        </div>
      </header>

      {hasData ? (
        <>
          {/* HTML grid instead of a scaled SVG: the old 480×180 viewBox was
              stretched to the card width (~2.2× on desktop), so the 9–10px
              axis labels rendered at ~20px. Cells still fill the width; the
              labels stay at their real size. Below ~480px the grid scrolls. */}
          <div className="overflow-x-auto">
            <div
              className="min-w-[480px]"
              role="img"
              aria-label={
                isTr
                  ? `Gün × saat yorum yoğunluğu, pik ${dayLabels[peakDay]} ${String(peakHour).padStart(2, '0')}:00 · ${peakCount} yorum/saat`
                  : `Day × hour review density, peak ${dayLabels[peakDay]} ${String(peakHour).padStart(2, '0')}:00 · ${peakCount} reviews/hour`
              }
            >
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
                {dayLabels.map((day, di) => (
                  <Fragment key={`row-${day}`}>
                    <span
                      className="tabular-nums self-center pr-1.5 text-right text-[12px] leading-none text-[#737373]"
                      aria-hidden="true"
                    >
                      {day}
                    </span>
                    {Array.from({ length: 24 }, (_, hi) => {
                      const v = matrix[di][hi];
                      const ratio = max > 0 ? v / max : 0;
                      // Pano: empty → canvas grey; low → light green; mid → mid green; peak → black.
                      const fill =
                        v === 0 ? 'var(--color-pn-canvas)' : ratio < 0.34 ? '#E3F4A6' : ratio < 0.67 ? '#111110' : '#C6F24E';
                      return (
                        <div
                          key={`c-${di}-${hi}`}
                          className="aspect-square max-h-9 w-full rounded-full"
                          style={{ background: fill }}
                          title={`${dayLabels[di]} ${String(hi).padStart(2, '0')}:00 — ${v} ${isTr ? 'yorum' : 'reviews'}`}
                          aria-hidden="true"
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
              {/* X axis — 5 ticks (00, 06, 12, 18, 23) aligned to their hour column. */}
              <div className="mt-2 grid" style={{ gridTemplateColumns: GRID_TEMPLATE }} aria-hidden="true">
                {HOUR_TICKS.map((h) => (
                  <span
                    key={`hx-${h}`}
                    className="tabular-nums whitespace-nowrap text-[12px] leading-none text-[#9A9A9A]"
                    style={{ gridColumn: h + 2, gridRow: 1, justifySelf: h === 23 ? 'end' : 'center' }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-[13px] tabular-nums text-[#9A9A9A]">
            {isTr
              ? `Pik · ${dayLabels[peakDay]} ${String(peakHour).padStart(2, '0')}:00 · ${peakCount} yorum/saat`
              : `Peak · ${dayLabels[peakDay]} ${String(peakHour).padStart(2, '0')}:00 · ${peakCount} reviews/hour`}
          </p>
        </>
      ) : (
        <p className="rounded-[16px] bg-pn-canvas px-4 py-6 text-[14px] text-[#737373]">
          {isTr
            ? 'Bu pencere için yeterli yorum yok.'
            : 'Not enough reviews for this window.'}
        </p>
      )}
    </div>
  );
}

export default HeatmapDayHour;
