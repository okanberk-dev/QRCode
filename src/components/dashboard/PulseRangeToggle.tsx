'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Phase 8c+ §38.30 — NABIZ chart range toggle (30G/90G/YTD).
// Tasarım kaynağı: .design-owner-2026/project/page-dashboard.jsx line 230-234
// (`bz-chip` 3'lü active state + chart body).
//
// TrendsChart Recharts wrap — `dynamic({ ssr: false })` direkt server
// component'ten import edilemediği için (CLAUDE.md §27 paterni); bu
// 'use client' wrapper'da güvenli. Server-side render yok.
const TrendsChart = dynamic(() => import('@/components/admin/TrendsChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] sm:h-[320px] md:h-[350px] w-full bz-skeleton rounded-xl" />
  ),
});

export type RangeKey = '30g' | '90g' | 'ytd';

export interface TrendPoint {
  date: string;
  count: number;
  avgRating: number;
}

export interface RangePeak {
  /** Bucket'ın tarihi (locale-format edilmiş, "4 Mayıs" gibi). */
  dateText: string;
  /** O gün/hafta'daki yorum sayısı. */
  count: number;
}

export interface PulseRangeToggleProps {
  ranges: Record<RangeKey, { data: TrendPoint[]; peak: RangePeak | null }>;
  defaultRange?: RangeKey;
  isTr?: boolean;
}

const LABELS: Record<RangeKey, { tr: string; en: string }> = {
  '30g': { tr: '30G', en: '30D' },
  '90g': { tr: '90G', en: '90D' },
  ytd: { tr: 'YTD', en: 'YTD' },
};

const ORDER: RangeKey[] = ['30g', '90g', 'ytd'];

export function PulseRangeToggle({
  ranges,
  defaultRange = '30g',
  isTr = true,
}: PulseRangeToggleProps) {
  const [active, setActive] = useState<RangeKey>(defaultRange);
  const activeRange = ranges[active];

  return (
    <div className="flex flex-col">
      {/* Chip toggle satırı — tasarımda chart kart header'ında sağda. */}
      <div
        role="tablist"
        aria-label={isTr ? 'NABIZ aralığı' : 'Pulse range'}
        className="flex justify-end gap-1.5 mb-3"
      >
        {ORDER.map((key) => {
          const label = isTr ? LABELS[key].tr : LABELS[key].en;
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(key)}
              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 ${
                isActive
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white border border-[#EDEDED] text-[#525252] hover:text-[#0A0A0A] hover:border-[#A3A3A3]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <TrendsChart data={activeRange.data} />

      {/* Peak hint footer — tasarımda "Pik · 4 Mayıs · 9 yorum" sağa
          aligned. activeRange.peak null ise (boş window) gizlenir. */}
      {activeRange.peak && activeRange.peak.count > 0 && (
        <p className="bz-mono mt-2 text-[11px] text-[#737373] text-right">
          {isTr
            ? `Pik · ${activeRange.peak.dateText} · ${activeRange.peak.count} yorum`
            : `Peak · ${activeRange.peak.dateText} · ${activeRange.peak.count} reviews`}
        </p>
      )}
    </div>
  );
}

export default PulseRangeToggle;
