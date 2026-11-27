'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import { PlatformLogo } from '@/components/dashboard/platforms/PlatformLogo';
import {
  PlatformStateIcon,
  PlatformStatusPill,
  platformStateLabel,
} from '@/components/dashboard/platforms/PlatformStatusPill';
import {
  PLATFORM_ROW_CLASS,
  PlatformRowActionIcon,
  platformRowActionClass,
  platformRowActionLabel,
  platformWizardHref,
} from '@/components/dashboard/platforms/PlatformLinkRow';
import { useFocusClearance } from '@/components/dashboard/platforms/useFocusClearance';
import {
  computePlatformLinkStatuses,
  describePlatformLinkStatus,
  isPlatformLinkVisible,
  redirectThresholdLabel,
  sortPlatformLinkStatuses,
  summarizePlatformLinks,
  type LatestCheckLite,
  type PlatformLinkRow,
} from '@/lib/platform-link-status';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-pn-accent focus-visible:ring-offset-2';

// "Kapalı" covers owner-off and admin-locked rows (summarizePlatformLinks).
// WCAG 2.4.11 (focus not obscured): keyboard-focused controls keep clear of
// the sticky topbar and the fixed mobile bottom nav — same pattern as the
// platform pages (useFocusClearance reads these scroll margins).
const FOCUS_CLEARANCE =
  '[&_:is(a,button)]:scroll-mt-24 [&_:is(a,button)]:scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+16px)]';

const SUMMARY_STATES = ['connected', 'issue', 'missing', 'off'] as const;

// Stat tile tone per state (soft Fintora fill + state colour for the icon).
const STAT_TONE: Record<(typeof SUMMARY_STATES)[number], string> = {
  connected: 'bg-[#E6F7EA] text-[#1F7A35]',
  issue: 'bg-[#FDECEC] text-[#C4271B]',
  missing: 'bg-pn-canvas text-[#666666]',
  off: 'bg-pn-canvas text-[#666666]',
};

export type PlatformLinksSummaryRestaurant = PlatformLinkRow & {
  id: string;
  redirectMinRating?: number | null;
};

interface BusinessPlatformLinksSummaryProps {
  restaurant: PlatformLinksSummaryRestaurant;
  locale: 'tr' | 'en';
  /** Latest check per provider; `null` while the parent is still loading them. */
  checks: Record<string, LatestCheckLite> | null;
  /** Reference time for the "son kontrol 2 sa önce" copy (SSR-stable). */
  nowMs: number;
}

/**
 * Settings → "Platform bağlantıları" tab. Read-only summary + entry point:
 * the platform pages are the single editor for these links, so there is no
 * inline URL editing here (two forms for the same fields would drift).
 *
 *   1. Status counts (Bağlı / Sorunlu / Eksik / Kapalı)
 *   2. Compact list of the review platforms the overview lists, each with a
 *      deep link to its provider page
 *   3. Customer-routing line (threshold + default platform) → overview anchor
 *   4. Primary "Platform bağlantılarını yönet" CTA
 */
export function BusinessPlatformLinksSummary({
  restaurant,
  locale,
  checks,
  nowMs,
}: BusinessPlatformLinksSummaryProps) {
  const isTr = locale === 'tr';
  const loadingChecks = checks === null;
  useFocusClearance();

  const reviewStatuses = useMemo(
    () => computePlatformLinkStatuses(restaurant, checks ?? {}, { categories: ['review'] }),
    [restaurant, checks],
  );
  const visible = useMemo(
    () => sortPlatformLinkStatuses(reviewStatuses.filter(isPlatformLinkVisible), restaurant.category),
    [reviewStatuses, restaurant.category],
  );
  const summary = summarizePlatformLinks(visible);

  const restaurantParam = encodeURIComponent(restaurant.id);
  const overviewHref = `/${locale}/dashboard/platforms?restaurantId=${restaurantParam}`;

  // Default platform: name it, but flag a stored default the public resolver
  // currently skips (link removed / switched off / admin-locked) — same rule
  // as the provider page's routing summary.
  const defaultProvider = restaurant.defaultRedirectPlatform ?? null;
  const defaultStatus = defaultProvider
    ? reviewStatuses.find((status) => status.platform.provider === defaultProvider) ?? null
    : null;
  const defaultUnusable = defaultStatus
    ? defaultStatus.state === 'missing' || defaultStatus.state === 'off' || defaultStatus.state === 'locked'
    : false;
  const defaultName = defaultProvider
    ? `${defaultStatus?.platform.name ?? defaultProvider}${
        defaultUnusable
          ? isTr
            ? ' (şu an kullanılamıyor — otomatik seçiliyor)'
            : ' (unavailable — picking automatically)'
          : ''
      }`
    : isTr
      ? 'Otomatik'
      : 'Automatic';

  return (
    <div className={`space-y-2.5 ${FOCUS_CLEARANCE}`} data-focus-clearance>
      <ul
        role="list"
        aria-label={isTr ? 'Yorum platformu durumu' : 'Review platform status'}
        aria-busy={loadingChecks || undefined}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
      >
        {SUMMARY_STATES.map((state) => {
          const count = summary[state];
          return (
            <li key={state} className="bz-card flex min-w-0 flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                {count > 0 ? (
                  <PlatformStatusPill state={state} locale={locale} />
                ) : (
                  // Zero counts stay neutral — a red "Sorunlu 0" reads as an alarm.
                  <span className="inline-flex h-7 items-center gap-1.5 text-[13px] font-medium text-[#666666]">
                    <span className="sr-only">{isTr ? 'Durum: ' : 'Status: '}</span>
                    {platformStateLabel(state, locale)}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    count > 0 ? STAT_TONE[state] : 'bg-pn-canvas text-[#9A9A9A]'
                  }`}
                >
                  <PlatformStateIcon state={state} size={15} />
                </span>
              </div>
              <span
                className={`tabular-nums text-[28px] font-medium leading-none tracking-[-0.025em] ${
                  count > 0 ? 'text-pn-ink' : 'text-[#9A9A9A]'
                }`}
              >
                {count}
              </span>
            </li>
          );
        })}
      </ul>

      {restaurant.externalPlatformsEnabled === false && (
        <AlertBanner kind="info">
          {isTr
            ? 'Google dışındaki yorum platformları bu işletme için kapalı. Kayıtlı linkler korunur.'
            : 'Review platforms other than Google are off for this business. Saved links are kept.'}
        </AlertBanner>
      )}

      <section aria-labelledby="bpls-review-title" className="bz-card p-5 sm:p-6">
        <h3
          id="bpls-review-title"
          className="mb-4 text-[18px] font-medium leading-6 tracking-[-0.01em] text-pn-ink sm:text-[20px] sm:leading-[26px]"
        >
          {isTr ? 'Yorum platformları' : 'Review platforms'}
        </h3>
        <ul role="list" aria-busy={loadingChecks || undefined} className="space-y-2">
          {visible.map((status) => {
            const actionLabel = platformRowActionLabel(status.state, locale);
            const reason = describePlatformLinkStatus(status, locale, nowMs);
            return (
              <li key={status.platform.slug} className={PLATFORM_ROW_CLASS}>
                <PlatformLogo platform={status.platform} size={40} shape="circle" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[14px] font-medium leading-5 text-pn-ink">{status.platform.name}</h4>
                    <p
                      className="mt-0.5 truncate text-[13px] leading-[1.45] text-[#666666] sm:whitespace-normal"
                      title={reason}
                    >
                      {reason}
                    </p>
                  </div>
                  <PlatformStatusPill state={status.state} locale={locale} className="self-start sm:self-center" />
                </div>
                {actionLabel && (
                  <Link
                    href={platformWizardHref(locale, status.platform.slug, restaurant.id)}
                    aria-label={`${status.platform.name} — ${actionLabel}`}
                    title={actionLabel}
                    className={platformRowActionClass(status.state)}
                  >
                    <PlatformRowActionIcon state={status.state} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="bpls-routing-title"
        className="bz-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="min-w-0">
          <h3
            id="bpls-routing-title"
            className="text-[18px] font-medium leading-6 tracking-[-0.01em] text-pn-ink sm:text-[20px] sm:leading-[26px]"
          >
            {isTr ? 'Müşteri yönlendirme' : 'Customer routing'}
          </h3>
          <p className="mt-1.5 text-[14px] leading-[1.6] text-[#666666]">
            {isTr ? 'Platform önerilen puan: ' : 'Suggested from: '}
            <strong className="font-medium text-pn-ink">
              {redirectThresholdLabel(restaurant.redirectMinRating, locale)}
            </strong>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {isTr ? 'Varsayılan platform: ' : 'Default platform: '}
            <strong className="font-medium text-pn-ink">{defaultName}</strong>
          </p>
        </div>
        <Link
          href={`${overviewHref}#yonlendirme`}
          aria-label={isTr ? 'Müşteri yönlendirmesini değiştir' : 'Change customer routing'}
          className={`bz-btn-ghost inline-flex min-h-[44px] w-full shrink-0 items-center justify-center text-[14px] sm:w-auto ${FOCUS_RING}`}
        >
          {isTr ? 'Değiştir' : 'Change'}
        </Link>
      </section>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href={overviewHref}
          className={`bz-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 sm:w-auto ${FOCUS_RING}`}
        >
          {isTr ? 'Platform bağlantılarını yönet' : 'Manage platform links'}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <p className="text-[13px] leading-[1.5] text-[#737373]">
          {isTr
            ? 'Linkler ve kontrol sonuçları Platform bağlantıları sayfasında düzenlenir.'
            : 'Links and check results are edited on the Platform links page.'}
        </p>
      </div>
    </div>
  );
}

export default BusinessPlatformLinksSummary;
