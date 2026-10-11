'use client';

// Owner `/dashboard/platforms` — simplified platform links overview.
//
// One business at a time (the page-level PlatformBusinessContext card is the
// only business control on the page), one list of review platforms with a
// single action per row, the business-level customer routing pickers in one
// place, and the contact channels. All data for every scoped business is in
// props, so switching business never needs a server round trip and never
// shows another business's numbers.
//
// Hydration: nothing reads localStorage during render. When the URL has no
// ?restaurantId and the owner has more than one business, a skeleton renders
// until the remembered business is resolved after mount (the shell's
// active-business effect and this page then agree on the same id).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, Download, Loader2, RefreshCw } from 'lucide-react';
import { AlertBanner, PageHeader } from '@/components/ui';
import DefaultRedirectPicker from '@/components/dashboard/DefaultRedirectPicker';
import RedirectThresholdPicker from '@/components/dashboard/RedirectThresholdPicker';
import { SettingsCard } from '@/components/dashboard/settings/SettingsCard';
import {
  PlatformBusinessContext,
  settingsPlatformsHref,
} from '@/components/dashboard/platforms/PlatformBusinessContext';
import { PlatformLinkRow } from '@/components/dashboard/platforms/PlatformLinkRow';
import { useFocusClearance } from '@/components/dashboard/platforms/useFocusClearance';
import {
  PlatformBackLinkSkeleton,
  PlatformsOverviewBodySkeleton,
} from '@/components/dashboard/platforms/PlatformSkeletons';
import {
  ACTIVE_BUSINESS_STORAGE_KEY,
  resolveActiveRestaurantId,
  setRestaurantParam,
} from '@/lib/active-business';
import {
  PLATFORM_LINKS_LABEL,
  type PlatformEnabledField,
  type PlatformUrlField,
} from '@/lib/platform-management';
import {
  computePlatformLinkStatuses,
  countTestableLinks,
  defaultPickerPlatformIds,
  isPlatformLinkVisible,
  sortPlatformLinkStatuses,
  summarizePlatformLinks,
  type LatestCheckLite,
} from '@/lib/platform-link-status';

export type PlatformsRestaurant = {
  id: string;
  name: string;
  category: string;
  externalPlatformsEnabled: boolean;
  defaultRedirectPlatform: string | null;
  redirectMinRating: number | null;
} & Record<PlatformUrlField, string | null> &
  Record<PlatformEnabledField, boolean>;

interface PlatformsClientProps {
  locale: 'tr' | 'en';
  restaurants: PlatformsRestaurant[];
  checksByRestaurant: Record<string, Record<string, LatestCheckLite>>;
  initialRestaurantId: string;
  /** Server render time — first client render uses the same reference so
   *  "son kontrol 2 sa önce" text hydrates identically. */
  serverNow: number;
}

interface RetestResult {
  provider: string;
  ok: boolean;
  statusCode?: number | null;
  error?: string | null;
  checkedAt?: string;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2';

function readStoredRestaurantId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function PlatformsClient({
  locale,
  restaurants,
  checksByRestaurant,
  initialRestaurantId,
  serverNow,
}: PlatformsClientProps) {
  const isTr = locale === 'tr';
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRestaurantId = searchParams.get('restaurantId') ?? searchParams.get('restaurant');

  const [rows, setRows] = useState<PlatformsRestaurant[]>(restaurants);
  const [checks, setChecks] = useState(checksByRestaurant);
  const [selectedId, setSelectedId] = useState<string>(initialRestaurantId);
  // Skeleton (not the first business's data) until the remembered business
  // is known — only needed when the URL does not already name one.
  const [resolved, setResolved] = useState<boolean>(() => Boolean(queryRestaurantId) || restaurants.length <= 1);
  const [nowMs, setNowMs] = useState<number>(serverNow);
  const [retesting, setRetesting] = useState(false);
  const [retestNotice, setRetestNotice] = useState<string>('');
  const [retestError, setRetestError] = useState<string | null>(null);
  useFocusClearance();

  useEffect(() => setRows(restaurants), [restaurants]);
  useEffect(() => setChecks(checksByRestaurant), [checksByRestaurant]);
  useEffect(() => setNowMs(Date.now()), []);

  // Resolve the active business after mount: ?restaurantId → remembered
  // business → first. Keep the URL in sync with replaceState (no server
  // round trip — all businesses' data is already here). Next 15 syncs
  // useSearchParams from replaceState, so the shell sees the same id and does
  // not issue its own router.replace for it.
  useEffect(() => {
    const next = resolveActiveRestaurantId({
      restaurants: rows,
      queryRestaurantId,
      storedRestaurantId: readStoredRestaurantId(),
    });
    if (!next) return;
    setSelectedId(next);
    setResolved(true);
    if (queryRestaurantId !== next) {
      const search = setRestaurantParam(window.location.search, next);
      window.history.replaceState(null, '', `${window.location.pathname}?${search}${window.location.hash}`);
    }
  }, [queryRestaurantId, rows]);

  // "Değiştir" links from the provider page and settings land on
  // #yonlendirme. On client navigation Next applies the hash scroll while
  // loading.tsx is still on screen (the section does not exist yet), and
  // when the URL names no business the skeleton is up until `resolved`. So
  // scroll once the real content is rendered. scrollIntoView also scrolls
  // the lg panel scroll container (§42.5.1); the section has scroll-mt-24.
  useEffect(() => {
    if (!resolved || window.location.hash !== '#yonlendirme') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('yonlendirme')?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [resolved]);

  const restaurant = rows.find((row) => row.id === selectedId) ?? rows[0];
  const restaurantChecks = useMemo(() => checks[restaurant.id] ?? {}, [checks, restaurant.id]);

  const statuses = useMemo(
    () => computePlatformLinkStatuses(restaurant, restaurantChecks),
    [restaurant, restaurantChecks],
  );
  const reviewStatuses = statuses.filter((status) => status.platform.category === 'review');
  const reviewVisible = sortPlatformLinkStatuses(reviewStatuses.filter(isPlatformLinkVisible), restaurant.category);
  const reviewOther = sortPlatformLinkStatuses(
    reviewStatuses.filter((status) => !isPlatformLinkVisible(status)),
    restaurant.category,
  );
  const contactStatuses = statuses.filter((status) => status.platform.category !== 'review');
  const summary = summarizePlatformLinks(reviewVisible);
  const testableCount = countTestableLinks(statuses);
  const pickerIds = useMemo(() => defaultPickerPlatformIds(restaurant), [restaurant]);

  const updateRow = useCallback((id: string, patch: Partial<PlatformsRestaurant>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const selectRestaurant = (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
    setRetestNotice('');
    setRetestError(null);
    try {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, id);
    } catch {
      /* storage blocked — URL still carries the selection */
    }
    window.dispatchEvent(new CustomEvent('buaze:active-restaurant-change', { detail: { restaurantId: id } }));
    const search = setRestaurantParam(window.location.search, id);
    window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
  };

  const runRetestAll = async () => {
    if (retesting || testableCount === 0) return;
    const id = restaurant.id;
    setRetesting(true);
    setRetestNotice('');
    setRetestError(null);
    try {
      const response = await fetch(`/api/restaurants/${id}/integrations/retest?locale=${locale}`, {
        method: 'POST',
      });
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After') || '0');
        setRetestNotice(
          isTr
            ? `Çok sık denendi. ${retryAfter > 0 ? `${retryAfter} sn sonra` : 'Biraz sonra'} tekrar deneyin.`
            : `Too many checks. Try again ${retryAfter > 0 ? `in ${retryAfter}s` : 'shortly'}.`,
        );
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || (isTr ? 'Kontrol yapılamadı.' : 'Could not run the check.'));
      }
      const results: RetestResult[] = Array.isArray(data?.results) ? data.results : [];
      setChecks((current) => {
        const nextForRestaurant = { ...(current[id] ?? {}) };
        for (const result of results) {
          nextForRestaurant[result.provider] = {
            ok: Boolean(result.ok),
            checkedAt: result.checkedAt ?? new Date().toISOString(),
            error: result.error ?? null,
            statusCode: typeof result.statusCode === 'number' ? result.statusCode : null,
          };
        }
        return { ...current, [id]: nextForRestaurant };
      });
      setNowMs(Date.now());
      const okCount = results.filter((result) => result.ok).length;
      const failCount = results.length - okCount;
      setRetestNotice(
        isTr
          ? `${results.length} link kontrol edildi: ${okCount} çalışıyor, ${failCount} sorunlu.`
          : `${results.length} links checked: ${okCount} working, ${failCount} need attention.`,
      );
      router.refresh();
    } catch (err) {
      setRetestError(
        err instanceof Error && err.message
          ? err.message
          : isTr
            ? 'Kontrol yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.'
            : 'Could not run the check. Check your connection and try again.',
      );
    } finally {
      setRetesting(false);
    }
  };

  const title = isTr ? PLATFORM_LINKS_LABEL.tr : PLATFORM_LINKS_LABEL.en;
  const header = (
    <PageHeader
      eyebrow={title.toLocaleUpperCase(isTr ? 'tr-TR' : 'en-US')}
      title={title}
      description={
        isTr
          ? 'Yüksek puan veren müşterilerinize önerilen yorum platformu linkleri. Her işletme için ayrı ayarlanır.'
          : 'Review-platform links offered to your happy customers. Set separately for each business.'
      }
    />
  );

  if (!resolved) {
    return (
      <>
        <div>
          <PlatformBackLinkSkeleton />
          {header}
        </div>
        <PlatformsOverviewBodySkeleton />
      </>
    );
  }

  const exportHref = `/api/dashboard/platforms/log/export?locale=${locale}&restaurantId=${encodeURIComponent(restaurant.id)}`;

  return (
    <>
      <div>
        <Link
          href={settingsPlatformsHref(locale, restaurant.id)}
          className={`bz-mono mb-3 inline-flex min-h-[44px] items-center sm:min-h-[32px] gap-1 rounded text-[11px] text-[#737373] hover:text-[#0A0A0A] ${FOCUS_RING}`}
        >
          <ArrowLeft size={12} aria-hidden="true" />
          {isTr ? `${restaurant.name} ayarları` : `${restaurant.name} settings`}
        </Link>
        {header}
      </div>

      <PlatformBusinessContext
        locale={locale}
        restaurant={restaurant}
        restaurants={rows}
        summary={summary}
        onSelect={selectRestaurant}
      />

      {restaurant.externalPlatformsEnabled === false && (
        <AlertBanner kind="info">
          {isTr
            ? 'Google dışındaki yorum platformları bu işletme için kapalı. Kayıtlı linkler korunur.'
            : 'Review platforms other than Google are off for this business. Saved links are kept.'}
        </AlertBanner>
      )}

      {/* ── Review platforms ─────────────────────────────────────────── */}
      <section aria-labelledby="pl-review-title" className="space-y-3">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 id="pl-review-title" className="bz-h-tight text-[18px] text-[#0A0A0A]">
                {isTr ? 'Yorum platformları' : 'Review platforms'}
              </h2>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                {isTr
                  ? 'Puanı eşiği geçen müşteriye bu platformlardan biri önerilir.'
                  : 'Customers above your rating threshold are offered one of these.'}
              </p>
            </div>
            <button
              type="button"
              onClick={runRetestAll}
              // Not `disabled` while running: disabling the focused button
              // would drop keyboard focus to <body>. The handler guards re-entry.
              disabled={testableCount === 0}
              aria-disabled={retesting || undefined}
              aria-busy={retesting || undefined}
              title={
                testableCount === 0
                  ? isTr
                    ? 'Kontrol edilecek aktif link yok.'
                    : 'No active links to check.'
                  : undefined
              }
              className={`bz-btn-ghost inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[38px] sm:w-auto ${FOCUS_RING}`}
            >
              {retesting ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={14} aria-hidden="true" />
              )}
              {retesting
                ? isTr
                  ? 'Kontrol ediliyor…'
                  : 'Checking…'
                : isTr
                  ? 'Tümünü kontrol et'
                  : 'Check all'}
            </button>
          </div>
          {/* Always mounted (live regions must exist before their text changes). */}
          <p role="status" aria-live="polite" className="text-[12px] leading-[1.5] text-[#525252] [&:not(:empty)]:mt-2">
            {retestNotice}
          </p>
        </div>
        {retestError && (
          <AlertBanner kind="danger" onDismiss={() => setRetestError(null)}>
            {retestError}
          </AlertBanner>
        )}

        <ul role="list" className="bz-card divide-y divide-[#EDEDED] overflow-hidden p-0">
          {reviewVisible.map((status) => (
            <PlatformLinkRow
              key={status.platform.slug}
              status={status}
              locale={locale}
              restaurantId={restaurant.id}
              nowMs={nowMs}
            />
          ))}
        </ul>

        {reviewOther.length > 0 && (
          <details className="group">
            <summary
              className={`flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-[13px] font-medium text-[#0A0A0A] [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
            >
              <ChevronRight
                size={14}
                aria-hidden="true"
                className="text-[#525252] transition-transform group-open:rotate-90"
              />
              {isTr ? `Diğer platformlar (${reviewOther.length})` : `Other platforms (${reviewOther.length})`}
            </summary>
            <p className="mb-2 mt-1 px-1 text-[12px] leading-[1.5] text-[#525252]">
              {isTr
                ? 'Bu platformlar sektörünüz için tipik değil; yine de link ekleyebilirsiniz.'
                : 'These are not typical for your sector, but you can still add a link.'}
            </p>
            <ul role="list" className="bz-card divide-y divide-[#EDEDED] overflow-hidden p-0">
              {reviewOther.map((status) => (
                <PlatformLinkRow
                  key={status.platform.slug}
                  status={status}
                  locale={locale}
                  restaurantId={restaurant.id}
                  nowMs={nowMs}
                />
              ))}
            </ul>
          </details>
        )}

        <p className="text-[11.5px] leading-[1.55] text-[#525252]">
          {isTr
            ? 'Bazı platformlar otomatik kontrolü engelleyebilir; "Sorunlu" görünen bir link tarayıcıda yine de açılabilir.'
            : 'Some platforms block automated checks; a link marked "Needs attention" may still open in a browser.'}
        </p>
      </section>

      {/* ── Customer routing (business-level) ────────────────────────── */}
      <section id="yonlendirme" aria-labelledby="pl-routing-title" className="scroll-mt-24 space-y-3">
        <div>
          <h2 id="pl-routing-title" className="bz-h-tight text-[18px] text-[#0A0A0A]">
            {isTr ? 'Müşteri yönlendirme' : 'Customer routing'}
          </h2>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
            {isTr
              ? 'Bu ayarlar işletmenin tüm yorum platformları için geçerlidir.'
              : 'These settings apply to all review platforms of this business.'}
          </p>
        </div>
        <SettingsCard>
          <div className="space-y-6 pt-4 sm:pt-5">
            <div className="space-y-3">
              <h3 id="pl-threshold-label" className="text-[13.5px] font-semibold text-[#0A0A0A]">
                {isTr ? 'Hangi puandan itibaren platform önerilsin?' : 'From which rating should a platform be suggested?'}
              </h3>
              <RedirectThresholdPicker
                key={`threshold-${restaurant.id}`}
                restaurantId={restaurant.id}
                initialValue={restaurant.redirectMinRating}
                locale={locale}
                labelId="pl-threshold-label"
                onSaved={(next) => updateRow(restaurant.id, { redirectMinRating: next })}
              />
            </div>
            <div className="space-y-3 border-t border-[#EDEDED] pt-5">
              <h3 id="pl-default-label" className="text-[13.5px] font-semibold text-[#0A0A0A]">
                {isTr ? 'Varsayılan platform' : 'Default platform'}
              </h3>
              <DefaultRedirectPicker
                key={`default-${restaurant.id}`}
                restaurantId={restaurant.id}
                enabledPlatforms={pickerIds}
                initialValue={restaurant.defaultRedirectPlatform}
                locale={locale}
                labelId="pl-default-label"
                onSaved={(next) => updateRow(restaurant.id, { defaultRedirectPlatform: next })}
              />
            </div>
          </div>
        </SettingsCard>
      </section>

      {/* ── Contact channels ─────────────────────────────────────────── */}
      <section aria-labelledby="pl-contact-title" className="space-y-3">
        <div>
          <h2 id="pl-contact-title" className="bz-h-tight text-[18px] text-[#0A0A0A]">
            {isTr ? 'İletişim kanalları' : 'Contact channels'}
          </h2>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
            {isTr
              ? 'Müşteri sayfanızda gösterilen sosyal medya ve mesaj linkleri.'
              : 'Social and messaging links shown on your customer page.'}
          </p>
        </div>
        <ul role="list" className="bz-card divide-y divide-[#EDEDED] overflow-hidden p-0">
          {contactStatuses.map((status) => (
            <PlatformLinkRow
              key={status.platform.slug}
              status={status}
              locale={locale}
              restaurantId={restaurant.id}
              nowMs={nowMs}
            />
          ))}
        </ul>
      </section>

      <div>
        <a
          href={exportHref}
          download
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-[12.5px] font-medium text-[#0A0A0A] underline-offset-2 hover:underline sm:min-h-[32px] ${FOCUS_RING}`}
        >
          <Download size={13} aria-hidden="true" />
          {isTr ? 'Kontrol geçmişini indir (CSV)' : 'Download check history (CSV)'}
        </a>
      </div>
    </>
  );
}
