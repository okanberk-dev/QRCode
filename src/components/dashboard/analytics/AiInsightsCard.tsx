import { Sparkles, TrendingUp, Award, AlertTriangle } from 'lucide-react';

// §38.50 — AI İÇGÖRÜLER · BU HAFTA light card (tasarım birebir parity).
// Tasarım kaynağı: .design-owner-2026/project/page-analytics.jsx
// "AI İÇGÖRÜLER" line 285-315:
//   - Container: bz-card (white bg)
//   - Insight rows: bg-[#FAFAFA] rounded-[10px] borderLeft 2px tone-color
//   - 3-row strüktür: TREND (lime) / KAZANIM (lime-deep) / RİSK (red)
//   - Icon + title + summary
//
// §38.34 dark card (graphite + lime accent) → light theme migration. Owner
// kararı (CLAUDE.md §38.50): tasarım birebir, sayfa visual flow Pulse light
// convention'a uyar.
//
// Server-friendly (data prop). 3 alan boş ise kart gizli (extractStructuredInsight
// fail → fallback empty → UI render etmez). Min 1 alan dolu olmalı.

export interface AiInsightsCardProps {
  trend: string;
  win: string;
  risk: string;
  isTr?: boolean;
  /** Header eyebrow override; default "AI İÇGÖRÜLER · BU HAFTA". */
  eyebrowLabel?: string;
}

interface RowSpec {
  key: 'trend' | 'win' | 'risk';
  labelTr: string;
  labelEn: string;
  icon: typeof TrendingUp;
  /** Border-left + icon + label color. Tone-based: lime/lime-deep/red. */
  toneColor: string;
  /** Tone label color (badge bg + label text). */
  toneBg: string;
  body: string;
}

export function AiInsightsCard({
  trend,
  win,
  risk,
  isTr = true,
  eyebrowLabel,
}: AiInsightsCardProps) {
  const rows: RowSpec[] = [
    {
      key: 'trend',
      labelTr: 'TREND',
      labelEn: 'TREND',
      icon: TrendingUp,
      toneColor: '#A8D62E', // lime-deep — pozitif/nötr trend
      toneBg: '#EAF9B8',
      body: trend,
    },
    {
      key: 'win',
      labelTr: 'KAZANIM',
      labelEn: 'WIN',
      icon: Award,
      toneColor: '#16A34A', // green — net pozitif
      toneBg: '#DCFCE7',
      body: win,
    },
    {
      key: 'risk',
      labelTr: 'RİSK',
      labelEn: 'RISK',
      icon: AlertTriangle,
      toneColor: '#DC2626', // red — uyarı
      toneBg: '#FEE2E2',
      body: risk,
    },
  ];

  // En az bir alan dolu olmalı; tüm 3'ü boş ise kart render edilmez.
  const visibleRows = rows.filter((r) => r.body.trim().length > 0);
  if (visibleRows.length === 0) return null;

  const eyebrow = eyebrowLabel ?? (isTr ? 'AI İÇGÖRÜLER · BU HAFTA' : 'AI INSIGHTS · THIS WEEK');

  return (
    <section className="bz-card p-5 sm:p-6" aria-label={eyebrow}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF9B8] border border-[#C6F24E]"
          >
            <Sparkles size={13} className="text-[#0A0A0A]" strokeWidth={2.2} />
          </span>
          <h3 className="pulse-eyebrow text-[10.5px] text-[#737373]">{eyebrow}</h3>
        </div>
        <span className="bz-mono text-[10px] text-[#A3A3A3] uppercase tracking-wider">
          {isTr ? 'haftalık özet' : 'weekly summary'}
        </span>
      </header>
      <ol className="flex flex-col gap-2.5">
        {visibleRows.map((r) => {
          const Icon = r.icon;
          return (
            <li
              key={r.key}
              className="flex items-start gap-3 rounded-[10px] bg-[#FAFAFA] p-3.5"
              style={{ borderLeft: `2px solid ${r.toneColor}` }}
            >
              <span
                aria-hidden="true"
                className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md"
                style={{ background: '#FFFFFF', border: `1px solid ${r.toneColor}40` }}
              >
                <Icon size={13} strokeWidth={2.2} style={{ color: r.toneColor }} />
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="pulse-eyebrow text-[10px] mb-1"
                  style={{ color: r.toneColor }}
                >
                  {isTr ? r.labelTr : r.labelEn}
                </div>
                <p className="text-[12.5px] leading-[1.55] text-[#0A0A0A]">{r.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default AiInsightsCard;
