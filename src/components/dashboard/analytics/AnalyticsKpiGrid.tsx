import { Sparkline } from '@/components/ui';

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
  /** "+0.18" / "+24%" / "-2%" — delta string. null → render gizli. */
  delta?: string | null;
  /** "up" | "down" | "flat" | "neutral" — delta tone. */
  deltaKind?: 'up' | 'down' | 'flat' | 'neutral';
  /** "hedef 4.6" / "156 önceki ay" / "Promoter %78" / "1.6 sa ortalama". */
  subtitle?: string;
  /** Sparkline data; varsa render edilir. Min 2 nokta gerekir. */
  sparkline?: number[];
  /** Sparkline lime accent — sadece pozitif delta için anlamlı. */
  sparklineColor?: string;
}

export interface AnalyticsKpiGridProps {
  /** 5 KPI tasarım birebir. */
  kpis: KpiSpec[];
  isTr?: boolean;
}

function KpiCard({ kpi }: { kpi: KpiSpec }) {
  const deltaTone =
    kpi.deltaKind === 'up'
      ? 'text-[#16A34A]'
      : kpi.deltaKind === 'down'
        ? 'text-[#DC2626]'
        : 'text-[#737373]';
  return (
    <article
      className="bz-card p-4 sm:p-5 flex flex-col gap-2"
      aria-label={kpi.label}
    >
      <div className="pulse-eyebrow text-[10px] text-[#737373]">{kpi.label}</div>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="bz-mono tabular-nums"
          style={{
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1,
            color: '#0A0A0A',
            letterSpacing: '-0.02em',
          }}
        >
          {kpi.value}
        </span>
        {kpi.delta && (
          <span className={`text-[11px] font-semibold tabular-nums ${deltaTone}`}>
            {kpi.delta}
          </span>
        )}
      </div>
      {kpi.sparkline && kpi.sparkline.length >= 2 && (
        <div className="h-7 -mx-1">
          <Sparkline
            values={kpi.sparkline}
            w={140}
            h={28}
            color={kpi.sparklineColor ?? '#A8D62E'}
            className="w-full"
          />
        </div>
      )}
      {kpi.subtitle && (
        <div className="bz-mono text-[10.5px] text-[#737373] tabular-nums">
          {kpi.subtitle}
        </div>
      )}
    </article>
  );
}

export function AnalyticsKpiGrid({ kpis }: AnalyticsKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}

export default AnalyticsKpiGrid;
