import type { PlatformDailyPoint } from '@/lib/analytics-platform-trend';

// Series metadata shared by the trend chart's legend (MainTrendChart) and its
// recharts canvas (TrendChartCanvas). Kept free of recharts so the legend
// does not pull the chart library into the page's initial JavaScript.

export const SERIES_META: Array<{
  key: keyof Pick<PlatformDailyPoint, 'google' | 'tripadvisor' | 'buazeQr' | 'other'>;
  labelTr: string;
  labelEn: string;
  /** Stack rendering color (Pulse §11 palette). */
  fill: string;
  /** Legend chip color. */
  swatch: string;
  /** Stack opacity (0-1). */
  fillOpacity: number;
}> = [
  {
    key: 'google',
    labelTr: 'Google',
    labelEn: 'Google',
    fill: '#000000',
    swatch: '#000000',
    fillOpacity: 0.85,
  },
  {
    key: 'tripadvisor',
    labelTr: 'Tripadvisor',
    labelEn: 'Tripadvisor',
    fill: '#737373',
    swatch: '#737373',
    fillOpacity: 0.7,
  },
  {
    key: 'buazeQr',
    labelTr: 'Buaze QR',
    labelEn: 'Buaze QR',
    fill: '#D7FE03',
    swatch: '#D7FE03',
    fillOpacity: 0.9,
  },
  {
    key: 'other',
    labelTr: 'Diğer',
    labelEn: 'Other',
    fill: '#E5E5E5',
    swatch: '#A3A3A3',
    fillOpacity: 0.85,
  },
];
