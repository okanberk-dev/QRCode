import { InfoTip, Sparkline } from '@/components/ui';
import { PanoNumber } from '@/components/panel/pano/PanoNumber';
import type { ChangeText, ChangeTone } from '@/lib/feedback-metrics';

// §38.50 — Analitik sayfası KPI grid 5-col single row (tasarım birebir).
// Tasarım kaynağı: .design-owner-2026/project/page-analytics.jsx PageAnalytics
// "Headline" line 47-72: 5-col grid, her biri label/value/delta/subtitle.
//
// §38.34 hibrit (4 top + 3 secondary) → tasarım birebir 5 KPI single row.
// Owner kararı (CLAUDE.md §38.50): secondary 3 (Dönüşüm/Yönlendirme/AI Yanıt)
// silindi — tasarım sade. Mobile: grid-cols-2 lg:grid-cols-5.
//
// Sparkline + delta + subtitle korunur (mevcut tile yapısı, sadece grid değişir).

export interface KpiSpec {
  label: string;
  value: string;
  /** Metric definition behind an ⓘ (CLAUDE.md §58). */
  info?: string;
  /** Period change from describeChange / describeRatingChange. */
  change?: ChangeText | null;
  /** Legacy delta string (admin analytics). Ignored when `change` is set. */
  delta?: string | null;
  deltaKind?: 'up' | 'down' | 'flat' | 'neutral';
  subtitle?: string;
  /** Sparkline data; min 2 points. */
  sparkline?: number[];
  sparklineColor?: string;
}

export interface AnalyticsKpiGridProps {
  kpis: KpiSpec[];
  isTr?: boolean;
}

const TONE_COLOR: Record<ChangeTone, string> = { good: '#3A8228', bad: '#D92D20', neutral: '#737373' };

function KpiCard({ kpi, isTr }: { kpi: KpiSpec; isTr: boolean }) {
  const change: ChangeText | null =
    kpi.change ??
    (kpi.delta
      ? {
          text: kpi.delta,
          arrow: '',
          tone: kpi.deltaKind === 'up' ? 'good' : kpi.deltaKind === 'down' ? 'bad' : 'neutral',
        }
      : null);
  return (
    <article className="bz-card flex min-w-0 flex-col gap-3 p-5 sm:p-6">
      <div className="inline-flex items-center gap-1 text-[14px] text-[#737373]">
        {kpi.label}
        {kpi.info && <InfoTip text={kpi.info} label={kpi.label} isTr={isTr} />}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-[30px] leading-none text-pn-ink sm:text-[34px]">
          <PanoNumber value={kpi.value} locale={isTr ? 'tr' : 'en'} />
        </span>
        {change && (
          <span className="text-[12px] font-medium tabular-nums" style={{ color: TONE_COLOR[change.tone] }}>
            {change.arrow ? `${change.arrow} ` : ''}
            {change.text}
          </span>
        )}
      </div>
      {kpi.sparkline && kpi.sparkline.length >= 2 && (
        <div className="h-7">
          <Sparkline values={kpi.sparkline} w={140} h={28} color={kpi.sparklineColor ?? 'var(--color-pn-ink)'} className="w-full" />
        </div>
      )}
      {kpi.subtitle && <div className="mt-auto text-[13px] leading-snug text-[#9A9A9A]">{kpi.subtitle}</div>}
    </article>
  );
}

export function AnalyticsKpiGrid({ kpis, isTr = true }: AnalyticsKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} isTr={isTr} />
      ))}
    </div>
  );
}

export default AnalyticsKpiGrid;
