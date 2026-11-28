// Stage 66 §38.147 — HANDOFF AnalyticsDesktop sentiment donut (.design-owner-2026/
// page-analytics.jsx line 519-542 birebir + mobile line 723-741). SVG arc
// donut + center italic Space Grotesk pos% + mono uppercase "POZ" eyebrow +
// 3-row legend list.
//
// Pure presentational saf component. Data prop'tan direkt gelir (caller
// page.tsx feedback rating distribution'dan veya extractThemes aggregate'ten
// compute eder). 0 örneklem → graceful fallback (donut subtle gri ring).
//
// Fintora breakdown colours on a white card:
// - pos: black
// - neu: light green
// - neg: hatched grey — red would read as an alarm for a balanced mix

export interface SentimentDonutProps {
  /** 0-100 percentage values. pos + neu + neg = 100 olmalı (caller normalize). */
  pos: number;
  neu: number;
  neg: number;
  isTr?: boolean;
  /** Optional total sample count — legend altına "X yorum" hint gösterir. */
  totalSample?: number;
}

/** One arc of the ring, drawn with round caps and a small gap. */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/**
 * Rating mix on a white Pano card (docs/design/DASHBOARD_DESIGN.md §5.9,
 * Fintora breakdown): a thick ring — positive black, neutral light green,
 * negative hatched grey — with the positive share in the middle, and grey
 * breakdown rows beside it.
 */
export function SentimentDonut({ pos, neu, neg, isTr = true, totalSample }: SentimentDonutProps) {
  const hasData = pos + neu + neg > 0;
  const GAP = 10; // degrees between segments
  const parts = [
    { key: 'pos', v: pos, stroke: '#C6F24E', label: isTr ? 'Pozitif' : 'Positive' },
    { key: 'neu', v: neu, stroke: '#E3F4A6', label: isTr ? 'Nötr' : 'Neutral' },
    { key: 'neg', v: neg, stroke: 'url(#pn-donut-hatch)', label: isTr ? 'Negatif' : 'Negative' },
  ].filter((p) => p.v > 0);
  const usable = 360 - GAP * parts.length;
  let cursor = GAP / 2;
  const arcs = parts.map((p) => {
    const sweep = Math.max(2, (p.v / 100) * usable);
    const d = arcPath(60, 60, 44, cursor, cursor + sweep);
    cursor += sweep + GAP;
    return { ...p, d };
  });

  return (
    <section className="bz-card flex h-full flex-col p-5 sm:p-6" aria-label={isTr ? 'Puan dağılımı' : 'Rating mix'}>
      <header className="mb-4">
        <h2 className="pn-card-title text-pn-ink">{isTr ? 'Puan dağılımı' : 'Rating mix'}</h2>
        <p className="mt-1 text-[13px] text-[#9A9A9A]">{isTr ? 'Pozitif, nötr ve negatif puanlar' : 'Positive, neutral and negative ratings'}</p>
      </header>

      {hasData ? (
        <div className="flex flex-1 flex-col items-center gap-5 sm:flex-row sm:items-center">
          <svg viewBox="0 0 120 120" className="h-[160px] w-[160px] shrink-0" role="img" aria-label={`${Math.round(pos)}% ${isTr ? 'pozitif' : 'positive'}`}>
            <defs>
              <pattern id="pn-donut-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="#E3E3E6" />
                <line x1="0" y1="0" x2="0" y2="5" stroke="#B8B8BE" strokeWidth="2" />
              </pattern>
            </defs>
            {arcs.map((arc) => (
              <path key={arc.key} d={arc.d} fill="none" stroke={arc.stroke} strokeWidth="15" strokeLinecap="round" />
            ))}
            <text x="60" y="66" textAnchor="middle" fontSize="20" fontWeight="500" fill="#111110" fontFamily="var(--font-heading)">
              {Math.round(pos)}
              <tspan fill="#9A9A9A" fontSize="13">%</tspan>
            </text>
          </svg>

          <ul className="flex w-full flex-1 flex-col gap-2">
            {[
              { label: isTr ? 'Pozitif' : 'Positive', v: pos, swatch: 'bg-pn-accent' },
              { label: isTr ? 'Nötr' : 'Neutral', v: neu, swatch: 'bg-[#E3F4A6]' },
              { label: isTr ? 'Negatif' : 'Negative', v: neg, swatch: 'pn-hatch' },
            ].map((row) => (
              <li key={row.label} className="pn-row min-h-[48px] py-2.5">
                <span aria-hidden="true" className={`h-3 w-6 shrink-0 rounded-full ${row.swatch}`} />
                <span className="flex-1 text-[14px] text-pn-ink">{row.label}</span>
                <span className="text-[15px] font-medium tabular-nums text-pn-ink">
                  {Math.round(row.v)}
                  <span className="text-[#9A9A9A]">%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-[16px] bg-pn-canvas px-4 py-6 text-[14px] text-[#737373]">
          {isTr
            ? 'Bu dönemde puan yok. Puanlar geldikçe dağılım burada görünür.'
            : 'No ratings in this period. The breakdown appears as ratings come in.'}
        </p>
      )}

      {hasData && totalSample !== undefined && totalSample > 0 && (
        <p className="mt-auto pt-5 text-[13px] tabular-nums text-[#9A9A9A]">
          {isTr ? `${totalSample.toLocaleString('tr-TR')} puan üzerinden` : `Across ${totalSample.toLocaleString('en-US')} ratings`}
        </p>
      )}
    </section>
  );
}

export default SentimentDonut;
