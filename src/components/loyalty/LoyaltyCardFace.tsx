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

const DEFAULT_BG = '#0A0A0A';
const LIME = '#C6F24E';

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
}: LoyaltyCardFaceProps) {
  const tr = locale === 'tr';
  const bg = accentColor && /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : DEFAULT_BG;
  const light = isLight(bg);
  const fg = light ? '#0A0A0A' : '#FFFFFF';
  const muted = light ? 'rgba(10,10,10,0.6)' : 'rgba(255,255,255,0.65)';
  const mark = bg === DEFAULT_BG ? LIME : fg;
  const markFg = bg === DEFAULT_BG ? '#0A0A0A' : bg;
  const next = nextReward(balance, rewards);
  const ready = rewards.some((r) => r.isActive !== false && r.cost <= balance);

  const size = stampCardSize(rewards);
  const filled = Math.min(balance, size);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[20px] p-5 shadow-[0_18px_40px_-18px_rgba(10,10,10,0.45)] ${className}`}
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: muted }}>
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
          className="mt-5 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size <= 6 ? size : size <= 12 ? Math.ceil(size / 2) : Math.ceil(size / 3)}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {Array.from({ length: size }).map((_, i) => {
            const on = i < filled;
            return (
              <span
                key={i}
                className="flex aspect-square items-center justify-center rounded-full border text-[11px] font-semibold"
                style={{
                  borderColor: on ? mark : light ? 'rgba(10,10,10,0.25)' : 'rgba(255,255,255,0.28)',
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
        <div className="mt-5" aria-hidden="true">
          <p className="text-[40px] font-semibold leading-none tabular-nums">
            {balance.toLocaleString(tr ? 'tr-TR' : 'en-GB')}
            <span className="ml-2 text-[14px] font-medium" style={{ color: muted }}>
              {unitLabel('points', balance, locale)}
            </span>
          </p>
          {next && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: light ? 'rgba(10,10,10,0.12)' : 'rgba(255,255,255,0.18)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.round((balance / next.reward.cost) * 100))}%`, background: mark }}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3 text-[12px]">
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
            {code && <span className="font-mono tracking-[0.12em]">{formatMemberCode(code)}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoyaltyCardFace;
