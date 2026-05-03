'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MeasuredChart } from '@/components/charts/MeasuredChart';

export interface InteractionTrendPoint {
  /** Display label, dd/mm formatlı (ör. "01/05"). */
  date: string;
  /** Toplam QR taranma — qr_scans tablosundan gerçek event sayımı. */
  scans: number;
  /** Yorum count — Feedback tablosundan. Funnel: scans ⊇ reviews. */
  reviews: number;
  /** Yönlendirme — rating ≥ 4 + platform set. Funnel: reviews ⊇ redirects. */
  redirects: number;
}

interface Props {
  data: InteractionTrendPoint[];
  isTr: boolean;
}

/**
 * Analitik sayfası "X gün etkileşim" chart'ı. Recharts AreaChart 3-seri
 * funnel: scans (en üst) → reviews → redirects (en alt). Dynamic tick
 * interval x-axis tıkanmasını önler (CLAUDE.md §13.8 + §21.14 pattern).
 *
 * Renk hierarchy: scans gri (üst funnel, hacim), reviews graphite (ana
 * metrik), redirects lime-deep (aksiyon tamamlanmış).
 */
export default function InteractionTrendChart({ data, isTr }: Props) {
  const len = data.length;
  // Dynamic tick interval: 7d her label, 30d her 5, 90d her ~length/6.
  const interval = len <= 7 ? 0 : len <= 30 ? 5 : Math.max(1, Math.floor(len / 6));

  return (
    <MeasuredChart className="h-[240px] sm:h-[300px] md:h-[340px] w-full min-w-0">
      {({ width, height }) => (
        <AreaChart width={width} height={height} data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="trendScansFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#737373" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#737373" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trendReviewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0A0A0A" stopOpacity={0.16} />
              <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trendRedirectsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A8D62E" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#A8D62E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" />
          <XAxis
            dataKey="date"
            interval={interval}
            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #EDEDED',
              boxShadow: '0 8px 24px -8px rgba(10,10,10,0.12)',
              padding: 10,
              fontSize: 12,
            }}
            labelStyle={{ fontWeight: 700, color: '#0A0A0A', marginBottom: 4 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="scans"
            name={isTr ? 'Taranma' : 'Scans'}
            stroke="#737373"
            strokeWidth={2}
            fill="url(#trendScansFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#737373', strokeWidth: 2, stroke: '#fff' }}
          />
          <Area
            type="monotone"
            dataKey="reviews"
            name={isTr ? 'Yorum' : 'Reviews'}
            stroke="#0A0A0A"
            strokeWidth={2}
            fill="url(#trendReviewsFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#0A0A0A', strokeWidth: 2, stroke: '#fff' }}
          />
          <Area
            type="monotone"
            dataKey="redirects"
            name={isTr ? 'Yönlendirme' : 'Redirects'}
            stroke="#A8D62E"
            strokeWidth={2}
            fill="url(#trendRedirectsFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#A8D62E', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      )}
    </MeasuredChart>
  );
}
