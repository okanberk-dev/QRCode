// Stage 66 §38.147 — HANDOFF AnalyticsDesktop sentiment donut (.design-owner-2026/
// page-analytics.jsx line 519-542 birebir + mobile line 723-741). SVG arc
// donut + center italic Space Grotesk pos% + mono uppercase "POZ" eyebrow +
// 3-row legend list.
//
// Pure presentational saf component. Data prop'tan direkt gelir (caller
// page.tsx feedback rating distribution'dan veya extractThemes aggregate'ten
// compute eder). 0 örneklem → graceful fallback (donut subtle gri ring).
//
// Pulse §11:
// - pos: #C6F24E (Pulse signature lime)
// - neu: #D4D4D4 (n300 muted, HANDOFF birebir)
// - neg: #0A0A0A (graphite, HANDOFF birebir — donut'ta en koyu segment
//   "ağır" his verir; UI'da kırmızı çok agresif olur dengeli sentiment için)
//
// Synthetic italic Space Grotesk (CLAUDE.md §38.112 paterni reuse):
// Google Fonts italic variant kaynağı yok, browser oblique transform ~%85.

export interface SentimentDonutProps {
  /** 0-100 percentage values. pos + neu + neg = 100 olmalı (caller normalize). */
  pos: number;
  neu: number;
  neg: number;
  isTr?: boolean;
  /** Optional total sample count — legend altına "X yorum" hint gösterir. */
  totalSample?: number;
}

export function SentimentDonut({
  pos,
  neu,
  neg,
  isTr = true,
  totalSample,
}: SentimentDonutProps) {
  const hasData = pos + neu + neg > 0;

  // SVG arc geometry
  const r = 38;
  const c = 2 * Math.PI * r;

  // Segment lengths (cumulative offset for stroke-dashoffset rotation)
  const posLen = (pos / 100) * c;
  const neuLen = (neu / 100) * c;
  const negLen = (neg / 100) * c;

  return (
    <section className="bz-card flex h-full flex-col p-5 sm:p-6">
      <header className="mb-3">
        <span className="pulse-eyebrow text-[10px] text-[#737373]">
          {isTr ? 'DUYGU DAĞILIMI' : 'SENTIMENT BREAKDOWN'}
        </span>
        <div className="bz-h-tight mt-1 text-[16px] sm:text-[18px]">
          {isTr ? 'Pozitif · Nötr · Negatif' : 'Positive · Neutral · Negative'}
        </div>
      </header>

      {hasData ? (
        <div className="flex flex-1 items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-[110px] w-[110px] shrink-0">
            {/* Background ring (subtle outline if all zeros) */}
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#F5F5F5"
              strokeWidth="14"
            />
            {/* Positive segment — lime */}
            {pos > 0 && (
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#C6F24E"
                strokeWidth="14"
                strokeDasharray={`${posLen} ${c - posLen}`}
                strokeDashoffset={0}
                transform="rotate(-90 50 50)"
              />
            )}
            {/* Neutral segment — n300 */}
            {neu > 0 && (
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#D4D4D4"
                strokeWidth="14"
                strokeDasharray={`${neuLen} ${c - neuLen}`}
                strokeDashoffset={-posLen}
                transform="rotate(-90 50 50)"
              />
            )}
            {/* Negative segment — graphite (HANDOFF birebir) */}
            {neg > 0 && (
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="14"
                strokeDasharray={`${negLen} ${c - negLen}`}
                strokeDashoffset={-(posLen + neuLen)}
                transform="rotate(-90 50 50)"
              />
            )}
            {/* Center label — synthetic italic Space Grotesk pos% */}
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fontSize="20"
              fontFamily="var(--font-heading)"
              fontStyle="italic"
              fontWeight="500"
              fill="#0A0A0A"
              letterSpacing="-0.025em"
            >
              {Math.round(pos)}%
            </text>
            <text
              x="50"
              y="62"
              textAnchor="middle"
              fontSize="7"
              fontFamily="var(--font-mono)"
              fill="#737373"
              letterSpacing="2"
              fontWeight="700"
            >
              {isTr ? 'POZ' : 'POS'}
            </text>
          </svg>

          <ul className="flex flex-1 flex-col gap-2.5">
            {[
              {
                label: isTr ? 'Pozitif' : 'Positive',
                v: pos,
                color: '#C6F24E',
              },
              {
                label: isTr ? 'Nötr' : 'Neutral',
                v: neu,
                color: '#D4D4D4',
              },
              {
                label: isTr ? 'Negatif' : 'Negative',
                v: neg,
                color: '#0A0A0A',
              },
            ].map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2.5"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: s.color }}
                />
                <span className="flex-1 text-[12px] font-medium text-[#0A0A0A]">
                  {s.label}
                </span>
                <span className="bz-mono text-[11px] tabular-nums font-semibold text-[#0A0A0A]">
                  {Math.round(s.v)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[12px] text-[#737373]">
          {isTr
            ? 'Bu pencerede yorum yok. Yeterli yorum geldiğinde sentiment dağılımı burada görünür.'
            : 'No reviews in this window. Sentiment breakdown appears once enough reviews are collected.'}
        </p>
      )}

      {hasData && totalSample !== undefined && totalSample > 0 && (
        <p className="bz-mono mt-auto pt-3 text-[10.5px] text-[#737373]">
          {isTr
            ? `${totalSample.toLocaleString('tr-TR')} yorum üzerinden`
            : `Across ${totalSample.toLocaleString('en-US')} reviews`}
        </p>
      )}
    </section>
  );
}

export default SentimentDonut;
