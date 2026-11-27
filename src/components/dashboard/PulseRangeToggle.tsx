'use client';

import { useState, type ReactNode } from 'react';
import {
  aggregatePlatformTotals,
  type PlatformDailyPoint,
} from '@/lib/analytics-platform-trend';
import { PlatformTrendChartBody } from '@/components/dashboard/analytics/MainTrendChart';

// Phase 8c+ §38.30 — NABIZ chart range toggle (30G/90G/YTD).
// Tasarım kaynağı: .design-owner-2026/project/page-dashboard.jsx line 230-234
// (`bz-chip` 3'lü active state + chart body).
//
export type RangeKey = '30g' | '90g' | 'ytd';

export interface RangePeak {
  /** Bucket'ın tarihi (locale-format edilmiş, "4 Mayıs" gibi). */
  dateText: string;
  /** O gün/hafta'daki yorum sayısı. */
  count: number;
}

export interface PulseRangeToggleProps {
  ranges: Record<RangeKey, { data: PlatformDailyPoint[]; peak: RangePeak | null }>;
  defaultRange?: RangeKey;
  isTr?: boolean;
  /** Card title area, rendered left of the range switch (optional). */
  header?: ReactNode;
  /** Link/action rendered right of the peak hint under the chart (optional). */
  footerAction?: ReactNode;
}

const LABELS: Record<RangeKey, { tr: string; en: string }> = {
  '30g': { tr: '30G', en: '30D' },
  '90g': { tr: '90G', en: '90D' },
  ytd: { tr: 'YTD', en: 'YTD' },
};

const ORDER: RangeKey[] = ['30g', '90g', 'ytd'];
const PULSE_SERIES: Array<{
  key: keyof Pick<PlatformDailyPoint, 'google' | 'tripadvisor' | 'buazeQr' | 'other'>;
  labelTr: string;
  labelEn: string;
  color: string;
}> = [
  { key: 'google', labelTr: 'Google', labelEn: 'Google', color: '#000000' },
  { key: 'tripadvisor', labelTr: 'Tripadvisor', labelEn: 'Tripadvisor', color: '#737373' },
  { key: 'buazeQr', labelTr: 'Buaze QR', labelEn: 'Buaze QR', color: '#5D3EBC' },
  { key: 'other', labelTr: 'Diğer', labelEn: 'Other', color: '#A3A3A3' },
];

export function PulseRangeToggle({
  ranges,
  defaultRange = '30g',
  isTr = true,
  header,
  footerAction,
}: PulseRangeToggleProps) {
  const [active, setActive] = useState<RangeKey>(defaultRange);
  const activeRange = ranges[active];
  const totals = aggregatePlatformTotals(activeRange.data);
  const peak = activeRange.peak && activeRange.peak.count > 0 ? activeRange.peak : null;

  return (
    <div className="flex flex-col">
      {/* Title (optional) + range switch on one row. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header ? <div className="min-w-0">{header}</div> : null}
        <div
          role="group"
          aria-label={isTr ? 'Grafik aralığı' : 'Chart range'}
          className="ml-auto flex shrink-0 gap-1.5"
        >
          {ORDER.map((key) => {
            const label = isTr ? LABELS[key].tr : LABELS[key].en;
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(key)}
                className={`inline-flex min-h-[32px] items-center justify-center px-3 rounded-full text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-pn-accent text-white'
                    : 'bg-white border border-pn-line text-[#525252] hover:text-pn-ink hover:border-[#A3A3A3]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Series legend with totals for the active range. */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {PULSE_SERIES.map((item) => {
          const total = totals[item.key];
          if (total === 0) return null;
          return (
            <span key={item.key} className="inline-flex items-center gap-1.5 text-[12px] text-[#525252]">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-[8px]"
                style={{ background: item.color }}
              />
              <span className="font-medium">{isTr ? item.labelTr : item.labelEn}</span>
              <span className="tabular-nums tabular-nums font-medium text-pn-ink">{total}</span>
            </span>
          );
        })}
      </div>

      {/* No min-width: on lg the card sits in a ~400-480px column and a
          520px floor made the newest days scroll out of view (the wrapper
          hides its scrollbar). Below lg the card is never under ~536px. */}
      <PlatformTrendChartBody
        points={activeRange.data}
        isTr={isTr}
        heightClassName="h-[260px] w-full sm:h-[300px] md:h-[330px]"
        emptyClassName="mt-4 rounded-[14px] border border-dashed border-pn-line bg-pn-canvas px-4 py-8 text-center"
      />

      {/* Peak hint ("Pik · 4 Mayıs · 9 yorum") + optional action. */}
      {(peak || footerAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {peak ? (
            <p className="tabular-nums text-[12px] text-[#737373]">
              {isTr
                ? `Pik · ${peak.dateText} · ${peak.count} yorum`
                : `Peak · ${peak.dateText} · ${peak.count} ${peak.count === 1 ? 'review' : 'reviews'}`}
            </p>
          ) : (
            <span />
          )}
          {footerAction}
        </div>
      )}
    </div>
  );
}

export default PulseRangeToggle;
