// Stage 66 §38.147 — HANDOFF AnalyticsDesktop "EN ÇOK BAHSEDİLENLER"
// (.design-owner-2026/page-analytics.jsx line 590-635 birebir + mobile
// line 826-857). Top 5 theme list with polarity arrow (↑/↓/·) + count +
// progress bar.
//
// Polarity derive heuristic (saf helper):
// - pos% ≥ 60 → ↑ (green) — strong positive
// - pos% < 35 → ↓ (red) — strong negative
// - else → · (muted) — neutral / mixed
//
// extractThemes themes[] data direkt geçirilir. Polarity bilgisini saf
// helper compute eder; AI sentiment yoksa neutral fallback.
//
// Pure presentational. Server-friendly (data prop, useState yok).

export interface ThemeMention {
  theme: string;
  count: number;
  /** AI sentiment field (extractThemes v3+). Yoksa neutral kabul. */
  sentimentPositivePct?: number;
  sentimentNeutralPct?: number;
  sentimentNegativePct?: number;
}

export interface TopMentionsPolarityProps {
  themes: ThemeMention[];
  isTr?: boolean;
  /** Maksimum render edilecek theme sayısı (default 5, HANDOFF birebir). */
  limit?: number;
}

type Polarity = 'positive' | 'negative' | 'neutral';

/** Saf helper — pos% threshold'undan polarity derive. SSR + test friendly. */
export function derivePolarity(pos: number | undefined): Polarity {
  if (typeof pos !== 'number') return 'neutral';
  if (pos >= 60) return 'positive';
  if (pos < 35) return 'negative';
  return 'neutral';
}

const POLARITY_META: Record<
  Polarity,
  { arrow: string; arrowColor: string; barColor: string }
> = {
  positive: {
    arrow: '↑',
    arrowColor: '#22C55E',
    barColor: '#C6F24E',
  },
  negative: {
    arrow: '↓',
    arrowColor: '#EF4444',
    barColor: '#EF4444',
  },
  neutral: {
    arrow: '·',
    arrowColor: '#A3A3A3',
    barColor: '#D4D4D4',
  },
};

export function TopMentionsPolarity({
  themes,
  isTr = true,
  limit = 5,
}: TopMentionsPolarityProps) {
  const items = themes.slice(0, limit);
  const maxCount = items[0]?.count ?? 1;
  const hasData = items.length > 0;

  return (
    <section className="bz-card flex h-full flex-col p-5 sm:p-6">
      <header className="mb-3">
        <span className="pulse-eyebrow text-[10px] text-[#737373]">
          {isTr ? 'EN ÇOK BAHSEDİLENLER' : 'TOP MENTIONS'}
        </span>
        <div className="bz-h-tight mt-1 text-[16px] sm:text-[18px]">
          {isTr ? 'Konu trendi · pozitif/negatif' : 'Topic trend · positive/negative'}
        </div>
      </header>

      {hasData ? (
        <ul className="flex flex-1 flex-col gap-2.5">
          {items.map((t) => {
            const polarity = derivePolarity(t.sentimentPositivePct);
            const meta = POLARITY_META[polarity];
            const widthPct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
            return (
              <li key={t.theme}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-[#0A0A0A]">
                    <span
                      aria-hidden="true"
                      className="mr-1.5 font-bold"
                      style={{ color: meta.arrowColor }}
                    >
                      {meta.arrow}
                    </span>
                    {t.theme}
                  </span>
                  <span className="bz-mono text-[10.5px] tabular-nums font-semibold text-[#737373]">
                    {t.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                  </span>
                </div>
                <div
                  className="h-[5px] overflow-hidden rounded-full bg-[#F5F5F5]"
                  role="img"
                  aria-label={
                    isTr
                      ? `${t.theme}: ${t.count} bahsediş, ${
                          polarity === 'positive'
                            ? 'pozitif'
                            : polarity === 'negative'
                              ? 'negatif'
                              : 'nötr'
                        }`
                      : `${t.theme}: ${t.count} mentions, ${polarity}`
                  }
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${widthPct}%`,
                      background: meta.barColor,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[12px] text-[#737373]">
          {isTr
            ? 'Henüz yeterli yorum yok ya da AI servisi pasif. En az 4 metinli yoruma ulaşınca konu trendi burada görünür.'
            : 'Not enough comments yet, or AI service is paused. Topic trends appear once at least 4 text comments are collected.'}
        </p>
      )}
    </section>
  );
}

export default TopMentionsPolarity;
