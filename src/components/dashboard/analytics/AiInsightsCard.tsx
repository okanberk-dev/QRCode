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
    <section
      className="relative overflow-hidden rounded-[18px] bg-[#0A0A0A] p-5 sm:p-6 text-white"
      aria-label={eyebrow}
    >
      {/* Lime corner accent (Pulse signature) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#C6F24E]/10 blur-2xl"
      />
      <header className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'rgba(198,242,78,0.15)', border: '1px solid rgba(198,242,78,0.4)' }}
          >
            <Sparkles size={13} className="text-[#C6F24E]" strokeWidth={2.2} />
          </span>
          <h3 className="pulse-eyebrow text-[10.5px] text-[#C6F24E]">{eyebrow}</h3>
        </div>
        <span className="bz-mono text-[10px] uppercase tracking-wider text-white/55">
          {isTr ? 'haftalık özet' : 'weekly summary'}
        </span>
      </header>
      <ol className="relative flex flex-col gap-2.5">
        {visibleRows.map((r) => {
          const Icon = r.icon;
          return (
            <li
              key={r.key}
              className="flex items-start gap-3 rounded-[10px] p-3.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderLeft: `2px solid ${r.toneColor}`,
              }}
            >
              <span
                aria-hidden="true"
                className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md"
                style={{
                  background: '#1A1A1A',
                  border: `1px solid ${r.toneColor}55`,
                }}
              >
                <Icon size={13} strokeWidth={2.2} style={{ color: r.toneColor }} />
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className="pulse-eyebrow mb-1 text-[10px]"
                  style={{ color: r.toneColor }}
                >
                  {isTr ? r.labelTr : r.labelEn}
                </div>
                <p className="text-[12.5px] leading-[1.55] text-white/90">{r.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default AiInsightsCard;
