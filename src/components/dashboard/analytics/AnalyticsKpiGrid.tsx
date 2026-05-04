import { Sparkline } from '@/components/ui';

// Phase 8c+ §38.34 — Analitik sayfası KPI grid. Tasarım kaynağı:
// .design-owner-2026/project/page-analytics.jsx KPI 4-card §2 + Buaze ek
// 3-card secondary alt strip (Dönüşüm/Yönlendirme/AI Yanıt).
//
// Hibrit layout (kullanıcı kararı, CLAUDE.md §38.34):
// - Top: 4 KPI tasarım uyumlu (Ortalama Puan / Bu Ay Yorum / NPS Skoru /
//   Yanıt Oranı), her biri sparkline + delta + subtitle
// - Bottom: 3-card secondary (Dönüşüm Oranı / Yönlendirme Oranı / AI Yanıt)
//   - Buaze ek metric'leri, daha küçük tile
// - Mobile: 4-grid 2x2 top KPI; secondary mobile'da gizli (sm:hidden)

export interface KpiSpec {
  label: string;
  value: string;
  /** "+0.18" / "+24%" / "+12" / "+8%" — delta string. null → render gizli. */
  delta?: string | null;
  /** "up" | "down" | "flat" | "neutral" — delta tone. */
  deltaKind?: 'up' | 'down' | 'flat' | 'neutral';
  /** "hedef 4.6" / "156 önceki ay" / "Promoter %78" / "1.6 sa ortalama". */
  subtitle?: string;
  /** Sparkline 14-bucket data; varsa render edilir. */
  sparkline?: number[];
  /** Sparkline lime accent — sadece pozitif delta için anlamlı. */
  sparklineColor?: string;
}

export interface AnalyticsKpiGridProps {
  /** 4 top KPI (tasarım uyumlu). */
  topKpis: KpiSpec[];
  /** 3 secondary KPI (Buaze ek; mobile'da gizli). */
  secondaryKpis?: KpiSpec[];
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
            fontSize: 30,
            fontWeight: 600,
            lineHeight: 1,
            color: '#0A0A0A',
            letterSpacing: '-0.02em',
          }}
        >
          {kpi.value}
        </span>
        {kpi.delta && (
          <span className={`text-[11.5px] font-semibold tabular-nums ${deltaTone}`}>
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

function SecondaryCard({ kpi }: { kpi: KpiSpec }) {
  const deltaTone =
    kpi.deltaKind === 'up'
      ? 'text-[#16A34A]'
      : kpi.deltaKind === 'down'
        ? 'text-[#DC2626]'
        : 'text-[#737373]';
  return (
    <article
      className="bz-card-soft p-3.5 flex items-center justify-between gap-3"
      aria-label={kpi.label}
    >
      <div className="min-w-0 flex-1">
        <div className="pulse-eyebrow text-[10px] text-[#737373] truncate">{kpi.label}</div>
        <div className="bz-mono mt-1 tabular-nums text-[18px] font-semibold text-[#0A0A0A]">
          {kpi.value}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {kpi.delta && (
          <span className={`text-[11px] font-semibold tabular-nums ${deltaTone}`}>
            {kpi.delta}
          </span>
        )}
        {kpi.subtitle && (
          <span className="bz-mono text-[10px] text-[#A3A3A3] tabular-nums max-w-[110px] truncate text-right">
            {kpi.subtitle}
          </span>
        )}
      </div>
    </article>
  );
}

export function AnalyticsKpiGrid({
  topKpis,
  secondaryKpis = [],
  // isTr currently unused — locale-bound formatting handled by caller per KPI.
}: AnalyticsKpiGridProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {topKpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>
      {secondaryKpis.length > 0 && (
        <div className="hidden sm:grid sm:grid-cols-3 gap-3">
          {secondaryKpis.map((kpi) => (
            <SecondaryCard key={kpi.label} kpi={kpi} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AnalyticsKpiGrid;
