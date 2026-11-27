import { Sparkles, TrendingUp, Award, AlertTriangle } from 'lucide-react';

// §38.56 — AI İÇGÖRÜLER · BU HAFTA DARK card (tasarım a/page-analytics.jsx
// line 244-275 birebir). Owner kararı: §38.50'de light card'a dönmüştü
// (eski tasarım kaynağı), yeni handoff a/ bundle birebir DARK card istiyor:
//   - Container: graphite (#0A0A0A) bg + lime accent corner
//   - 3-row strüktür: TREND (lime) / KAZANIM (lime) / RİSK (red)
//   - Icon badge dark (#1A1A1A) + tone color border
//   - Body white text on graphite
//
// Server-friendly (data prop). 3 alan boş ise kart gizli
// (extractStructuredInsight fail → fallback empty → UI render etmez).
// Min 1 alan dolu olmalı.

export interface AiInsightsCardProps {
  trend: string;
  win: string;
  risk: string;
  isTr?: boolean;
  /** Header eyebrow override; default "AI İÇGÖRÜLER · BU HAFTA". */
  eyebrowLabel?: string;
}

export function AiInsightsCard({
  trend,
  win,
  risk,
  isTr = true,
  eyebrowLabel,
}: AiInsightsCardProps) {
  // Calm light card (CLAUDE.md §58): one-line summary visible, the rest
  // behind a native "Detay" disclosure (no JS).
  const rows = [
    { key: 'trend', label: isTr ? 'Eğilim' : 'Trend', icon: TrendingUp, color: '#525252', body: trend },
    { key: 'win', label: isTr ? 'Güçlü yön' : 'Strength', icon: Award, color: '#15803D', body: win },
    { key: 'risk', label: isTr ? 'Dikkat' : 'Watch', icon: AlertTriangle, color: '#B91C1C', body: risk },
  ].filter((r) => r.body.trim().length > 0);
  if (rows.length === 0) return null;

  const title = eyebrowLabel ?? (isTr ? 'AI içgörüleri · bu hafta' : 'AI insights · this week');
  const [first, ...rest] = rows;
  const FirstIcon = first.icon;

  return (
    <section className="bz-card p-5 sm:p-6" aria-label={title}>
      <h2 className="inline-flex items-center gap-2 text-[15px] font-medium text-pn-ink">
        <Sparkles size={15} strokeWidth={2} aria-hidden="true" className="text-pn-accent" />
        {title}
      </h2>
      <p className="mt-3 flex items-start gap-2 text-[14px] leading-[1.6] text-[#262626]">
        <FirstIcon size={14} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" style={{ color: first.color }} />
        <span>
          <span className="font-medium" style={{ color: first.color }}>{first.label}: </span>
          {first.body}
        </span>
      </p>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center text-[13px] font-medium text-pn-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover rounded sm:min-h-[32px]">
            <span className="group-open:hidden">{isTr ? 'Detay' : 'Details'}</span>
            <span className="hidden group-open:inline">{isTr ? 'Gizle' : 'Hide'}</span>
          </summary>
          <ul className="mt-1 space-y-2">
            {rest.map((r) => {
              const Icon = r.icon;
              return (
                <li key={r.key} className="flex items-start gap-2 text-[14px] leading-[1.6] text-[#262626]">
                  <Icon size={14} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" style={{ color: r.color }} />
                  <span>
                    <span className="font-medium" style={{ color: r.color }}>{r.label}: </span>
                    {r.body}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

export default AiInsightsCard;
