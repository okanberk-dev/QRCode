import Link from 'next/link';
import { Badge } from '@/components/ui';
import {
  describePlatformLinkStatus,
  type PlatformLinkState,
  type PlatformLinkStatus,
} from '@/lib/platform-link-status';
import { PlatformLogo } from './PlatformLogo';
import { PlatformStatusPill } from './PlatformStatusPill';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-pn-ink focus-visible:ring-offset-2';

const ACTIONS: Record<
  PlatformLinkState,
  { tr: string; en: string; className: string } | null
> = {
  missing: { tr: 'Bağla', en: 'Add link', className: 'bz-btn-primary' },
  issue: { tr: 'Düzelt', en: 'Fix', className: 'bz-btn-danger' },
  connected: { tr: 'Yönet', en: 'Manage', className: 'bz-btn-ghost' },
  off: { tr: 'Yönet', en: 'Manage', className: 'bz-btn-ghost' },
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

/**
 * One platform per `<li>`: logo + name (h3) + status pill + optional
 * "Varsayılan" badge + one-line reason, and a single primary action that
 * opens the provider page. Full-width 44px action on mobile.
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
  const action = ACTIONS[status.state];
  const actionLabel = action ? (isTr ? action.tr : action.en) : null;
  const reason = describePlatformLinkStatus(status, locale, nowMs);

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <PlatformLogo platform={platform} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="bz-h-tight text-[14px] text-pn-ink">{platform.name}</h3>
            <PlatformStatusPill state={status.state} locale={locale} />
            {status.isDefault && (
              <Badge kind="lime" dot={false}>
                {isTr ? 'Varsayılan' : 'Default'}
              </Badge>
            )}
          </div>
          <p className="mt-1 break-words text-[13px] leading-[1.5] text-[#525252]">{reason}</p>
        </div>
      </div>
      {action && actionLabel && (
        <Link
          href={platformWizardHref(locale, platform.slug, restaurantId)}
          aria-label={`${platform.name} — ${actionLabel}`}
          className={`${action.className} inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[13px] sm:min-h-[38px] sm:w-auto sm:min-w-[96px] ${FOCUS_RING}`}
        >
          {actionLabel}
        </Link>
      )}
    </li>
  );
}

export default PlatformLinkRow;
