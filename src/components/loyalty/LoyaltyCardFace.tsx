// The loyalty card itself (CLAUDE.md §60) — one renderer for the panel
// preview, the counter screen, the customer's card page and the marketing
// page, so what the owner designs is exactly what the customer sees. No
// hooks, no fetch. Static look is inline (no CSS file needed): only the
// optional `bzl-*` motion classes come from loyalty-motion.css.
import { Check, Gift } from 'lucide-react';
import {
  formatMemberCode,
  nextReward,
  stampCardSize,
  unitLabel,
  type LoyaltyKind,
  type LoyaltyRewardLike,
} from '@/lib/loyalty';
import { BUAZE_LIME, GRAIN_IMAGE, INK, alpha, contrast, inkOn, isHexColor, mix } from './portal-colors';

// Buaze default when the business picked no card colour: black card with
// lime stamps (§64). A colour the business chose always wins (its data).
const DEFAULT_BG = '#111110';
// A hand-pressed stamp is never perfectly straight.
const TILT = [-8, 5, -3, 7, -5, 3, -7, 6, -2, 4];
const HEADING_FONT = "var(--font-space-grotesk), var(--font-inter), system-ui, sans-serif";
const CODE_FONT = "var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace";

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

/** Columns of the stamp grid: one row up to 5, two rows up to 12, then three. */
function stampColumns(size: number): number {
  if (size <= 5) return size;
  if (size <= 12) return Math.ceil(size / 2);
  return Math.ceil(size / 3);
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
  const custom = isHexColor(accentColor);
  const bg = custom ? accentColor : DEFAULT_BG;
  const fg = inkOn(bg);
  const light = fg === INK;
  // A colour close to the black/white crossover gets a flatter gradient and
  // stronger secondary text, so small text keeps ~4.5:1 everywhere.
  const roomy = contrast(fg, bg) >= 7;
  const muted = light ? `rgba(17,17,16,${roomy ? 0.68 : 0.78})` : `rgba(255,255,255,${roomy ? 0.78 : 0.88})`;
  const top = mix(bg, '#FFFFFF', light ? 0.2 : roomy ? 0.1 : 0.03);
  const bottom = mix(bg, '#000000', light ? (roomy ? 0.1 : 0.04) : 0.18);
  // Filled stamps: the card's text colour as ink (lime on the Buaze default).
  const mark = custom ? fg : BUAZE_LIME;
  const markFg = custom ? bg : INK;

  const activeCosts = new Set(rewards.filter((r) => r.isActive !== false).map((r) => r.cost));
  const next = nextReward(balance, rewards);
  const ready = rewards.some((r) => r.isActive !== false && r.cost <= balance);
  const size = stampCardSize(rewards);
  const filled = Math.min(balance, size);
  const cols = stampColumns(size);

  const footerText = ready
    ? tr
      ? 'Ödülünüz hazır — kasada gösterin'
      : 'Your reward is ready — show it at the counter'
    : next
      ? tr
        ? `${next.remaining} ${unitLabel(kind, next.remaining, locale)} sonra: ${next.reward.title}`
        : `${next.remaining} more ${unitLabel(kind, next.remaining, locale)}: ${next.reward.title}`
      : '';

  return (
    <div
      className={`relative isolate w-full overflow-hidden rounded-[22px] p-5 ${className}`}
      style={{
        background: `linear-gradient(140deg, ${top} 0%, ${bg} 46%, ${bottom} 100%)`,
        color: fg,
        boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', light ? 0.45 : 0.14)}, 0 1px 2px rgba(0,0,0,0.08), 0 12px 24px -14px rgba(0,0,0,0.38), 0 30px 56px -32px rgba(0,0,0,0.5)`,
      }}
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
      {/* Grain + a stamp-ring motif: tactile, quiet, in the card's own ink. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ backgroundImage: GRAIN_IMAGE, opacity: light ? 0.07 : 0.1, mixBlendMode: 'soft-light' }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-14 -top-16 -z-10 h-[190px] w-[190px]"
        fill="none"
        stroke={fg}
        style={{ opacity: light ? 0.12 : 0.1 }}
      >
        <circle cx="100" cy="100" r="96" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="78" strokeWidth="1.5" strokeDasharray="2 5" />
        <circle cx="100" cy="100" r="60" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="42" strokeWidth="1.5" strokeDasharray="2 5" />
      </svg>
      {shine && (
        <span
          aria-hidden="true"
          className="bzl-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{ background: `linear-gradient(90deg, transparent, ${alpha('#FFFFFF', light ? 0.32 : 0.2)}, transparent)` }}
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium" style={{ color: muted }}>
            {businessName}
          </p>
          <p
            className="mt-0.5 truncate text-[20px] font-medium leading-tight tracking-[-0.02em]"
            style={{ fontFamily: HEADING_FONT }}
          >
            {programName}
          </p>
        </div>
        {tierName ? (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: mark, color: markFg }}>
            {tierName}
          </span>
        ) : kind === 'stamps' ? (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums"
            style={{ background: alpha(fg, 0.14), color: fg }}
            aria-hidden="true"
          >
            {filled}/{size}
          </span>
        ) : (
          <Gift size={20} aria-hidden="true" style={{ color: mark }} />
        )}
      </div>

      {kind === 'stamps' ? (
        <div
          className="relative mt-5 grid gap-x-2 gap-y-2.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {Array.from({ length: size }).map((_, i) => {
            const on = i < filled;
            const landing = on && highlightFrom !== null && i >= highlightFrom;
            const rewardSlot = activeCosts.has(i + 1);
            return (
              <span key={i} className="flex items-center justify-center">
                <span
                  className={`relative flex aspect-square w-full max-w-[46px] items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${landing ? 'bzl-stamp-in' : ''}`}
                  style={
                    on
                      ? {
                          animationDelay: landing ? `${(i - (highlightFrom ?? 0)) * 120}ms` : undefined,
                          background: mark,
                          color: markFg,
                          boxShadow: `inset 0 0 0 2.5px ${alpha(markFg, 0.16)}, 0 2px 6px -2px rgba(0,0,0,${light ? 0.25 : 0.45})`,
                        }
                      : rewardSlot
                        ? {
                            border: `1.5px dashed ${alpha(fg, 0.5)}`,
                            color: muted,
                          }
                        : {
                            background: alpha(fg, light ? 0.07 : 0.08),
                            boxShadow: `inset 0 1px 2px rgba(0,0,0,${light ? 0.14 : 0.4}), inset 0 0 0 1px ${alpha(fg, 0.12)}`,
                            color: muted,
                          }
                  }
                >
                  <span className="flex items-center justify-center" style={{ transform: on ? `rotate(${TILT[i % TILT.length]}deg)` : undefined }}>
                    {rewardSlot ? (
                      <Gift size={on ? 16 : 15} strokeWidth={on ? 2.4 : 2} />
                    ) : on ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      i + 1
                    )}
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      ) : (
        <div className="relative mt-5" aria-hidden="true">
          <p
            className={`text-[44px] font-medium leading-none tracking-[-0.03em] tabular-nums ${highlightFrom !== null ? 'bzl-pop' : ''}`}
            style={{ fontFamily: HEADING_FONT }}
          >
            {balance.toLocaleString(tr ? 'tr-TR' : 'en-GB')}
            <span className="ml-2 text-[14px] font-medium tracking-normal" style={{ color: muted, fontFamily: 'inherit' }}>
              {unitLabel('points', balance, locale)}
            </span>
          </p>
          {next && (
            <div
              className="mt-3.5 h-2 w-full overflow-hidden rounded-full"
              style={{
                // Hatched remainder: what is still to collect.
                background: `repeating-linear-gradient(-45deg, ${light ? 'rgba(17,17,16,0.22)' : 'rgba(255,255,255,0.32)'} 0 1.5px, transparent 1.5px 5px)`,
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

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <p className="min-w-0 text-[12.5px] leading-snug" style={{ color: ready ? fg : muted, fontWeight: ready ? 600 : 400 }}>
          {footerText}
        </p>
        {(memberName || code) && (
          <p className="shrink-0 text-right leading-tight">
            {memberName && (
              <span className="block max-w-[140px] truncate text-[13px] font-semibold" style={{ color: fg }}>
                {memberName}
              </span>
            )}
            {code && (
              <span className="mt-0.5 block text-[12px] font-medium tracking-[0.08em]" style={{ color: muted, fontFamily: CODE_FONT }}>
                {formatMemberCode(code)}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoyaltyCardFace;
