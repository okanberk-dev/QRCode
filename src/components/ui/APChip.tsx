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
  default: { bg: 'var(--color-pn-canvas)', fg: 'var(--color-pn-ink)', dot: 'var(--color-pn-ink)' },
  lime: { bg: 'var(--color-pn-accent)', fg: '#000000', dot: '#000000' },
  success: { bg: '#ECF7E6', fg: '#3A8228', dot: '#3A8228' },
  warn: { bg: '#FFF6DB', fg: '#8A5A00', dot: '#D99A00' },
  danger: { bg: '#FDECEC', fg: '#B42318', dot: '#E5484D' },
  info: { bg: '#EAF1FD', fg: '#1D4ED8', dot: '#3B82F6' },
  dark: { bg: 'var(--color-pn-ink)', fg: '#ffffff', dot: 'var(--color-pn-accent)' },
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
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${className}`}
      style={{ background: t.bg, color: t.fg }}
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
          <X size={12} color={t.fg} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
