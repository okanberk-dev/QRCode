
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

  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`}>
      <header className="mb-3.5">
        <span className="text-[13px] font-medium text-[#525252]">{isTr ? 'Kanal dağılımı' : 'Channels'}</span>
        {caption && <p className="mt-1 text-[12px] text-[#737373]">{caption}</p>}
      </header>
      <ul className="flex flex-col gap-2.5">
        {sorted.map((c) => {
          const pct = total > 0 ? (c.count / total) * 100 : 0;
          return (
            <li key={c.platform} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="shrink-0 inline-block h-2 w-2 rounded-full"
                style={{ background: c.color }}
              />
              <span className="text-[13px] font-medium text-pn-ink min-w-[100px] truncate">
                {c.label}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-pn-canvas overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, pct)}%`, background: c.color }}
                />
              </div>
              <span className="tabular-nums text-[12px] text-[#737373] tabular-nums shrink-0 w-[78px] text-right">
                {c.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')} ·{' '}
                {isTr ? `%${Math.round(pct)}` : `${Math.round(pct)}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ChannelDistributionMini;
