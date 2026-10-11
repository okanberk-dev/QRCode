import { AlertTriangle, CheckCircle2, CircleDashed, Lock, PowerOff, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeKind } from '@/components/ui';
import type { PlatformLinkState } from '@/lib/platform-link-status';

const STATE_META: Record<
  PlatformLinkState,
  { kind: BadgeKind; Icon: LucideIcon; tr: string; en: string }
> = {
  connected: { kind: 'ok', Icon: CheckCircle2, tr: 'Bağlı', en: 'Connected' },
  issue: { kind: 'danger', Icon: AlertTriangle, tr: 'Sorunlu', en: 'Needs attention' },
  missing: { kind: 'ghost', Icon: CircleDashed, tr: 'Eksik', en: 'Not added' },
  off: { kind: 'off', Icon: PowerOff, tr: 'Kapalı', en: 'Off' },
  locked: { kind: 'off', Icon: Lock, tr: 'Kapalı', en: 'Off' },
};

export function platformStateLabel(state: PlatformLinkState, locale: 'tr' | 'en'): string {
  const meta = STATE_META[state];
  return locale === 'tr' ? meta.tr : meta.en;
}

export function PlatformStateIcon({ state, size = 12 }: { state: PlatformLinkState; size?: number }) {
  const { Icon } = STATE_META[state];
  return <Icon size={size} strokeWidth={2.2} aria-hidden="true" />;
}

/**
 * Link status pill — always icon + text (never colour alone, WCAG 1.4.1).
 * The visually hidden "Durum:" prefix gives screen readers context when the
 * pill is read on its own (e.g. inside a list row).
 */
export function PlatformStatusPill({
  state,
  locale,
  className = '',
}: {
  state: PlatformLinkState;
  locale: 'tr' | 'en';
  className?: string;
}) {
  const meta = STATE_META[state];
  const isTr = locale === 'tr';
  return (
    <Badge
      kind={meta.kind}
      dot={false}
      className={`shrink-0 ${className}`}
      // `off` / `ghost` badge text (#737373 on #F2F2F2) is ~4.2:1 — darken to
      // #525252 so the 11px label clears 4.5:1.
      style={meta.kind === 'off' || meta.kind === 'ghost' ? { color: '#525252' } : undefined}
    >
      <meta.Icon size={12} strokeWidth={2.2} aria-hidden="true" />
      <span className="sr-only">{isTr ? 'Durum: ' : 'Status: '}</span>
      {isTr ? meta.tr : meta.en}
    </Badge>
  );
}

export default PlatformStatusPill;
