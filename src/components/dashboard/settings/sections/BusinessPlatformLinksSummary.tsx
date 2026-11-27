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
  'focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-pn-ink focus-visible:ring-offset-2';

// "Kapalı" covers owner-off and admin-locked rows (summarizePlatformLinks).
// WCAG 2.4.11 (focus not obscured): keyboard-focused controls keep clear of
// the sticky topbar and the fixed mobile bottom nav — same pattern as the
// platform pages (useFocusClearance reads these scroll margins).
const FOCUS_CLEARANCE =
  '[&_:is(a,button)]:scroll-mt-24 [&_:is(a,button)]:scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+16px)]';

const SUMMARY_STATES = ['connected', 'issue', 'missing', 'off'] as const;

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
    <div className={`space-y-5 ${FOCUS_CLEARANCE}`} data-focus-clearance>
      <ul
        role="list"
        aria-label={isTr ? 'Yorum platformu durumu' : 'Review platform status'}
        aria-busy={loadingChecks || undefined}
        className="flex flex-wrap gap-2"
      >
        {SUMMARY_STATES.map((state) => {
          const count = summary[state];
          return (
            <li
              key={state}
              className="inline-flex min-h-[32px] items-center gap-2 rounded-full border border-pn-line bg-white py-1 pl-1 pr-3"
            >
              {count > 0 ? (
                <PlatformStatusPill state={state} locale={locale} />
              ) : (
                // Zero counts stay neutral — a red "Sorunlu 0" reads as an alarm.
                <span className="inline-flex items-center gap-1 px-1.5 text-[12px] font-medium text-[#525252]">
                  <PlatformStateIcon state={state} size={12} />
                  <span className="sr-only">{isTr ? 'Durum: ' : 'Status: '}</span>
                  {platformStateLabel(state, locale)}
                </span>
              )}
              <span
                className={`tabular-nums text-[13px] font-medium ${count > 0 ? 'text-pn-ink' : 'text-[#525252]'}`}
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

      <section aria-labelledby="bpls-review-title" className="space-y-2.5">
        <h3 id="bpls-review-title" className="bz-h-tight text-[15px] text-pn-ink">
          {isTr ? 'Yorum platformları' : 'Review platforms'}
        </h3>
        <ul
          role="list"
          aria-busy={loadingChecks || undefined}
          className="divide-y divide-pn-line overflow-hidden rounded-[24px] border border-pn-line bg-white"
        >
          {visible.map((status) => {
            const actionLabel = platformRowActionLabel(status.state, locale);
            const reason = describePlatformLinkStatus(status, locale, nowMs);
            return (
              <li key={status.platform.slug} className="flex items-center gap-3 py-2 pl-3 pr-1.5 sm:pl-4 sm:pr-2.5">
                <PlatformLogo platform={status.platform} size={28} />
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h4 className="bz-h-tight text-[14px] text-pn-ink">{status.platform.name}</h4>
                    <PlatformStatusPill state={status.state} locale={locale} />
                  </div>
                  <p
                    className="mt-0.5 truncate text-[12px] leading-[1.5] text-[#525252] sm:whitespace-normal"
                    title={reason}
                  >
                    {reason}
                  </p>
                </div>
                {actionLabel && (
                  <Link
                    href={platformWizardHref(locale, status.platform.slug, restaurant.id)}
                    aria-label={`${status.platform.name} — ${actionLabel}`}
                    className={`inline-flex min-h-[44px] shrink-0 items-center rounded px-3 text-[13px] font-medium underline-offset-2 hover:underline ${
                      status.state === 'issue' ? 'text-[#991B1B]' : 'text-pn-ink'
                    } ${FOCUS_RING}`}
                  >
                    {actionLabel}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="bpls-routing-title"
        className="rounded-[24px] border border-pn-line bg-pn-canvas px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
      >
        <div className="min-w-0">
          <h3 id="bpls-routing-title" className="bz-h-tight text-[14px] text-pn-ink">
            {isTr ? 'Müşteri yönlendirme' : 'Customer routing'}
          </h3>
          <p className="mt-1 text-[13px] leading-[1.6] text-[#525252]">
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
          className={`-ml-1 mt-1 inline-flex min-h-[44px] shrink-0 items-center rounded px-1 text-[13px] font-medium text-pn-ink underline underline-offset-2 sm:mt-0 sm:min-h-[38px] ${FOCUS_RING}`}
        >
          {isTr ? 'Değiştir' : 'Change'}
        </Link>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href={overviewHref}
          className={`bz-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 sm:w-auto ${FOCUS_RING}`}
        >
          {isTr ? 'Platform bağlantılarını yönet' : 'Manage platform links'}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <p className="text-[12px] leading-[1.5] text-[#525252]">
          {isTr
            ? 'Linkler ve kontrol sonuçları Platform bağlantıları sayfasında düzenlenir.'
            : 'Links and check results are edited on the Platform links page.'}
        </p>
      </div>
    </div>
  );
}

export default BusinessPlatformLinksSummary;
