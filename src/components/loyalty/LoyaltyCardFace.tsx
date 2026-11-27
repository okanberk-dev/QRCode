// The loyalty card itself (CLAUDE.md §60) — one renderer for the panel
// preview, the counter screen and the customer's card page, so what the
// owner designs is exactly what the customer sees. No hooks, no fetch.
import { Check, Gift } from 'lucide-react';
import {
  formatMemberCode,
  nextReward,
  stampCardSize,
  unitLabel,
  type LoyaltyKind,
  type LoyaltyRewardLike,
} from '@/lib/loyalty';

// Buaze default when the business picked no card colour; a chosen colour wins.
const DEFAULT_BG = '#111110';
const INK = '#111110';

function isLight(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4;
}

export interface LoyaltyCardFaceProps {
  businessName: string;
  programName: string;
  kind: LoyaltyKind;
  balance: number;
  rewards: LoyaltyRewardLike[];
  accentColor?: string | null;
  memberName?: string | null;
  code?: string | null;
  tierName?: string | null;
  locale: 'tr' | 'en';
  className?: string;
  /** Stamps from this index on land with the stamp animation (customer card page, §61). */
  highlightFrom?: number | null;
  /** A soft light sweep over the card (customer pages). */
  shine?: boolean;
}

export function LoyaltyCardFace({
  businessName,
  programName,
  kind,
  balance,
  rewards,
  accentColor,
  memberName,
  code,
  tierName,
  locale,
  className = '',
  highlightFrom = null,
  shine = false,
}: LoyaltyCardFaceProps) {
  const tr = locale === 'tr';
  const bg = accentColor && /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : DEFAULT_BG;
  const light = isLight(bg);
  const fg = light ? INK : '#FFFFFF';
  // Opacities keep small text at 4.5:1 on the card colour (white on purple ≈ 5:1).
  const muted = light ? 'rgba(17,17,16,0.66)' : 'rgba(255,255,255,0.78)';
  // Filled stamps and badges: the text colour as fill, the card colour as ink.
  const mark = fg;
  const markFg = bg;
  const next = nextReward(balance, rewards);
  const ready = rewards.some((r) => r.isActive !== false && r.cost <= balance);

  const size = stampCardSize(rewards);
  const filled = Math.min(balance, size);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[24px] p-5 shadow-[0_18px_36px_-22px_rgba(17,17,16,0.45)] ${className}`}
      style={{ background: bg, color: fg }}
      role="img"
      aria-label={
        kind === 'stamps'
          ? tr
            ? `${programName}: ${balance} / ${size} damga`
            : `${programName}: ${balance} of ${size} stamps`
          : tr
            ? `${programName}: ${balance} puan`
            : `${programName}: ${balance} points`
      }
    >
      {shine && (
        <span
          aria-hidden="true"
          className="bzl-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)' }}
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-[0.14]"
        style={{ background: mark }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium" style={{ color: muted }}>
            {businessName}
          </p>
          <p className="mt-1 truncate text-[19px] font-semibold leading-tight">{programName}</p>
        </div>
        {tierName ? (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: mark, color: markFg }}
          >
            {tierName}
          </span>
        ) : (
          <Gift size={20} aria-hidden="true" style={{ color: mark }} />
        )}
      </div>

      {kind === 'stamps' ? (
        <div
          className="relative mt-5 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size <= 6 ? size : size <= 12 ? Math.ceil(size / 2) : Math.ceil(size / 3)}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {Array.from({ length: size }).map((_, i) => {
            const on = i < filled;
            const landing = on && highlightFrom !== null && i >= highlightFrom;
            return (
              <span
                key={i}
                className={`flex aspect-square items-center justify-center rounded-full border text-[11px] font-semibold ${landing ? 'bzl-stamp-in' : ''}`}
                style={{
                  animationDelay: landing ? `${(i - (highlightFrom ?? 0)) * 120}ms` : undefined,
                  borderColor: on ? mark : light ? 'rgba(17,17,16,0.28)' : 'rgba(255,255,255,0.4)',
                  background: on ? mark : 'transparent',
                  color: on ? markFg : muted,
                }}
              >
                {on ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="relative mt-5" aria-hidden="true">
          <p className={`text-[40px] font-semibold leading-none tabular-nums ${highlightFrom !== null ? 'bzl-pop' : ''}`}>
            {balance.toLocaleString(tr ? 'tr-TR' : 'en-GB')}
            <span className="ml-2 text-[14px] font-medium" style={{ color: muted }}>
              {unitLabel('points', balance, locale)}
            </span>
          </p>
          {next && (
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full"
              style={{
                // Hatched remainder: what is still to collect.
                background: `repeating-linear-gradient(-45deg, ${light ? 'rgba(17,17,16,0.22)' : 'rgba(255,255,255,0.34)'} 0 1.5px, transparent 1.5px 5px)`,
              }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.round((balance / next.reward.cost) * 100))}%`, background: mark }}
              />
            </div>
          )}
        </div>
      )}

      <div className="relative mt-4 flex items-end justify-between gap-3 text-[12px]">
        <p className="min-w-0 truncate" style={{ color: muted }}>
          {ready
            ? tr
              ? 'Ödülünüz hazır — kasada gösterin'
              : 'Your reward is ready — show it at the counter'
            : next
              ? tr
                ? `${next.remaining} ${unitLabel(kind, next.remaining, locale)} sonra: ${next.reward.title}`
                : `${next.remaining} more ${unitLabel(kind, next.remaining, locale)}: ${next.reward.title}`
              : ''}
        </p>
        {(memberName || code) && (
          <p className="shrink-0 text-right" style={{ color: muted }}>
            {memberName && <span className="block truncate font-medium" style={{ color: fg }}>{memberName}</span>}
            {code && <span className="font-medium tabular-nums tracking-[0.06em]">{formatMemberCode(code)}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoyaltyCardFace;
