'use client';

// Owner `/dashboard/platforms` — simplified platform links overview.
//
// One business at a time — the business is picked with the shell's business
// switcher (sidebar / mobile top bar) and the page follows `?restaurantId`;
// the PlatformBusinessContext card only names it. One list of review
// platforms with a single action per row, the business-level customer
// routing pickers in one place, and the contact channels. All data for every
// scoped business is in props, so following a switch never needs a server
// round trip and never shows another business's numbers. Franchise owners
// also get the "Tüm işletmeler" matrix (?view=all) on the same tab row.
//
// Hydration: nothing reads localStorage during render. When the URL has no
// ?restaurantId and the owner has more than one business, a skeleton renders
// until the remembered business is resolved after mount (the shell's
// active-business effect and this page then agree on the same id).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { AlertBanner, PageHeader, StatCard, Tabs } from '@/components/ui';
import { PlatformsPortfolio } from '@/components/dashboard/platforms/PlatformsPortfolio';
import DefaultRedirectPicker from '@/components/dashboard/DefaultRedirectPicker';
import RedirectThresholdPicker from '@/components/dashboard/RedirectThresholdPicker';
import { PlatformBusinessContext } from '@/components/dashboard/platforms/PlatformBusinessContext';
import { PlatformCard, PLATFORM_ROW_LIST } from '@/components/dashboard/platforms/PlatformCard';
import { PlatformLinkRow } from '@/components/dashboard/platforms/PlatformLinkRow';
import { useFocusClearance } from '@/components/dashboard/platforms/useFocusClearance';
import { PlatformsOverviewBodySkeleton } from '@/components/dashboard/platforms/PlatformSkeletons';
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
  formatRelativeTime,
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
  /** Paused businesses left out of this page (named in the matrix note). */
  hiddenPausedCount?: number;
}

interface RetestResult {
  provider: string;
  ok: boolean;
  statusCode?: number | null;
  error?: string | null;
  checkedAt?: string;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-pn-accent focus-visible:ring-offset-2';

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
  hiddenPausedCount = 0,
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
  // §49 — franchise owners get an "all businesses" matrix (?view=all).
  const [view, setView] = useState<'business' | 'all'>(() =>
    restaurants.length > 1 && searchParams.get('view') === 'all' ? 'all' : 'business',
  );
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

  // A finished "Tümünü kontrol et" message belongs to the business it ran
  // for — clear it when the page follows a business switch.
  useEffect(() => {
    setRetestNotice('');
    setRetestError(null);
  }, [selectedId]);

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
  // Newest check among the links on this page (stat card "Son kontrol").
  const latestCheckedAt = statuses.reduce<string | null>((latest, status) => {
    const at = status.lastCheck?.checkedAt;
    if (!at || !Number.isFinite(Date.parse(at))) return latest;
    return !latest || Date.parse(at) > Date.parse(latest) ? at : latest;
  }, null);

  const updateRow = useCallback((id: string, patch: Partial<PlatformsRestaurant>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const changeView = (next: 'business' | 'all') => {
    setView(next);
    const params = new URLSearchParams(window.location.search);
    if (next === 'all') params.set('view', 'all');
    else params.delete('view');
    const search = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
  };

  const openBusinessFromPortfolio = (id: string) => {
    selectRestaurant(id);
    changeView('business');
    window.requestAnimationFrame(() => document.getElementById('pb-ctx')?.scrollIntoView({ block: 'start' }));
  };

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
  // No eyebrow: it only repeated the title and the breadcrumb.
  const header = (
    <PageHeader
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
        {header}
        {/* Unresolved only happens with 2+ businesses, so the view tabs come. */}
        <PlatformsOverviewBodySkeleton withTabs />
      </>
    );
  }

  const exportHref = `/api/dashboard/platforms/log/export?locale=${locale}&restaurantId=${encodeURIComponent(restaurant.id)}`;

  // §49 — franchise owners switch between this business and the matrix.
  // In the matrix view the same row also carries its filter and check-all
  // action (one toolbar instead of a tab row + a section header).
  const viewTabs =
    rows.length > 1 ? (
      <Tabs
        items={[
          { id: 'business', label: isTr ? 'Bu işletme' : 'This business' },
          { id: 'all', label: isTr ? 'Tüm işletmeler' : 'All businesses', count: rows.length },
        ]}
        active={view}
        onChange={(id) => changeView(id as 'business' | 'all')}
        ariaLabel={isTr ? 'Görünüm' : 'View'}
      />
    ) : null;

  const statCards = [
    {
      key: 'connected',
      label: isTr ? 'Bağlı' : 'Connected',
      value: summary.connected,
      icon: <CheckCircle2 size={17} aria-hidden="true" />,
    },
    {
      key: 'issue',
      label: isTr ? 'Sorunlu' : 'Need attention',
      value: summary.issue,
      icon: <AlertTriangle size={17} aria-hidden="true" />,
    },
    {
      key: 'missing',
      label: isTr ? 'Eksik' : 'Not added',
      value: summary.missing,
      icon: <CircleDashed size={17} aria-hidden="true" />,
    },
    {
      key: 'checked',
      label: isTr ? 'Son kontrol' : 'Last check',
      value: latestCheckedAt ? formatRelativeTime(latestCheckedAt, locale, nowMs) : '—',
      icon: <Clock size={17} aria-hidden="true" />,
    },
  ];

  const retestButton = (
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
      className={`bz-btn-ghost inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[14px] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${FOCUS_RING}`}
    >
      {retesting ? (
        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw size={15} aria-hidden="true" />
      )}
      {retesting
        ? isTr
          ? 'Kontrol ediliyor…'
          : 'Checking…'
        : isTr
          ? 'Tümünü kontrol et'
          : 'Check all'}
    </button>
  );

  return (
    <>
      {header}

      {view === 'all' && rows.length > 1 ? (
        <PlatformsPortfolio
          locale={locale}
          businesses={rows}
          checksById={checks}
          toolbarStart={viewTabs}
          hiddenPausedCount={hiddenPausedCount}
          onOpenBusiness={openBusinessFromPortfolio}
          onChecks={(restaurantId, next) => {
            setChecks((current) => ({ ...current, [restaurantId]: next }));
            setNowMs(Date.now());
          }}
        />
      ) : (
      <>
      {viewTabs}

      {/* Fintora stack: every card 10px apart. */}
      <div className="space-y-2.5">
        <PlatformBusinessContext locale={locale} restaurant={restaurant} />

        {/* Summary — only counts the page already has (review links + newest check). */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.key} label={card.label} value={card.value} icon={card.icon} isTr={isTr} />
          ))}
        </div>

        {restaurant.externalPlatformsEnabled === false && (
          <AlertBanner kind="info">
            {isTr
              ? 'Google dışındaki yorum platformları bu işletme için kapalı. Kayıtlı linkler korunur.'
              : 'Review platforms other than Google are off for this business. Saved links are kept.'}
          </AlertBanner>
        )}

        {/* ── Review platforms ─────────────────────────────────────────── */}
        <PlatformCard
          titleId="pl-review-title"
          title={isTr ? 'Yorum platformları' : 'Review platforms'}
          description={
            isTr
              ? 'Puanı eşiği geçen müşteriye bu platformlardan biri önerilir.'
              : 'Customers above your rating threshold are offered one of these.'
          }
          actions={retestButton}
        >
          {/* Always mounted (live regions must exist before their text changes). */}
          <p
            role="status"
            aria-live="polite"
            className="text-[13px] leading-[1.5] text-[#525252] [&:not(:empty)]:-mt-1 [&:not(:empty)]:mb-3"
          >
            {retestNotice}
          </p>
          {retestError && (
            <div className="mb-3">
              <AlertBanner kind="danger" onDismiss={() => setRetestError(null)}>
                {retestError}
              </AlertBanner>
            </div>
          )}

          <ul role="list" className={PLATFORM_ROW_LIST}>
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
            <details className="group mt-2">
              <summary
                className={`flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 rounded-[16px] px-3 text-[14px] font-medium text-pn-ink transition-colors hover:bg-pn-canvas [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
              >
                <span>
                  {isTr ? 'Diğer platformlar' : 'Other platforms'}{' '}
                  <span className="tabular-nums text-[#737373]">({reviewOther.length})</span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pn-canvas text-pn-ink"
                >
                  <ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" />
                </span>
              </summary>
              <p className="mb-3 mt-1 px-3 text-[13px] leading-[1.5] text-[#737373]">
                {isTr
                  ? 'Bu platformlar sektörünüz için tipik değil; yine de link ekleyebilirsiniz.'
                  : 'These are not typical for your sector, but you can still add a link.'}
              </p>
              <ul role="list" className={PLATFORM_ROW_LIST}>
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

          <div className="mt-4 flex flex-col gap-3 border-t border-pn-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-[1.55] text-[#737373]">
              {isTr
                ? 'Bazı platformlar otomatik kontrolü engelleyebilir; "Sorunlu" görünen bir link tarayıcıda yine de açılabilir.'
                : 'Some platforms block automated checks; a link marked "Needs attention" may still open in a browser.'}
            </p>
            <a
              href={exportHref}
              download
              className={`bz-btn-ghost inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 text-[13px] ${FOCUS_RING}`}
            >
              <Download size={14} aria-hidden="true" />
              {isTr ? 'Kontrol geçmişini indir (CSV)' : 'Download check history (CSV)'}
            </a>
          </div>
        </PlatformCard>

        {/* ── Customer routing (business-level) ────────────────────────── */}
        <div id="yonlendirme" className="scroll-mt-24">
          <PlatformCard
            titleId="pl-routing-title"
            title={isTr ? 'Müşteri yönlendirme' : 'Customer routing'}
            description={
              isTr
                ? 'Bu ayarlar işletmenin tüm yorum platformları için geçerlidir.'
                : 'These settings apply to all review platforms of this business.'
            }
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 id="pl-threshold-label" className="text-[14px] font-medium text-pn-ink">
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
              <div className="space-y-3 border-t border-pn-line pt-5">
                <h3 id="pl-default-label" className="text-[14px] font-medium text-pn-ink">
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
          </PlatformCard>
        </div>

        {/* ── Contact channels ─────────────────────────────────────────── */}
        <PlatformCard
          titleId="pl-contact-title"
          title={isTr ? 'İletişim kanalları' : 'Contact channels'}
          description={
            isTr
              ? 'Müşteri sayfanızda gösterilen sosyal medya ve mesaj linkleri.'
              : 'Social and messaging links shown on your customer page.'
          }
        >
          <ul role="list" className={PLATFORM_ROW_LIST}>
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
        </PlatformCard>
      </div>
      </>
      )}
    </>
  );
}
