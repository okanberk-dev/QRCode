import Link from 'next/link';
import { ArrowUpRight, Plus, Wrench, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui';
import {
  describePlatformLinkStatus,
  type PlatformLinkState,
  type PlatformLinkStatus,
} from '@/lib/platform-link-status';
import { PlatformLogo } from './PlatformLogo';
import { PlatformStatusPill } from './PlatformStatusPill';
import { ROW_CIRCLE } from './PlatformCard';

const ACTIONS: Record<
  PlatformLinkState,
  { tr: string; en: string; Icon: LucideIcon; tone: 'neutral' | 'add' | 'fix' } | null
> = {
  missing: { tr: 'Bağla', en: 'Add link', Icon: Plus, tone: 'add' },
  issue: { tr: 'Düzelt', en: 'Fix', Icon: Wrench, tone: 'fix' },
  connected: { tr: 'Yönet', en: 'Manage', Icon: ArrowUpRight, tone: 'neutral' },
  off: { tr: 'Yönet', en: 'Manage', Icon: ArrowUpRight, tone: 'neutral' },
  // Admin-gated platforms are read-only for the owner — no action button.
  locked: null,
};

export function platformWizardHref(locale: 'tr' | 'en', slug: string, restaurantId: string): string {
  return `/${locale}/dashboard/platforms/${slug}?restaurantId=${encodeURIComponent(restaurantId)}`;
}

export function platformRowActionLabel(state: PlatformLinkState, locale: 'tr' | 'en'): string | null {
  const action = ACTIONS[state];
  if (!action) return null;
  return locale === 'tr' ? action.tr : action.en;
}

/** Icon for a row's action circle (shared with the settings summary list). */
export function PlatformRowActionIcon({ state, size = 17 }: { state: PlatformLinkState; size?: number }) {
  const action = ACTIONS[state];
  if (!action) return null;
  const { Icon } = action;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" className="transition-transform duration-200" />;
}

/**
 * Classes for the row's action circle. The link stretches over the whole row
 * (`after:inset-0`, row is `relative`), so the row is one tap target while
 * the heading, status and reason stay outside the link's accessible name.
 */
export function platformRowActionClass(state: PlatformLinkState): string {
  const tone = ACTIONS[state]?.tone ?? 'neutral';
  const iconTone = tone === 'fix' ? 'text-[#C4271B]' : tone === 'add' ? 'text-pn-accent' : '';
  return [
    ROW_CIRCLE,
    iconTone,
    'after:absolute after:inset-0 after:rounded-[16px]',
    'hover:bg-pn-accent hover:text-white max-sm:hover:bg-pn-accent',
    tone === 'neutral' ? 'hover:[&>svg]:rotate-45' : '',
    'focus-visible:outline-none focus-visible:bg-pn-accent focus-visible:text-white max-sm:focus-visible:bg-pn-accent',
    // No press scale here: a transform would make the link the containing
    // block of its stretched ::after mid-press, and a release outside the
    // circle would then miss the link.
  ]
    .filter(Boolean)
    .join(' ');
}

/** Grey breakdown row (Fintora "Portfolio Breakdown"): 16px corners, 12px padding. */
export const PLATFORM_ROW_CLASS =
  'relative flex items-center gap-3 rounded-[16px] bg-pn-canvas p-3 transition-colors duration-200 has-[a:hover]:bg-[#EDEDED] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-pn-accent has-[a:focus-visible]:ring-offset-2 sm:gap-4';

/**
 * One platform per `<li>`: logo circle + name (h3) + optional "Varsayılan"
 * badge + one-line reason, the soft status pill, and a single ↗ / + / wrench
 * circle that opens the provider page — the whole row is tappable through it.
 * On phones the status pill moves under the reason.
 */
export function PlatformLinkRow({
  status,
  locale,
  restaurantId,
  nowMs,
}: {
  status: PlatformLinkStatus;
  locale: 'tr' | 'en';
  restaurantId: string;
  /** Reference time for "son kontrol 2 sa önce" — passed in so SSR and the
   *  first client render produce identical text (no hydration mismatch). */
  nowMs: number;
}) {
  const isTr = locale === 'tr';
  const { platform } = status;
  const actionLabel = platformRowActionLabel(status.state, locale);
  const reason = describePlatformLinkStatus(status, locale, nowMs);

  return (
    <li className={PLATFORM_ROW_CLASS}>
      <PlatformLogo platform={platform} size={40} shape="circle" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[14px] font-medium leading-5 text-pn-ink">{platform.name}</h3>
            {status.isDefault && (
              <Badge kind="lime" dot={false}>
                {isTr ? 'Varsayılan' : 'Default'}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 break-words text-[13px] leading-[1.45] text-[#666666]">{reason}</p>
        </div>
        <PlatformStatusPill state={status.state} locale={locale} className="self-start sm:self-center" />
      </div>
      {actionLabel && (
        <Link
          href={platformWizardHref(locale, platform.slug, restaurantId)}
          aria-label={`${platform.name} — ${actionLabel}`}
          title={actionLabel}
          className={platformRowActionClass(status.state)}
        >
          <PlatformRowActionIcon state={status.state} />
        </Link>
      )}
    </li>
  );
}

export default PlatformLinkRow;
