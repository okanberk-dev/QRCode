import { Sparkles, TrendingUp, Award, AlertTriangle } from 'lucide-react';

// Phase 8c+ §38.34 — AI İÇGÖRÜLER · BU HAFTA dark card. Tasarım kaynağı:
// .design-owner-2026/project/page-analytics.jsx line 285-315 (3-row dark
// card: TREND / KAZANIM / RİSK).
//
// Server-friendly (data prop). 3 alan boş ise kart gizli (kullanıcı kararı,
// CLAUDE.md §38.34: structured insight extract fail → fallback empty → UI
// kart render etmez). Min 1 alan dolu olmalı.

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
  color: string;
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
      color: '#C6F24E',
      body: trend,
    },
    {
      key: 'win',
      labelTr: 'KAZANIM',
      labelEn: 'WIN',
      icon: Award,
      color: '#A8D62E',
      body: win,
    },
    {
      key: 'risk',
      labelTr: 'RİSK',
      labelEn: 'RISK',
      icon: AlertTriangle,
      color: '#FCA5A5',
      body: risk,
    },
  ];

  // En az bir alan dolu olmalı; tüm 3'ü boş ise kart render edilmez.
  const visibleRows = rows.filter((r) => r.body.trim().length > 0);
  if (visibleRows.length === 0) return null;

  const eyebrow = eyebrowLabel ?? (isTr ? 'AI İÇGÖRÜLER · BU HAFTA' : 'AI INSIGHTS · THIS WEEK');

  return (
    <section
      className="rounded-2xl bg-[#0A0A0A] text-white p-5 sm:p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.4)]"
      aria-label={eyebrow}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C6F24E]/15 border border-[#C6F24E]/30"
          >
            <Sparkles size={13} className="text-[#C6F24E]" strokeWidth={2.2} />
          </span>
          <h3
            className="pulse-eyebrow text-[10.5px]"
            style={{ color: '#C6F24E' }}
          >
            {eyebrow}
          </h3>
        </div>
        <span className="bz-mono text-[10px] text-white/50 uppercase tracking-wider">
          {isTr ? 'haftalık özet' : 'weekly summary'}
        </span>
      </header>
      <ol className="flex flex-col gap-3">
        {visibleRows.map((r) => {
          const Icon = r.icon;
          return (
            <li
              key={r.key}
              className="flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/10 p-3.5"
            >
              <span
                aria-hidden="true"
                className="shrink-0 inline-flex h-8 w-16 items-center justify-center gap-1.5 rounded-md bg-white/5 text-[10.5px] font-semibold"
                style={{ color: r.color }}
              >
                <Icon size={11} strokeWidth={2.4} />
                {isTr ? r.labelTr : r.labelEn}
              </span>
              <p className="flex-1 min-w-0 text-[12.5px] leading-[1.55] text-white/95">
                {r.body}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default AiInsightsCard;
