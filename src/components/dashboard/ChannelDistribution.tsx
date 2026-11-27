import { Star } from 'lucide-react';
import { PanoNumber } from '@/components/panel/pano/PanoNumber';
import { PLATFORMS } from '@/components/ui';

// Phase 8c+ §38.31 — KANAL DAĞILIMI 4-card grid. Tasarım kaynağı:
// .design-owner-2026/project/page-dashboard.jsx ChannelCard line 134-157.
// Mobile horizontal scroll, sm+ fill grid (CLAUDE.md §38.28 paterni reuse).
//
// Google card'da ek "impact strip" — initialGoogleRating → currentGoogleRating
// karşılaştırması (CLAUDE.md §37.3). null-safe; impact set olmamış restoran
// için strip gizlenir, normal card render edilir.

export interface ChannelStat {
  /** Platform key — mevcut PLATFORMS config (CLAUDE.md §5) ile eşleşir. */
  platform: string;
  /** Tek satırlık adı (örn. "Google", "Yemeksepeti"). */
  label: string;
  /** Toplam yorum sayısı (all-time veya scope window). */
  count: number;
  /** Ortalama puan (0-5). 0 ise "—" render edilir. */
  avgRating: number;
  /** Önceki window ile fark (örn. +0.1, -0.2). null → render gizli. */
  delta?: number | null;
}

export interface GoogleImpact {
  /** Buaze bağlanmadan önceki Google puanı. */
  initial: number;
  /** Şu anki Google puanı (cron tarafından update — CLAUDE.md §37.3). */
  current: number;
  /** current - initial, 1 ondalık yuvarlanmış. */
  diff: number;
}

export interface ChannelDistributionProps {
  channels: ChannelStat[];
  /** Card title (rendered inside the card). */
  title?: string;
  /** Sadece Google card'da render edilir; null ise impact strip gizli. */
  googleImpact?: GoogleImpact | null;
  isTr?: boolean;
}

const PLATFORM_META: Record<string, { tone: string; short: string }> = {
  google: { tone: '#4285F4', short: 'G' },
  yemeksepeti: { tone: '#FA0050', short: 'YS' },
  getir: { tone: '#5D3EBC', short: 'G' },
  trendyol_go: { tone: '#F27A1A', short: 'TY' },
  tripadvisor: { tone: '#34E0A1', short: 'TA' },
  airbnb: { tone: '#FF5A5F', short: 'AB' },
  booking: { tone: '#003580', short: 'BC' },
  yandex: { tone: '#FFCC00', short: 'YA' },
  zomato: { tone: '#E23744', short: 'Z' },
};

/** Segment colours, in order (Fintora breakdown: black, light green, ink, greys). */
const SEGMENT_COLORS = ['#78FC90', '#111110', '#111110', '#C9C9CF', '#E0E0E0'];

/**
 * Where customers were sent (Pano, docs/design/DASHBOARD_DESIGN.md §5.4,
 * Fintora "Portfolio Breakdown"): a slim segmented bar — each platform's
 * share of the redirects — over grey rows: platform circle, name over a
 * grey count/share line, average rating with a grey fraction on the right.
 */
export function ChannelDistribution({ channels, title, googleImpact = null, isTr = true }: ChannelDistributionProps) {
  if (channels.length === 0) return null;
  const shown = channels.slice(0, 5);
  const total = shown.reduce((sum, c) => sum + c.count, 0);
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const fmtRating = (n: number) => (isTr ? n.toFixed(1).replace('.', ',') : n.toFixed(1));

  return (
    <div className="bz-card p-5 sm:p-6">
      {title && (
        <div className="mb-4">
          <h2 className="pn-card-title text-pn-ink">{title}</h2>
          {total > 0 && (
            <p className="mt-1 text-[13px] text-[#9A9A9A]">
              {fmt(total)} {isTr ? 'yönlendirme' : total === 1 ? 'redirect' : 'redirects'}
            </p>
          )}
        </div>
      )}
      {total > 0 && (
        <div className="mb-4 flex h-2.5 gap-1" aria-hidden="true">
          {shown
            .filter((c) => c.count > 0)
            .map((c, i) => (
              <span
                key={c.platform}
                className="h-full min-w-[8px] rounded-full transition-[flex-grow] duration-700"
                style={{ flexGrow: c.count, background: SEGMENT_COLORS[i] ?? SEGMENT_COLORS[SEGMENT_COLORS.length - 1] }}
              />
            ))}
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {shown.map((c, i) => {
          const meta = PLATFORM_META[c.platform] ?? { tone: '#000', short: c.label.charAt(0).toUpperCase() };
          const fullLabel = (PLATFORMS as Record<string, { label: string }>)[c.platform]?.label ?? c.label;
          const share = total > 0 ? Math.round((c.count / total) * 100) : 0;
          const impact = c.platform === 'google' && googleImpact && Math.abs(googleImpact.diff) >= 0.05 ? googleImpact : null;
          const delta = c.delta !== null && c.delta !== undefined && Math.abs(c.delta) >= 0.05 ? c.delta : null;
          return (
            <li key={c.platform} className="pn-row min-h-[64px]">
              <span aria-hidden="true" className="pn-row-icon relative">
                {meta.short}
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white"
                  style={{ background: SEGMENT_COLORS[i] ?? '#E0E0E0' }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-pn-ink">{fullLabel}</span>
                <span className="block truncate text-[13px] text-[#9A9A9A]">
                  {fmt(c.count)} {isTr ? 'yönlendirme' : c.count === 1 ? 'redirect' : 'redirects'}
                  {total > 0 ? (isTr ? ` · %${share}` : ` · ${share}%`) : ''}
                  {impact ? ` · Google ${fmtRating(impact.initial)} → ${fmtRating(impact.current)}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                {c.avgRating > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[17px] text-pn-ink">
                    <Star size={14} className="text-pn-accent" fill="currentColor" aria-hidden="true" />
                    <PanoNumber value={fmtRating(c.avgRating)} locale={isTr ? 'tr' : 'en'} />
                  </span>
                ) : (
                  <span className="text-[14px] text-[#9A9A9A]">—</span>
                )}
                {delta !== null && (
                  <span className={`text-[12px] tabular-nums ${delta > 0 ? 'text-[#23863A]' : 'text-[#D92D20]'}`}>
                    {delta > 0 ? '+' : ''}
                    {fmtRating(delta)}★
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ChannelDistribution;
