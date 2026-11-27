import type { PlatformDailyPoint } from '@/lib/analytics-platform-trend';

// Series metadata shared by the trend chart's legend (MainTrendChart) and its
// recharts canvas (TrendChartCanvas). Kept free of recharts so the legend
// does not pull the chart library into the page's initial JavaScript.

export const SERIES_META: Array<{
  key: keyof Pick<PlatformDailyPoint, 'google' | 'tripadvisor' | 'buazeQr' | 'other'>;
  labelTr: string;
  labelEn: string;
  /** Stack rendering colour (Pano: ink, grey, black, light green). */
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
    fill: '#111110',
    swatch: '#111110',
    fillOpacity: 0.12,
  },
  {
    key: 'tripadvisor',
    labelTr: 'Tripadvisor',
    labelEn: 'Tripadvisor',
    fill: '#9A9A9A',
    swatch: '#9A9A9A',
    fillOpacity: 0.16,
  },
  {
    key: 'buazeQr',
    labelTr: 'Buaze QR',
    labelEn: 'Buaze QR',
    fill: '#78FC90',
    swatch: '#78FC90',
    fillOpacity: 0.22,
  },
  {
    key: 'other',
    labelTr: 'Diğer',
    labelEn: 'Other',
    fill: '#111110',
    swatch: '#111110',
    fillOpacity: 0.2,
  },
];
