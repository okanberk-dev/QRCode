import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
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

/** Soft change pills (Fintora "+7.5%"): green, red, grey. */
const TONE_PILL: Record<ChangeTone, string> = { good: 'pn-change--up', bad: 'pn-change--down', neutral: 'pn-change--flat' };

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
  const accentLine = !kpi.sparklineColor || kpi.sparklineColor.toUpperCase() === '#78FC90';
  // Fintora KPI card: grey label + ⓘ, medium number with a grey fraction,
  // a soft change pill, a black trend over a light green area, grey caption.
  return (
    <article className="bz-card flex min-w-0 flex-col p-5 sm:p-6">
      <div className="inline-flex min-h-[24px] items-center gap-1 text-[14px] text-[#737373]">
        {kpi.label}
        {kpi.info && <InfoTip text={kpi.info} label={kpi.label} isTr={isTr} />}
      </div>
      <span className="mt-3 text-[30px] leading-none text-pn-ink sm:text-[34px]">
        <PanoNumber value={kpi.value} locale={isTr ? 'tr' : 'en'} />
      </span>
      {change && (
        <span className={`pn-change mt-3 self-start ${TONE_PILL[change.tone]}`}>
          {/* Direction from the arrow, colour from the tone (a shorter reply
              time is down and good). */}
          {change.arrow === '↑' && <ArrowUpRight size={14} aria-hidden="true" />}
          {change.arrow === '↓' && <ArrowDownRight size={14} aria-hidden="true" />}
          <span className="sr-only">{change.arrow === '↑' ? (isTr ? 'Artış: ' : 'Up: ') : change.arrow === '↓' ? (isTr ? 'Düşüş: ' : 'Down: ') : ''}</span>
          {change.text}
        </span>
      )}
      {kpi.sparkline && kpi.sparkline.length >= 2 && (
        <div className="mt-3 h-8">
          <Sparkline
            values={kpi.sparkline}
            w={140}
            h={32}
            color={kpi.sparklineColor ?? 'var(--color-pn-accent)'}
            fill={accentLine ? 'var(--color-pn-accent-soft)' : undefined}
            strokeWidth={1.75}
            className="w-full"
          />
        </div>
      )}
      {kpi.subtitle && <div className="mt-auto pt-3 text-[13px] leading-snug text-[#9A9A9A]">{kpi.subtitle}</div>}
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
