import { Star } from 'lucide-react';
import { PLATFORMS } from '@/components/ui';

// Phase 8c+ §38.31 — KANAL DAĞILIMI 4-card grid. Tasarım kaynağı:
// .design-owner-2026/project/page-dashboard.jsx ChannelCard line 134-157.
// Mobile horizontal scroll, sm+ 4-col grid (CLAUDE.md §38.28 paterni reuse).
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

function formatDelta(delta: number | null | undefined): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (delta === null || delta === undefined) return null;
  if (Math.abs(delta) < 0.05) return { text: '±0.0', tone: 'flat' };
  if (delta > 0) return { text: `+${delta.toFixed(1)}`, tone: 'up' };
  return { text: delta.toFixed(1), tone: 'down' };
}

function ChannelCard({
  channel,
  googleImpact,
  isTr,
}: {
  channel: ChannelStat;
  googleImpact?: GoogleImpact | null;
  isTr: boolean;
}) {
  const meta = PLATFORM_META[channel.platform] ?? { tone: '#A3A3A3', short: '?' };
  const fullLabel =
    (PLATFORMS as Record<string, { label: string }>)[channel.platform]?.label ??
    channel.label;
  const delta = formatDelta(channel.delta);
  const ratingDisplay = channel.avgRating > 0 ? channel.avgRating.toFixed(1) : '—';
  const ratingRound = channel.avgRating > 0 ? Math.round(channel.avgRating) : 0;
  const showImpact =
    channel.platform === 'google' &&
    googleImpact &&
    Math.abs(googleImpact.diff) >= 0.05;

  return (
    <div className="bz-card p-3.5 flex flex-col gap-2.5 shrink-0 w-[170px] sm:w-auto sm:shrink">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10.5px] font-semibold text-white"
            style={{ background: meta.tone }}
          >
            {meta.short}
          </span>
          <span className="text-[13px] font-semibold text-[#0A0A0A] truncate">
            {fullLabel}
          </span>
        </div>
        {delta && (
          <span
            className={`text-[10.5px] font-semibold tabular-nums shrink-0 ${
              delta.tone === 'up'
                ? 'text-[#16A34A]'
                : delta.tone === 'down'
                  ? 'text-[#DC2626]'
                  : 'text-[#737373]'
            }`}
          >
            {delta.text}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className="bz-mono tabular-nums"
            style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: '#0A0A0A' }}
          >
            {ratingDisplay}
          </span>
          <span className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={9}
                className={s <= ratingRound ? 'text-[#0A0A0A]' : 'text-[#EDEDED]'}
                fill={s <= ratingRound ? '#0A0A0A' : 'transparent'}
                strokeWidth={1.5}
              />
            ))}
          </span>
        </div>
        <span className="bz-mono text-[10.5px] text-[#737373] tabular-nums shrink-0">
          {channel.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
          {isTr ? 'yorum' : 'reviews'}
        </span>
      </div>

      {showImpact && googleImpact && (
        <div
          className="rounded-md border bz-mono text-[10.5px] flex items-center justify-between gap-1.5 px-2 py-1"
          style={{
            background: '#EAF9B8',
            borderColor: 'rgba(168, 214, 46, 0.4)',
            color: '#0A0A0A',
          }}
          aria-label={
            isTr
              ? `Buaze etkisi: önce ${googleImpact.initial.toFixed(1)}, şimdi ${googleImpact.current.toFixed(1)}`
              : `Buaze impact: was ${googleImpact.initial.toFixed(1)}, now ${googleImpact.current.toFixed(1)}`
          }
        >
          <span className="text-[#525252]">
            {isTr ? 'Önce' : 'Was'}{' '}
            <strong className="text-[#0A0A0A]">{googleImpact.initial.toFixed(1)}</strong>
            {' → '}
            {isTr ? 'şimdi' : 'now'}{' '}
            <strong className="text-[#0A0A0A]">{googleImpact.current.toFixed(1)}</strong>
          </span>
          <span
            className="font-semibold shrink-0"
            style={{ color: googleImpact.diff > 0 ? '#16A34A' : '#DC2626' }}
          >
            {googleImpact.diff > 0 ? '+' : ''}
            {googleImpact.diff.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
}

export function ChannelDistribution({
  channels,
  googleImpact = null,
  isTr = true,
}: ChannelDistributionProps) {
  if (channels.length === 0) return null;
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible">
      {channels.slice(0, 4).map((channel) => (
        <ChannelCard
          key={channel.platform}
          channel={channel}
          googleImpact={channel.platform === 'google' ? googleImpact : null}
          isTr={isTr}
        />
      ))}
    </div>
  );
}

export default ChannelDistribution;
