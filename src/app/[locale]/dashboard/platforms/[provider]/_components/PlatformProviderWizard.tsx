'use client';

// Owner `/dashboard/platforms/[provider]` — one platform, one business.
//
// Layout: single back link → header (name + the only status pill on the
// page) → business context (multi-business owners only) → [Google search
// panel] → Link card (labelled field, "show to customers" switch row, inline
// action row + polite live region) → [WhatsApp review card] → customer
// routing summary (business-level pickers live on the overview).
//
// The sticky UnsavedChangesBar is intentionally not used here: at 390px it
// covered the URL input being typed into (WCAG 2.4.11). Dirty edits are
// guarded by an inline Save, `beforeunload`, the back links and the business
// switch.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  Star,
  Trash2,
  Wand2,
  XCircle,
} from 'lucide-react';
import { AlertBanner, APSwitch, Field, PageHeader } from '@/components/ui';
import { SettingsCard } from '@/components/dashboard/settings/SettingsCard';
import { GoogleBusinessIntegrationPanel } from '@/components/dashboard/settings/sections/GoogleBusinessIntegrationPanel';
import { WhatsAppReviewWizard } from '@/components/dashboard/settings/WhatsAppReviewWizard';
import { PlatformBusinessContext } from '@/components/dashboard/platforms/PlatformBusinessContext';
import { PlatformLogo } from '@/components/dashboard/platforms/PlatformLogo';
import { PlatformStatusPill } from '@/components/dashboard/platforms/PlatformStatusPill';
import { PlatformProviderSkeleton } from '@/components/dashboard/platforms/PlatformSkeletons';
import { useFocusClearance } from '@/components/dashboard/platforms/useFocusClearance';
import { normalizeWhatsAppUrl, WHATSAPP_BRAND_GREEN } from '@/lib/whatsapp';
import {
  ACTIVE_BUSINESS_STORAGE_KEY,
  resolveActiveRestaurantId,
  setRestaurantParam,
} from '@/lib/active-business';
import { checkProviderUrl, describeDomainError, type DomainCheckResult } from '@/lib/integration-domains';
import {
  getManageablePlatformByProvider,
  PLATFORM_LINKS_LABEL,
  type ManageablePlatformDef,
  type PlatformEnabledField,
  type PlatformUrlField,
} from '@/lib/platform-management';
import {
  computePlatformLinkStatus,
  computePlatformLinkStatuses,
  formatRelativeTime,
  isPlatformLinkVisible,
  redirectThresholdLabel,
  summarizePlatformLinks,
  type LatestCheckLite,
} from '@/lib/platform-link-status';

export type ProviderRestaurantInfo = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  googlePlaceId: string | null;
  externalPlatformsEnabled: boolean;
  defaultRedirectPlatform: string | null;
  redirectMinRating: number | null;
  // Stage 97 — opt-in WhatsApp channel for low-rating customers on the
  // public review surface (CLAUDE.md §19.1).
  whatsappReviewEnabled?: boolean;
  whatsappReviewMessage?: string | null;
} & Record<PlatformUrlField, string | null> &
  Record<PlatformEnabledField, boolean>;

interface PlatformProviderWizardProps {
  locale: 'tr' | 'en';
  platform: ManageablePlatformDef;
  restaurants: ProviderRestaurantInfo[];
  selectedRestaurantId: string;
  /** Latest link check per provider for every scoped business, loaded on the
   *  server so the first render already shows the real status. */
  checksByRestaurant: Record<string, Record<string, LatestCheckLite>>;
  /** Server render time — keeps relative check times hydration-stable. */
  serverNow: number;
}

type ProviderChecks = Record<string, LatestCheckLite>;

const NO_CHECKS: ProviderChecks = {};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2';

const BUTTON_ROW_ITEM = `inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[13px] sm:min-h-[38px] sm:w-auto ${FOCUS_RING}`;

function readStoredRestaurantId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function CheckResultLine({
  check,
  locale,
  nowMs,
}: {
  check: LatestCheckLite;
  locale: 'tr' | 'en';
  nowMs: number;
}) {
  const isTr = locale === 'tr';
  const relative = formatRelativeTime(check.checkedAt, locale, nowMs);
  if (check.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[#F0FDF4] px-3 py-2 text-[12.5px] text-[#166534]">
        <CheckCircle2 size={14} className="shrink-0" aria-hidden="true" />
        <span>
          <strong>{isTr ? 'Link çalışıyor' : 'Link works'}</strong>
          <span className="ml-1">· {isTr ? `son kontrol ${relative}` : `checked ${relative}`}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12.5px] text-[#991B1B]">
      <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div>
          <strong>{isTr ? 'Son kontrol başarısız' : 'Last check failed'}</strong>
          <span className="ml-1">· {relative}</span>
        </div>
        {check.error && <div className="mt-0.5 break-words text-[12px] text-[#7F1D1D]">{check.error}</div>}
        <div className="mt-1 text-[11.5px] text-[#7F1D1D]">
          {isTr
            ? 'Bazı platformlar otomatik kontrolü engelleyebilir; link tarayıcıda yine de açılabilir.'
            : 'Some platforms block automated checks; the link may still open in a browser.'}
        </div>
      </div>
    </div>
  );
}

export default function PlatformProviderWizard({
  locale,
  platform,
  restaurants,
  selectedRestaurantId: initialSelectedRestaurantId,
  checksByRestaurant,
  serverNow,
}: PlatformProviderWizardProps) {
  const isTr = locale === 'tr';
  const searchParams = useSearchParams();
  const queryRestaurantId = searchParams.get('restaurantId') ?? searchParams.get('restaurant');
  const [restaurantRows, setRestaurantRows] = useState(restaurants);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(initialSelectedRestaurantId);
  const [resolved, setResolved] = useState<boolean>(() => Boolean(queryRestaurantId) || restaurants.length <= 1);
  const selectedRestaurant =
    restaurantRows.find((restaurant) => restaurant.id === selectedRestaurantId) ?? restaurantRows[0] ?? null;
  const selectedRestaurantRowId = selectedRestaurant?.id ?? null;
  const currentUrl = selectedRestaurant ? selectedRestaurant[platform.urlField] ?? '' : '';
  const currentEnabled =
    selectedRestaurant && platform.enabledField ? Boolean(selectedRestaurant[platform.enabledField]) : true;

  const [url, setUrl] = useState(currentUrl);
  const [enabled, setEnabled] = useState(currentEnabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Per-business check map (server snapshot + checks run in this session).
  // Never starts empty for a business that has checks — an empty set read a
  // failing link as "Bağlı" and offered "Varsayılan platform yap" on it.
  const [checksByBusiness, setChecksByBusiness] = useState(checksByRestaurant);
  // True once the owner ran "Kontrol et" in this session — only then is the
  // result rendered inside the live region (the persisted check loaded on
  // mount is shown statically so it is not announced on page load).
  const [freshCheck, setFreshCheck] = useState(false);
  const [nowMs, setNowMs] = useState(serverNow);
  const [defaultSaving, setDefaultSaving] = useState(false);
  const [routingMessage, setRoutingMessage] = useState('');
  const [routingError, setRoutingError] = useState(false);
  // Stage 97 — WhatsApp review opt-in wizard.
  const [whatsappWizardOpen, setWhatsappWizardOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const changeLinkRef = useRef<HTMLAnchorElement | null>(null);
  useFocusClearance();

  useEffect(() => {
    setRestaurantRows(restaurants);
  }, [restaurants]);

  useEffect(() => {
    setChecksByBusiness(checksByRestaurant);
  }, [checksByRestaurant]);

  const checks = useMemo<ProviderChecks>(
    () => (selectedRestaurantRowId ? checksByBusiness[selectedRestaurantRowId] ?? NO_CHECKS : NO_CHECKS),
    [checksByBusiness, selectedRestaurantRowId],
  );

  // Writes go to the business the action was started for, even if the owner
  // switched business while the request was in flight.
  const patchChecks = useCallback((restaurantId: string, update: (current: ProviderChecks) => ProviderChecks) => {
    setChecksByBusiness((all) => ({ ...all, [restaurantId]: update(all[restaurantId] ?? NO_CHECKS) }));
  }, []);

  useEffect(() => setNowMs(Date.now()), []);

  // Resolve the active business after mount (?restaurantId → remembered →
  // first) and keep the URL in sync without a server round trip.
  useEffect(() => {
    const next = resolveActiveRestaurantId({
      restaurants: restaurantRows,
      queryRestaurantId,
      storedRestaurantId: readStoredRestaurantId(),
    });
    if (!next) return;
    setSelectedRestaurantId(next);
    setResolved(true);
    if (queryRestaurantId !== next) {
      const search = setRestaurantParam(window.location.search, next);
      window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
    }
  }, [queryRestaurantId, restaurantRows]);

  // Resync the form ONLY when the selected business (or the platform page)
  // actually changes — keying on the row object re-ran after every save and
  // wiped the confirmation the moment it appeared.
  useEffect(() => {
    const row = restaurantRows.find((restaurant) => restaurant.id === selectedRestaurantRowId);
    if (!row) return;
    setUrl(row[platform.urlField] ?? '');
    setEnabled(platform.enabledField ? Boolean(row[platform.enabledField]) : true);
    setError(null);
    setSuccess(null);
    setRoutingMessage('');
    setRoutingError(false);
    setFreshCheck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.enabledField, platform.urlField, selectedRestaurantRowId]);

  const dirty = url !== currentUrl || enabled !== currentEnabled;
  const gated = selectedRestaurant?.externalPlatformsEnabled === false && platform.externalReview === true;

  // Leaving with unsaved edits (reload / tab close / external navigation).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const quality = useMemo<{ result: DomainCheckResult; message: string } | null>(() => {
    if (!url.trim()) return null;
    const result = checkProviderUrl(platform.provider, url);
    if (result.ok) return null;
    return { result, message: describeDomainError(platform.provider, result, locale) };
  }, [locale, platform.provider, url]);

  const hardError = quality?.result.severity === 'error' ? quality.message : null;
  const warning = quality?.result.severity === 'warning' ? quality.message : null;
  const lastCheck = checks[platform.provider] ?? null;

  const savedStatus = useMemo(
    () => (selectedRestaurant ? computePlatformLinkStatus(platform, selectedRestaurant, checks) : null),
    [checks, platform, selectedRestaurant],
  );
  const reviewSummary = useMemo(() => {
    if (!selectedRestaurant) return { connected: 0, issue: 0, missing: 0, off: 0 };
    return summarizePlatformLinks(
      computePlatformLinkStatuses(selectedRestaurant, checks, { categories: ['review'] }).filter(isPlatformLinkVisible),
    );
  }, [checks, selectedRestaurant]);

  const confirmDiscard = () =>
    window.confirm(
      isTr
        ? 'Kaydedilmemiş değişiklikler var. Devam ederseniz bu değişiklikler kaybolur. Devam edilsin mi?'
        : 'You have unsaved changes. Continue and discard them?',
    );

  const guardLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (dirty && !confirmDiscard()) event.preventDefault();
  };

  const selectRestaurant = (restaurantId: string) => {
    if (restaurantId === selectedRestaurantId) return;
    // Switching businesses resets the form — don't silently drop an edit.
    if (dirty && !confirmDiscard()) return;
    setSelectedRestaurantId(restaurantId);
    try {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
    } catch {
      /* storage blocked — URL still carries the selection */
    }
    window.dispatchEvent(new CustomEvent('buaze:active-restaurant-change', { detail: { restaurantId } }));
    const search = setRestaurantParam(window.location.search, restaurantId);
    window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
  };

  const updateSelectedRestaurant = (patch: Partial<ProviderRestaurantInfo>) => {
    if (!selectedRestaurant) return;
    setRestaurantRows((rows) =>
      rows.map((restaurant) => (restaurant.id === selectedRestaurant.id ? { ...restaurant, ...patch } : restaurant)),
    );
  };

  const saveBlocked = !dirty || saving || Boolean(hardError) || gated;

  const handleSave = async () => {
    if (!selectedRestaurant || saveBlocked) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    // The field stays editable while the PUT is in flight; remember what was
    // submitted so a newer edit is not overwritten when the save resolves.
    const submittedUrl = url;
    const payload: Record<string, string | boolean | null> = {
      [platform.urlField]: url.trim() || null,
    };
    if (platform.enabledField) payload[platform.enabledField] = enabled;
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || (isTr ? 'Kaydedilemedi.' : 'Could not save.'));
      }
      const savedUrl = (data?.[platform.urlField] ?? payload[platform.urlField] ?? '') as string;
      const nextPatch: Partial<ProviderRestaurantInfo> = {
        [platform.urlField]: savedUrl || null,
        defaultRedirectPlatform:
          data?.defaultRedirectPlatform === undefined
            ? selectedRestaurant.defaultRedirectPlatform
            : data.defaultRedirectPlatform,
      } as Partial<ProviderRestaurantInfo>;
      if (platform.enabledField) {
        Object.assign(nextPatch, {
          [platform.enabledField]: Boolean(data?.[platform.enabledField] ?? payload[platform.enabledField]),
        });
      }
      // A new URL invalidates the previous check result.
      if ((savedUrl || '').trim() !== currentUrl.trim()) {
        patchChecks(selectedRestaurant.id, (current) => {
          const next = { ...current };
          delete next[platform.provider];
          return next;
        });
        setFreshCheck(false);
      }
      updateSelectedRestaurant(nextPatch);
      setUrl((latest) => (latest === submittedUrl ? savedUrl : latest));
      setSuccess(isTr ? 'Link kaydedildi.' : 'Link saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : isTr ? 'Kaydedilemedi.' : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setUrl(currentUrl);
    setEnabled(currentEnabled);
    setError(null);
    setSuccess(null);
    // The Discard button unmounts once the form is clean — keep focus nearby.
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const runTest = async () => {
    if (!selectedRestaurant || testing || dirty || gated || !currentUrl) return;
    const testedRestaurantId = selectedRestaurant.id;
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/restaurants/${testedRestaurantId}/integrations/${platform.provider}/test?locale=${locale}`,
        { method: 'POST' },
      );
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        // Throttled — NOT a broken link; never write a fake failed check.
        const retryAfter = Number(response.headers.get('Retry-After') || '0');
        setError(
          isTr
            ? `Çok sık kontrol edildi. ${retryAfter > 0 ? `${retryAfter} sn sonra` : 'Biraz sonra'} tekrar deneyin.`
            : `Too many checks. Try again ${retryAfter > 0 ? `in ${retryAfter}s` : 'shortly'}.`,
        );
        return;
      }
      if (!response.ok) {
        throw new Error(data?.error || (isTr ? 'Kontrol yapılamadı.' : 'Could not run the check.'));
      }
      patchChecks(testedRestaurantId, (current) => ({
        ...current,
        [platform.provider]: {
          ok: Boolean(data.ok),
          statusCode: typeof data.statusCode === 'number' ? data.statusCode : null,
          error: data.error ?? null,
          checkedAt: data.checkedAt ?? new Date().toISOString(),
        },
      }));
      setNowMs(Date.now());
      setFreshCheck(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : isTr ? 'Kontrol yapılamadı.' : 'Could not run the check.');
    } finally {
      setTesting(false);
    }
  };

  const makeDefault = async () => {
    if (!selectedRestaurant || defaultSaving) return;
    setDefaultSaving(true);
    setRoutingMessage('');
    setRoutingError(false);
    setError(null);
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultRedirectPlatform: platform.provider }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || (isTr ? 'Varsayılan kaydedilemedi.' : 'Could not save the default.'));
      }
      updateSelectedRestaurant({ defaultRedirectPlatform: platform.provider });
      setRoutingMessage(isTr ? 'Varsayılan platform güncellendi.' : 'Default platform updated.');
      // The button unmounts once this platform is the default.
      window.requestAnimationFrame(() => changeLinkRef.current?.focus());
    } catch (err) {
      setRoutingError(true);
      setRoutingMessage(
        err instanceof Error && err.message ? err.message : isTr ? 'Varsayılan kaydedilemedi.' : 'Could not save the default.',
      );
    } finally {
      setDefaultSaving(false);
    }
  };

  if (!resolved) return <PlatformProviderSkeleton />;
  if (!selectedRestaurant || !savedStatus) return null;

  const linksLabel = isTr ? PLATFORM_LINKS_LABEL.tr : PLATFORM_LINKS_LABEL.en;
  const overviewHref = `/${locale}/dashboard/platforms?restaurantId=${encodeURIComponent(selectedRestaurant.id)}`;
  const isWhatsApp = platform.slug === 'whatsapp';
  const isReview = platform.category === 'review';
  const trimmedUrl = url.trim();
  const fieldId = `platform-url-${platform.slug}`;
  const warningId = `${fieldId}-warn`;
  const defaultProvider = selectedRestaurant.defaultRedirectPlatform;
  const defaultPlatform = defaultProvider ? getManageablePlatformByProvider(defaultProvider) : null;
  // A stored default whose link is missing / off / admin-locked is skipped by
  // the public resolver — say so instead of implying it is still in use.
  const defaultUnusable = defaultPlatform
    ? ['missing', 'off', 'locked'].includes(computePlatformLinkStatus(defaultPlatform, selectedRestaurant, checks).state)
    : false;
  const defaultName = defaultProvider
    ? `${defaultPlatform?.name ?? defaultProvider}${
        defaultUnusable ? (isTr ? ' (şu an kullanılamıyor — otomatik seçiliyor)' : ' (unavailable — picking automatically)') : ''
      }`
    : isTr
      ? 'Otomatik'
      : 'Automatic';
  const canMakeDefault = isReview && savedStatus.state === 'connected' && !savedStatus.isDefault;

  const cardDescription = isWhatsApp
    ? isTr
      ? 'Müşterilerin size WhatsApp’tan yazacağı adres.'
      : 'Where customers message you on WhatsApp.'
    : isReview
      ? isTr
        ? 'Müşterilerin yorum bırakacağı sayfanın adresi.'
        : 'The page where customers leave a review.'
      : isTr
        ? 'Müşteri sayfanızda gösterilecek profil adresi.'
        : 'The profile address shown on your customer page.';

  const fieldLabel = isWhatsApp
    ? isTr
      ? 'WhatsApp linki'
      : 'WhatsApp link'
    : isTr
      ? `${platform.name} sayfa linki`
      : `${platform.name} page link`;

  const fieldHint = isWhatsApp
    ? isTr
      ? `Numaranızı wa.me linki olarak yapıştırın. Örnek: ${platform.placeholder}`
      : `Paste your number as a wa.me link. Example: ${platform.placeholder}`
    : isTr
      ? `İşletmenizin ${platform.name} sayfasını açın, adres çubuğundaki linki kopyalayıp buraya yapıştırın. Örnek: ${platform.placeholder}`
      : `Open your business page on ${platform.name}, copy the address bar link and paste it here. Example: ${platform.placeholder}`;

  return (
    <>
      <div>
        <Link
          href={overviewHref}
          onClick={guardLeave}
          className={`bz-mono mb-3 inline-flex min-h-[44px] items-center sm:min-h-[32px] gap-1 rounded text-[11px] text-[#737373] hover:text-[#0A0A0A] ${FOCUS_RING}`}
        >
          <ArrowLeft size={12} aria-hidden="true" />
          {linksLabel}
        </Link>
        <PageHeader
          titleScale="compact"
          eyebrow={linksLabel.toLocaleUpperCase(isTr ? 'tr-TR' : 'en-US')}
          title={
            <span className="inline-flex min-w-0 items-center gap-3">
              <PlatformLogo platform={platform} size={36} />
              <span className="min-w-0 break-words">{platform.name}</span>
            </span>
          }
          description={
            isTr
              ? `${selectedRestaurant.name} için ${platform.name} linki`
              : `${platform.name} link for ${selectedRestaurant.name}`
          }
          actions={<PlatformStatusPill state={savedStatus.state} locale={locale} />}
        />
      </div>

      {restaurantRows.length > 1 && (
        <PlatformBusinessContext
          locale={locale}
          restaurant={selectedRestaurant}
          restaurants={restaurantRows}
          summary={reviewSummary}
          onSelect={selectRestaurant}
        />
      )}

      {gated && (
        <AlertBanner kind="warn">
          {isTr
            ? 'Google dışındaki yorum platformları bu işletme için kapalı. Kayıtlı link korunur; müşterilere önerilmez ve kontrol edilmez.'
            : 'Review platforms other than Google are off for this business. The saved link is kept, but it is not offered to customers or checked.'}
        </AlertBanner>
      )}

      {platform.slug === 'google' && (
        <GoogleBusinessIntegrationPanel
          restaurant={selectedRestaurant}
          locale={locale}
          dirty={dirty}
          returnTo={`/${locale}/dashboard/platforms/google?restaurantId=${selectedRestaurant.id}`}
          onGoogleLinkSelected={(next) => {
            updateSelectedRestaurant({
              googlePlaceId: next.googlePlaceId,
              googleReviewUrl: next.googleReviewUrl,
              googleEnabled: next.googleEnabled,
            });
            // Keep the form in step with the saved row so it doesn't read as
            // an unsaved edit.
            setUrl(next.googleReviewUrl ?? '');
            setEnabled(next.googleEnabled);
            patchChecks(selectedRestaurant.id, (current) => {
              const copy = { ...current };
              delete copy.google;
              return copy;
            });
            setFreshCheck(false);
            setSuccess(isTr ? 'Google linki güncellendi.' : 'Google link updated.');
          }}
        />
      )}

      <SettingsCard title="Link" description={cardDescription}>
        <div className="space-y-4">
          {error && (
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          )}

          <Field label={fieldLabel} hint={fieldHint} htmlFor={fieldId} error={hardError ?? undefined}>
            <input
              ref={inputRef}
              id={fieldId}
              aria-describedby={warning ? warningId : undefined}
              className="bz-input bz-mono w-full text-[16px] sm:text-[13px]"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setSuccess(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSave();
                }
              }}
              placeholder={platform.placeholder}
              disabled={gated}
            />
          </Field>

          {warning && (
            <div
              id={warningId}
              className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] px-3 py-2 text-[12px] leading-snug text-[#92400E]"
            >
              <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{warning}</span>
            </div>
          )}

          {platform.enabledField && (
            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0A0A0A] has-[:focus-visible]:ring-offset-2">
              <APSwitch
                size="lg"
                className="min-h-[44px] w-full"
                label={isTr ? 'Müşterilere göster' : 'Show to customers'}
                sublabel={
                  <span className="text-[#525252]">
                    {!trimmedUrl
                      ? isTr
                        ? 'Link ekledikten sonra açabilirsiniz.'
                        : 'Available once a link is added.'
                      : isTr
                        ? 'Kapalıyken link kayıtlı kalır ama müşterilere önerilmez.'
                        : 'When off, the link stays saved but is not offered to customers.'}
                  </span>
                }
                // UI only: an empty link reads as off; the saved flag is untouched
                // unless the owner toggles it.
                checked={enabled && Boolean(trimmedUrl)}
                disabled={!trimmedUrl}
                locked={gated}
                onChange={(next) => {
                  setEnabled(next);
                  setSuccess(null);
                }}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={handleSave}
                // aria-disabled keeps focus on the button after a save (a
                // disabled focused button would drop focus to <body>).
                aria-disabled={saveBlocked || undefined}
                className={`bz-btn-primary ${BUTTON_ROW_ITEM}`}
                // `.bz-btn-primary` is unlayered CSS, so Tailwind `aria-disabled:`
                // utilities can't override it — mirror its :disabled look inline.
                style={
                  saveBlocked && !saving
                    ? { background: '#EDEDED', color: '#525252', cursor: 'not-allowed', transform: 'none' }
                    : undefined
                }
              >
                {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : isTr ? 'Kaydet' : 'Save'}
              </button>
              {dirty && (
                <button type="button" onClick={handleReset} className={`bz-btn-ghost ${BUTTON_ROW_ITEM}`}>
                  {isTr ? 'Vazgeç' : 'Discard'}
                </button>
              )}
              <button
                type="button"
                onClick={runTest}
                disabled={!currentUrl || dirty || gated}
                aria-disabled={testing || undefined}
                aria-busy={testing || undefined}
                title={
                  dirty
                    ? isTr
                      ? 'Önce kaydedin'
                      : 'Save first'
                    : !currentUrl
                      ? isTr
                        ? 'Önce bir link kaydedin'
                        : 'Save a link first'
                      : undefined
                }
                className={`bz-btn-ghost ${BUTTON_ROW_ITEM} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {testing ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={14} aria-hidden="true" />
                )}
                {testing ? (isTr ? 'Kontrol ediliyor…' : 'Checking…') : isTr ? 'Kontrol et' : 'Check link'}
              </button>
              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={
                    isTr ? `${platform.name} linkini yeni sekmede aç` : `Open ${platform.name} link in a new tab`
                  }
                  className={`bz-btn-ghost ${BUTTON_ROW_ITEM}`}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {isTr ? 'Linki aç' : 'Open link'}
                </a>
              )}
              {url && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl('');
                    setSuccess(null);
                    // The button unmounts — keep keyboard focus in the form.
                    window.requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  disabled={gated}
                  title={isTr ? 'Link temizlenir; Kaydet ile kalıcı olur.' : 'Clears the link; Save to persist.'}
                  className={`bz-btn-danger ${BUTTON_ROW_ITEM}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  {isTr ? 'Linki temizle' : 'Clear link'}
                </button>
              )}
            </div>
            {dirty && currentUrl && !gated && (
              <p className="text-[12px] text-[#525252]">
                {isTr ? 'Kontrol etmek için önce kaydedin.' : 'Save before checking.'}
              </p>
            )}
          </div>

          {/* Polite live region: save confirmation + results of a check the
              owner just ran. Always mounted so changes are announced. */}
          <div role="status" aria-live="polite" aria-atomic="true" className="space-y-2">
            {success && !dirty && (
              <div className="flex items-center gap-2 rounded-lg bg-[#F0FDF4] px-3 py-2 text-[12.5px] font-medium text-[#166534]">
                <CheckCircle2 size={14} className="shrink-0" aria-hidden="true" />
                {success}
              </div>
            )}
            {freshCheck && lastCheck && !dirty && (
              <CheckResultLine check={lastCheck} locale={locale} nowMs={nowMs} />
            )}
          </div>
          {/* A leftover check for a link that has since been cleared reads as
              "failed" next to an "Eksik" pill — only show it for a saved URL. */}
          {!freshCheck && lastCheck && currentUrl && !dirty && !gated && (
            <CheckResultLine check={lastCheck} locale={locale} nowMs={nowMs} />
          )}
        </div>
      </SettingsCard>

      {/* Stage 97 — WhatsApp review opt-in marker + wizard CTA (unchanged
          behaviour). Gated until the saved URL normalises cleanly. */}
      {isWhatsApp &&
        (() => {
          const persistedUrl = selectedRestaurant.whatsappUrl ?? '';
          const normalized = normalizeWhatsAppUrl(persistedUrl);
          const hasValidUrl = normalized.ok;
          const reviewEnabled = selectedRestaurant.whatsappReviewEnabled === true;
          const wizardDisabled = !hasValidUrl || dirty;
          const wizardDisabledReason = !hasValidUrl
            ? isTr
              ? 'Önce geçerli bir WhatsApp numarası kaydet.'
              : 'Save a valid WhatsApp number first.'
            : dirty
              ? isTr
                ? 'Önce yukarıdaki değişiklikleri kaydet.'
                : 'Save the pending changes first.'
              : undefined;
          return (
            <SettingsCard
              icon={<MessageCircle size={18} strokeWidth={2} style={{ color: WHATSAPP_BRAND_GREEN }} />}
              title={isTr ? 'Değerlendirme sayfasında WhatsApp' : 'WhatsApp on review page'}
              description={
                isTr
                  ? '1–3 yıldız veren müşteriler değerlendirme sayfası sonunda WhatsApp hattınızı görür. Otomatik mesaj gönderilmez — müşteri butona tıklayınca uygulama kendi mesajıyla açılır.'
                  : 'Customers who rate 1–3★ see your WhatsApp line at the end of the review page. No auto-send — WhatsApp only opens when the customer taps.'
              }
              actions={
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
                  style={{
                    background: hasValidUrl ? (reviewEnabled ? '#EAF9B8' : '#F5F5F5') : '#FEF3C7',
                    color: hasValidUrl ? (reviewEnabled ? '#0A0A0A' : '#525252') : '#92400E',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: hasValidUrl ? (reviewEnabled ? '#A8D62E' : '#A3A3A3') : '#F59E0B' }}
                  />
                  {hasValidUrl
                    ? reviewEnabled
                      ? isTr
                        ? 'Aktif'
                        : 'Active'
                      : isTr
                        ? 'Pasif'
                        : 'Off'
                    : isTr
                      ? 'Numara gerekli'
                      : 'Number required'}
                </span>
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12.5px] leading-[1.55] text-[#525252]">
                  {hasValidUrl
                    ? reviewEnabled
                      ? isTr
                        ? 'Müşteri 1–3 yıldız verirse WhatsApp butonu görünür. Mesaj şablonunu sihirbazdan düzenleyebilirsin.'
                        : 'Customers giving 1–3★ see the WhatsApp button. Open the wizard to tweak the message template.'
                      : isTr
                        ? 'Bu özellik şu an pasif. Sihirbazı açıp etkinleştirebilirsin.'
                        : 'Currently off. Open the wizard to enable.'
                    : isTr
                      ? 'Üstte geçerli bir numara veya wa.me linki kaydet, sonra sihirbazı aç.'
                      : 'Save a valid number or wa.me link above, then open the wizard.'}
                </p>
                <button
                  type="button"
                  onClick={() => setWhatsappWizardOpen(true)}
                  disabled={wizardDisabled}
                  title={wizardDisabledReason}
                  className={`bz-btn-primary inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[38px] sm:w-auto ${FOCUS_RING}`}
                >
                  <Wand2 size={13} strokeWidth={2.2} aria-hidden="true" />
                  {isTr ? 'Sihirbazı aç' : 'Open wizard'}
                </button>
              </div>
            </SettingsCard>
          );
        })()}

      {/* Business-level routing lives on the overview (#yonlendirme); the
          provider page only summarises it and offers "make default". */}
      {isReview && (
        <SettingsCard title={isTr ? 'Müşteri yönlendirme' : 'Customer routing'}>
          <p className="text-[13px] leading-[1.6] text-[#525252]">
            {isTr ? 'Platform önerilen puan: ' : 'Suggested from: '}
            <strong className="font-semibold text-[#0A0A0A]">
              {redirectThresholdLabel(selectedRestaurant.redirectMinRating, locale)}
            </strong>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {isTr ? 'Varsayılan platform: ' : 'Default platform: '}
            <strong className="font-semibold text-[#0A0A0A]">{defaultName}</strong>
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {canMakeDefault && (
              <button
                type="button"
                onClick={makeDefault}
                aria-disabled={defaultSaving || undefined}
                aria-busy={defaultSaving || undefined}
                className={`bz-btn-ghost ${BUTTON_ROW_ITEM}`}
              >
                {defaultSaving ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Star size={14} aria-hidden="true" />
                )}
                {isTr ? 'Varsayılan platform yap' : 'Make default'}
              </button>
            )}
            <Link
              ref={changeLinkRef}
              href={`${overviewHref}#yonlendirme`}
              onClick={guardLeave}
              className={`inline-flex min-h-[44px] items-center justify-center rounded px-1 text-[13px] font-semibold text-[#0A0A0A] underline underline-offset-2 sm:min-h-[38px] sm:justify-start ${FOCUS_RING}`}
            >
              {isTr ? 'Değiştir' : 'Change'}
            </Link>
          </div>
          {/* Always mounted (live region); takes no space while empty. */}
          <p
            role="status"
            aria-live="polite"
            className={`text-[12.5px] [&:not(:empty)]:mt-2 ${routingError ? 'text-[#991B1B]' : 'text-[#166534]'}`}
          >
            {routingMessage}
          </p>
        </SettingsCard>
      )}

      {whatsappWizardOpen && isWhatsApp && (
        <WhatsAppReviewWizard
          restaurantId={selectedRestaurant.id}
          initialWhatsappUrl={selectedRestaurant.whatsappUrl ?? ''}
          initialMessage={selectedRestaurant.whatsappReviewMessage ?? null}
          initialEnabled={selectedRestaurant.whatsappReviewEnabled === true}
          restaurantName={selectedRestaurant.name}
          locale={locale}
          onClose={() => setWhatsappWizardOpen(false)}
          onSaved={(partial) => {
            updateSelectedRestaurant({
              whatsappUrl: partial.whatsappUrl,
              whatsappReviewEnabled: partial.whatsappReviewEnabled,
              whatsappReviewMessage: partial.whatsappReviewMessage,
            });
            setUrl(partial.whatsappUrl ?? '');
            setSuccess(isTr ? 'WhatsApp ayarları güncellendi.' : 'WhatsApp settings updated.');
          }}
        />
      )}
    </>
  );
}
