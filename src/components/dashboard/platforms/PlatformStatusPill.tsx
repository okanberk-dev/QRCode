import { AlertTriangle, CheckCircle2, CircleDashed, Lock, PowerOff, type LucideIcon } from 'lucide-react';
import type { PlatformLinkState } from '@/lib/platform-link-status';

type Tone = 'ok' | 'danger' | 'neutral' | 'muted';

const STATE_META: Record<PlatformLinkState, { tone: Tone; Icon: LucideIcon; tr: string; en: string }> = {
  connected: { tone: 'ok', Icon: CheckCircle2, tr: 'Bağlı', en: 'Connected' },
  issue: { tone: 'danger', Icon: AlertTriangle, tr: 'Sorunlu', en: 'Needs attention' },
  missing: { tone: 'neutral', Icon: CircleDashed, tr: 'Eksik', en: 'Not added' },
  off: { tone: 'muted', Icon: PowerOff, tr: 'Kapalı', en: 'Off' },
  locked: { tone: 'muted', Icon: Lock, tr: 'Kapalı', en: 'Off' },
};

// Soft Fintora pills: tinted fill + text in the state colour, a small dot.
// Neutral states sit on a white pill with a hairline so they stay visible on
// the grey rows (desktop) and on the white rows (phones) alike. Every text
// colour clears 4.5:1 on its fill.
const TONE_CLASS: Record<Tone, { pill: string; dot: string }> = {
  ok: { pill: 'bg-[#E6F7EA] text-[#1F7A35]', dot: 'bg-[#23863A]' },
  danger: { pill: 'bg-[#FDECEC] text-[#C4271B]', dot: 'bg-[#D92D20]' },
  neutral: { pill: 'bg-white text-[#525252] shadow-[inset_0_0_0_1px_#E6E6E6]', dot: 'bg-[#A3A3A3]' },
  muted: { pill: 'bg-white text-[#666666] shadow-[inset_0_0_0_1px_#E6E6E6]', dot: 'bg-[#D4D4D4]' },
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
 * Link status pill — always dot + text (never colour alone, WCAG 1.4.1).
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
  const tone = TONE_CLASS[meta.tone];
  const isTr = locale === 'tr';
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-medium leading-none ${tone.pill} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
      <span className="sr-only">{isTr ? 'Durum: ' : 'Status: '}</span>
      {isTr ? meta.tr : meta.en}
    </span>
  );
}

export default PlatformStatusPill;
