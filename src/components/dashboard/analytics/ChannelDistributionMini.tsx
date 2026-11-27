
// Phase 8c+ §38.34 — KANAL DAĞILIMI mini variant (analytics rail).
// Tasarım kaynağı: .design-owner-2026/project/page-analytics.jsx line 220+
// (Google %71 / Buaze QR %24 / Yemeksepeti %4 / Tripadvisor %1).
//
// Mevcut ChannelDistribution (§38.31, dashboard'da 4-card grid) ile farklı
// UX — analytics page mini version: 4 platform progress bar list.
//
// QR feedback `platform = null` UI runtime label "Buaze QR" (kullanıcı kararı,
// CLAUDE.md §38.34): caller `channels` array içinde 'buaze_qr' key ile geçirir.

export interface ChannelMiniRow {
  /** Platform key (örn. 'google', 'yemeksepeti', 'buaze_qr'). */
  platform: string;
  /** UI label (locale-aware caller-side). */
  label: string;
  /** Toplam yorum sayısı (this period). */
  count: number;
  /** Brand color hex (CLAUDE.md §5 PROVIDER_DOMAINS). */
  color: string;
}

export interface ChannelDistributionMiniProps {
  channels: ChannelMiniRow[];
  isTr?: boolean;
  className?: string;
  /** Optional one-line note under the title (e.g. which reviews are counted). */
  caption?: string;
}

export function ChannelDistributionMini({
  channels,
  isTr = true,
  className = '',
  caption,
}: ChannelDistributionMiniProps) {
  if (channels.length === 0) return null;

  const total = channels.reduce((sum, c) => sum + c.count, 0);
  const sorted = [...channels].sort((a, b) => b.count - a.count);

  // Fintora breakdown list: name with a brand dot, count + share on the
  // right, a slim bar in the platform colour underneath.
  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`}>
      <header className="mb-4">
        <h2 className="pn-card-title text-pn-ink">{isTr ? 'Kanal dağılımı' : 'Channels'}</h2>
        {caption && <p className="mt-1 text-[13px] text-[#9A9A9A]">{caption}</p>}
      </header>
      <ul className="flex flex-col gap-3.5">
        {sorted.map((c) => {
          const pct = total > 0 ? (c.count / total) * 100 : 0;
          return (
            <li key={c.platform} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 text-[14px] font-medium text-pn-ink">
                  <span aria-hidden="true" className="pn-legend-dot" style={{ background: c.color }} />
                  <span className="truncate">{c.label}</span>
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-[#9A9A9A]">
                  <span className="font-medium text-pn-ink">{c.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}</span>
                  {' · '}
                  {isTr ? `%${Math.round(pct)}` : `${Math.round(pct)}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-pn-canvas">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, pct)}%`, background: c.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ChannelDistributionMini;
