'use client';

/**
 * Stage 65 §38.146 — HANDOFF JSX prototip APChip (~70 satır).
 *
 * 7 tone (default/lime/success/warn/danger/info/dark) + opsiyonel dot +
 * removable + icon. Mevcut `<Badge>` primitive'inin (8 kind + dot) HANDOFF
 * eşdeğeri; ek olarak `removable` (X icon) + `icon` (lucide ReactNode)
 * desteği. PR1-3'te 57 dosya / Badge callsite kademeli migrate; PR6'da
 * Badge silinir (CLAUDE.md §34 + §38.49).
 *
 * Pulse §11 hex map (HANDOFF tone palette):
 *  - default: rgba(10,10,10,0.06) bg + #0A0A0A fg + dot graphite
 *  - lime: #EAF9B8 (lime-soft) + #3F5408 + dot lime-deep
 *  - success: rgba(34,197,94,0.12) + #15803D + dot #16A34A
 *  - warn: rgba(234,179,8,0.14) + #854D0E + dot #CA8A04
 *  - danger: rgba(220,38,38,0.10) + #991B1B + dot #DC2626
 *  - info: rgba(59,130,246,0.10) + #1E40AF + dot #3B82F6
 *  - dark: #0A0A0A bg + white + dot lime
 *
 * A11y: removable button explicit aria-label; chip span (informational).
 */

import { X } from 'lucide-react';
import { type ReactNode } from 'react';

export type APChipTone =
  | 'default'
  | 'lime'
  | 'success'
  | 'warn'
  | 'danger'
  | 'info'
  | 'dark';

export interface APChipProps {
  tone?: APChipTone;
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  removeAriaLabel?: string;
  className?: string;
}

const TONE_TOKENS: Record<APChipTone, { bg: string; fg: string; dot: string }> = {
  default: { bg: 'rgba(10,10,10,0.06)', fg: '#0A0A0A', dot: '#0A0A0A' },
  lime: { bg: '#EAF9B8', fg: '#3F5408', dot: '#A8D62E' },
  success: { bg: 'rgba(34,197,94,0.12)', fg: '#15803D', dot: '#16A34A' },
  warn: { bg: 'rgba(234,179,8,0.14)', fg: '#854D0E', dot: '#CA8A04' },
  danger: { bg: 'rgba(220,38,38,0.10)', fg: '#991B1B', dot: '#DC2626' },
  info: { bg: 'rgba(59,130,246,0.10)', fg: '#1E40AF', dot: '#3B82F6' },
  dark: { bg: '#0A0A0A', fg: '#ffffff', dot: '#C6F24E' },
};

export function APChip({
  tone = 'default',
  children,
  dot = false,
  icon,
  removable = false,
  onRemove,
  removeAriaLabel = 'Sil',
  className = '',
}: APChipProps) {
  const t = TONE_TOKENS[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${className}`}
      style={{
        background: t.bg,
        color: t.fg,
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      }}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: t.dot }}
        />
      ) : null}
      {icon}
      {children}
      {removable ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeAriaLabel}
          className="ml-0.5 inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current rounded-full"
        >
          <X size={9} color={t.fg} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
