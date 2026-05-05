import { Sparkline } from '@/components/ui';

// Phase 8c+ §38.34 — Analitik mobile hero card (sm:hidden). Tasarım kaynağı:
// .design-owner-2026/project/page-mobile-v2.jsx MobileAnalytics hero —
// graphite bg + lime 4.71 + sparkline.
//
// Pattern §38.28 (dashboard mobile hero) reuse. Pure presentational.
// avgRating > 0 + sparkline.length >= 2 guard caller-side; bu component'i
// sadece visible için mount edilir.

export interface MobileAnalyticsHeroProps {
  avgRating: number;
  /** "↑ 0.18" / "↓ 0.05" — delta string. null → render gizli. */
  delta?: string | null;
  deltaKind?: 'up' | 'down' | 'flat';
  /** 14-bucket sparkline data (rating per week). */
  sparkline?: number[];
  isTr?: boolean;
}

export function MobileAnalyticsHero({
  avgRating,
  delta = null,
  deltaKind = 'up',
  sparkline,
  isTr = true,
}: MobileAnalyticsHeroProps) {
  if (avgRating <= 0) return null;

  const deltaTone =
    deltaKind === 'up'
      ? 'text-[#C6F24E]'
      : deltaKind === 'down'
        ? 'text-[#FCA5A5]'
        : 'text-white/70';

  return (
    <section
      className="sm:hidden rounded-[18px] bg-[#0A0A0A] text-white p-[18px] relative overflow-hidden"
      aria-label={isTr ? 'Bu ay ortalama puan' : "This month's average rating"}
    >
      <div className="pulse-eyebrow text-white/60 text-[9.5px]">
        {isTr ? 'ORTALAMA PUAN' : 'AVG RATING'}
      </div>
      <div className="mt-2 mb-3">
        <div className="flex items-baseline gap-2.5">
          <span
            className="bz-h-tight"
            style={{
              fontSize: 56,
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              color: '#C6F24E',
            }}
          >
            {avgRating.toFixed(2)}
          </span>
          {delta && (
            <span className={`text-[13px] font-semibold ${deltaTone} bz-mono tabular-nums`}>
              {delta}
            </span>
          )}
        </div>
      </div>
      {sparkline && sparkline.length >= 2 && (
        <div className="h-[60px] -mx-[18px] -mb-[18px] px-[18px] pb-[18px]">
          <Sparkline
            values={sparkline}
            w={320}
            h={60}
            color="#C6F24E"
            className="w-full"
          />
        </div>
      )}
    </section>
  );
}

export default MobileAnalyticsHero;
