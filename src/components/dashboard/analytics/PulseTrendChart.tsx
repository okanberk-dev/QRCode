'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MeasuredChart } from '@/components/charts/MeasuredChart';
import type { WeeklyTrendPoint } from '@/lib/analytics-weekly-trend';

type TrendMode = 'rating' | 'volume' | 'sentiment';

export interface PulseTrendChartProps {
  weeks: WeeklyTrendPoint[];
  targetRating?: number;
  isTr?: boolean;
}

interface ChartDatum extends WeeklyTrendPoint {
  ratingTarget: number;
  sentimentTarget: number;
}

interface TooltipPayloadItem {
  payload?: ChartDatum;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  isTr: boolean;
  mode: TrendMode;
  targetRating: number;
}

const MODE_COPY: Record<TrendMode, { tr: string; en: string }> = {
  rating: { tr: 'Puan', en: 'Rating' },
  volume: { tr: 'Hacim', en: 'Volume' },
  sentiment: { tr: 'Sentiment', en: 'Sentiment' },
};

function formatSigned(value: number, digits = 2) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatNumber(value: number, locale: 'tr' | 'en') {
  return value.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US');
}

function TrendTooltip({
  active,
  payload,
  isTr,
  mode,
  targetRating,
}: TrendTooltipProps) {
  if (!active) return null;
  const row = payload?.find((item) => item.payload)?.payload;
  if (!row) return null;
  const locale = isTr ? 'tr' : 'en';
  const ratingLabel = row.rating === null ? '—' : row.rating.toFixed(2);
  const sentimentLabel = row.sentimentPct === null ? '—' : `%${row.sentimentPct}`;

  return (
    <div className="rounded-[12px] border border-[#EDEDED] bg-white px-3 py-2.5 shadow-[0_16px_40px_rgba(10,10,10,0.12)]">
      <div className="bz-mono text-[10.5px] font-semibold text-[#0A0A0A]">
        {row.label} · {row.rangeLabel}
      </div>
      <div className="mt-2 grid min-w-[180px] gap-1.5 text-[11.5px] text-[#525252]">
        <div className="flex items-center justify-between gap-4">
          <span>{isTr ? 'Ortalama puan' : 'Average rating'}</span>
          <span className="bz-mono tabular-nums text-[#0A0A0A]">{ratingLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>{isTr ? 'Yorum hacmi' : 'Review volume'}</span>
          <span className="bz-mono tabular-nums text-[#0A0A0A]">
            {formatNumber(row.volume, locale)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>{isTr ? 'Pozitif sentiment' : 'Positive sentiment'}</span>
          <span className="bz-mono tabular-nums text-[#0A0A0A]">{sentimentLabel}</span>
        </div>
      </div>
      {mode === 'rating' && row.rating !== null && (
        <div className="bz-mono mt-2 border-t border-[#F5F5F5] pt-2 text-[10.5px] text-[#737373]">
          {isTr ? 'Hedef farkı' : 'Target gap'}{' '}
          <span className={row.rating >= targetRating ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
            {formatSigned(row.rating - targetRating)}
          </span>
        </div>
      )}
    </div>
  );
}

function EmptyTrendState({ isTr }: { isTr: boolean }) {
  return (
    <div className="mt-5 rounded-[14px] border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-5 py-10 text-center">
      <div className="pulse-eyebrow text-[10.5px] text-[#737373]">
        {isTr ? 'VERİ BEKLENİYOR' : 'WAITING FOR DATA'}
      </div>
      <p className="mx-auto mt-2 max-w-[440px] text-[13px] leading-6 text-[#525252]">
        {isTr
          ? 'Bu aralıkta yorum olmadığı için çizgi bilinçli olarak boş bırakıldı. Yeni yorumlar geldikçe haftalık puan, hacim ve sentiment burada oluşur.'
          : 'No reviews landed in this window, so the trend line is intentionally empty. Weekly rating, volume, and sentiment appear as new reviews arrive.'}
      </p>
    </div>
  );
}

export function PulseTrendChart({
  weeks,
  targetRating = 4.0,
  isTr = true,
}: PulseTrendChartProps) {
  const [mode, setMode] = useState<TrendMode>('rating');
  const locale = isTr ? 'tr' : 'en';
  const data = useMemo<ChartDatum[]>(
    () =>
      weeks.map((week) => ({
        ...week,
        ratingTarget: targetRating,
        sentimentTarget: 50,
      })),
    [targetRating, weeks],
  );
  const pointsWithData = data.filter((week) => week.hasData);
  const lastPoint = [...pointsWithData].reverse().find((week) => week.rating !== null) ?? null;
  const previousPoint =
    pointsWithData
      .slice(0, Math.max(0, pointsWithData.length - 1))
      .reverse()
      .find((week) => week.rating !== null) ?? null;
  const bestPoint = pointsWithData.reduce<ChartDatum | null>((best, week) => {
    if (week.rating === null) return best;
    if (!best || best.rating === null || week.rating > best.rating) return week;
    return best;
  }, null);
  const avgVolume =
    pointsWithData.length > 0
      ? Math.round(pointsWithData.reduce((sum, week) => sum + week.volume, 0) / pointsWithData.length)
      : 0;
  const maxVolume = Math.max(1, ...data.map((week) => week.volume));
  const lastRating = lastPoint?.rating ?? null;
  const targetGap = lastRating === null ? null : lastRating - targetRating;
  const ratingDelta =
    lastRating !== null && previousPoint && previousPoint.rating !== null
      ? lastRating - previousPoint.rating
      : null;
  const hasAnyData = pointsWithData.length > 0;
  const hasLowData = pointsWithData.length > 0 && pointsWithData.length < 3;

  const headerHint =
    targetGap === null
      ? isTr
        ? `Hedef puan ${targetRating.toFixed(1)}`
        : `Target ${targetRating.toFixed(1)}`
      : isTr
        ? `Hedef puan ${targetRating.toFixed(1)} · şu an ${formatSigned(targetGap)}`
        : `Target ${targetRating.toFixed(1)} · currently ${formatSigned(targetGap)}`;

  return (
    <section
      className="bz-card p-5 sm:p-6"
      aria-label={isTr ? 'Puan ve hacim trendi' : 'Rating and volume trend'}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="pulse-eyebrow text-[10.5px] text-[#737373]">
            {isTr ? 'PUAN & HACİM TRENDİ' : 'RATING & VOLUME TREND'}
          </h3>
          <div className="bz-h-tight mt-1 text-[18px]">
            {isTr ? `${weeks.length} haftalık görünüm` : `${weeks.length}-week view`}
          </div>
          <div className="bz-mono mt-1 text-[11px] text-[#737373] tabular-nums">
            {headerHint}
          </div>
        </div>
        <div
          role="tablist"
          aria-label={isTr ? 'Trend modu' : 'Trend mode'}
          className="inline-flex w-fit items-center gap-0.5 rounded-full border border-[#EDEDED] bg-[#FAFAFA] p-0.5"
        >
          {(['rating', 'volume', 'sentiment'] as const).map((id) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(id)}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  active ? 'bg-[#0A0A0A] text-white' : 'text-[#525252] hover:bg-white'
                }`}
              >
                {isTr ? MODE_COPY[id].tr : MODE_COPY[id].en}
              </button>
            );
          })}
        </div>
      </header>

      {!hasAnyData ? (
        <EmptyTrendState isTr={isTr} />
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-3">
              <div className="pulse-eyebrow text-[9.5px] text-[#737373]">
                {isTr ? 'SON PUAN' : 'LATEST RATING'}
              </div>
              <div className="bz-mono mt-1 text-[18px] font-semibold tabular-nums text-[#0A0A0A]">
                {lastRating === null ? '—' : lastRating.toFixed(2)}
              </div>
              <div
                className={`mt-1 text-[11px] ${
                  targetGap === null
                    ? 'text-[#737373]'
                    : targetGap >= 0
                      ? 'text-[#16A34A]'
                      : 'text-[#DC2626]'
                }`}
              >
                {targetGap === null
                  ? isTr
                    ? 'hedef bekliyor'
                    : 'target pending'
                  : isTr
                    ? `${formatSigned(targetGap)} hedef farkı`
                    : `${formatSigned(targetGap)} target gap`}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#EDEDED] bg-white p-3">
              <div className="pulse-eyebrow text-[9.5px] text-[#737373]">
                {isTr ? 'EN İYİ HAFTA' : 'BEST WEEK'}
              </div>
              <div className="bz-mono mt-1 text-[18px] font-semibold tabular-nums text-[#0A0A0A]">
                {bestPoint?.rating === null || !bestPoint ? '—' : bestPoint.rating.toFixed(2)}
              </div>
              <div className="mt-1 text-[11px] text-[#737373]">
                {bestPoint ? `${bestPoint.label} · ${bestPoint.rangeLabel}` : isTr ? 'veri yok' : 'no data'}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#EDEDED] bg-white p-3">
              <div className="pulse-eyebrow text-[9.5px] text-[#737373]">
                {isTr ? 'ORT. HAFTALIK HACİM' : 'AVG WEEKLY VOLUME'}
              </div>
              <div className="bz-mono mt-1 text-[18px] font-semibold tabular-nums text-[#0A0A0A]">
                {formatNumber(avgVolume, locale)}
              </div>
              <div className="mt-1 text-[11px] text-[#737373]">
                {ratingDelta === null
                  ? isTr
                    ? 'puan trendi oluşuyor'
                    : 'rating trend forming'
                  : isTr
                    ? `${formatSigned(ratingDelta)} son veri`
                    : `${formatSigned(ratingDelta)} latest move`}
              </div>
            </div>
          </div>

          <div className="-mx-2 mt-5 overflow-x-auto no-scrollbar px-2 sm:mx-0 sm:px-0">
            <MeasuredChart className="h-[300px] w-full min-w-[680px] sm:h-[340px]">
              {({ width, height }) => (
                <ComposedChart
                  width={width}
                  height={height}
                  data={data}
                  margin={{ top: 18, right: 20, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="pulseRatingArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C6F24E" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#C6F24E" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="pulseSentimentArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A0A0A" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#0A0A0A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EDEDED" strokeDasharray="0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tick={{ fill: '#A3A3A3', fontSize: 11, fontWeight: 600 }}
                    dy={8}
                  />
                  <YAxis
                    yAxisId="rating"
                    domain={[0, 5]}
                    hide
                    allowDataOverflow={false}
                  />
                  <YAxis
                    yAxisId="volume"
                    domain={[0, Math.max(4, Math.ceil(maxVolume * 1.35))]}
                    hide
                  />
                  <YAxis yAxisId="sentiment" domain={[0, 100]} hide />
                  <Tooltip
                    cursor={{ stroke: '#0A0A0A', strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={({ active, payload }) => (
                      <TrendTooltip
                        active={active}
                        payload={payload as unknown as TooltipPayloadItem[] | undefined}
                        isTr={isTr}
                        mode={mode}
                        targetRating={targetRating}
                      />
                    )}
                  />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    radius={[6, 6, 2, 2]}
                    barSize={mode === 'volume' ? 34 : 26}
                    isAnimationActive={false}
                  >
                    {data.map((week) => (
                      <Cell
                        key={week.startIso}
                        fill={mode === 'volume' ? '#C6F24E' : '#E5E5E5'}
                        opacity={
                          week.hasData
                            ? mode === 'volume'
                              ? 0.95
                              : mode === 'rating'
                                ? 0.58
                                : 0.28
                            : 0.12
                        }
                      />
                    ))}
                  </Bar>
                  {(mode === 'rating' || mode === 'volume') && (
                    <ReferenceLine
                      yAxisId="rating"
                      y={targetRating}
                      stroke="#A3A3A3"
                      strokeDasharray="6 6"
                      strokeWidth={1.5}
                      label={{
                        value: isTr ? 'HEDEF' : 'TARGET',
                        fill: '#737373',
                        fontSize: 10,
                        fontWeight: 700,
                        position: 'right',
                      }}
                    />
                  )}
                  {mode === 'sentiment' && (
                    <ReferenceLine
                      yAxisId="sentiment"
                      y={50}
                      stroke="#A3A3A3"
                      strokeDasharray="6 6"
                      strokeWidth={1.5}
                      label={{
                        value: '%50',
                        fill: '#737373',
                        fontSize: 10,
                        fontWeight: 700,
                        position: 'right',
                      }}
                    />
                  )}
                  {mode === 'rating' && (
                    <Area
                      yAxisId="rating"
                      type="monotone"
                      dataKey="rating"
                      connectNulls={false}
                      stroke="none"
                      fill="url(#pulseRatingArea)"
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {mode === 'sentiment' && (
                    <Area
                      yAxisId="sentiment"
                      type="monotone"
                      dataKey="sentimentPct"
                      connectNulls={false}
                      stroke="none"
                      fill="url(#pulseSentimentArea)"
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {(mode === 'rating' || mode === 'volume') && (
                    <Line
                      yAxisId="rating"
                      type="monotone"
                      dataKey="rating"
                      connectNulls={false}
                      stroke={mode === 'rating' ? '#A8D62E' : '#737373'}
                      strokeWidth={mode === 'rating' ? 3 : 2}
                      dot={{ r: 3, fill: '#C6F24E', stroke: '#0A0A0A', strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: '#C6F24E', stroke: '#0A0A0A', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  )}
                  {mode === 'sentiment' && (
                    <Line
                      yAxisId="sentiment"
                      type="monotone"
                      dataKey="sentimentPct"
                      connectNulls={false}
                      stroke="#0A0A0A"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0A0A0A', stroke: '#C6F24E', strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: '#0A0A0A', stroke: '#C6F24E', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              )}
            </MeasuredChart>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F5F5F5] pt-3">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#525252]">
              <span className="h-2 w-2 rounded-full bg-[#C6F24E]" aria-hidden />
              {mode === 'rating'
                ? isTr
                  ? 'Puan çizgisi'
                  : 'Rating line'
                : mode === 'volume'
                  ? isTr
                    ? 'Hacim barları'
                    : 'Volume bars'
                  : isTr
                    ? 'Pozitif sentiment'
                    : 'Positive sentiment'}
            </span>
            <span className="text-[11.5px] text-[#A3A3A3]">·</span>
            <span className="text-[11.5px] text-[#737373]">
              {isTr
                ? 'Boş haftalar çizgide gap olarak bırakılır.'
                : 'Empty weeks are rendered as line gaps.'}
            </span>
            {hasLowData && (
              <span className="ml-auto rounded-full bg-[#FFF7ED] px-2.5 py-1 text-[11px] font-medium text-[#C2410C]">
                {isTr ? 'Düşük veri hacmi' : 'Low data volume'}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
