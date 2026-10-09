'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  Plug,
  RefreshCw,
  Trash2,
  Wand2,
  XCircle,
} from 'lucide-react';
import {
  AlertBanner,
  APSwitch,
  Badge,
  Field,
  PlatformChip,
  PulseSelect,
  type PlatformId,
} from '@/components/ui';
import DefaultRedirectPicker from '@/components/dashboard/DefaultRedirectPicker';
import RedirectThresholdPicker from '@/components/dashboard/RedirectThresholdPicker';
import { SettingsCard } from '@/components/dashboard/settings/SettingsCard';
import { UnsavedChangesBar } from '@/components/dashboard/settings/UnsavedChangesBar';
import { GoogleBusinessIntegrationPanel } from '@/components/dashboard/settings/sections/GoogleBusinessIntegrationPanel';
import { WhatsAppReviewWizard } from '@/components/dashboard/settings/WhatsAppReviewWizard';
import { normalizeWhatsAppUrl, WHATSAPP_BRAND_GREEN } from '@/lib/whatsapp';
import { ACTIVE_BUSINESS_STORAGE_KEY, setRestaurantParam } from '@/lib/active-business';
import { checkProviderUrl, describeDomainError, type DomainCheckResult } from '@/lib/integration-domains';
import {
  MANAGED_REVIEW_PLATFORMS,
  type ManageablePlatformDef,
} from '@/lib/platform-management';
import { getSectorPlatforms } from '@/lib/sector-platforms';

export interface ProviderRestaurantInfo {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  googlePlaceId: string | null;
  googleReviewUrl: string | null;
  googleEnabled: boolean;
  yemekSepetiUrl: string | null;
  yemekSepetiEnabled: boolean;
  getirYemekUrl: string | null;
  getirEnabled: boolean;
  trendyolYemekUrl: string | null;
  trendyolEnabled: boolean;
  tripAdvisorUrl: string | null;
  tripAdvisorEnabled: boolean;
  airbnbUrl: string | null;
  airbnbEnabled: boolean;
  bookingUrl: string | null;
  bookingEnabled: boolean;
  yandexUrl: string | null;
  yandexEnabled: boolean;
  yelpUrl: string | null;
  yelpEnabled: boolean;
  foursquareUrl: string | null;
  foursquareEnabled: boolean;
  externalPlatformsEnabled: boolean;
  defaultRedirectPlatform: string | null;
  redirectMinRating: number | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  // Stage 97 — opt-in WhatsApp channel for low-rating customers on the
  // public review surface (CLAUDE.md §19.1). Owner toggles via the
  // wizard mounted on this page when `platform.slug === 'whatsapp'`.
  whatsappReviewEnabled?: boolean;
  whatsappReviewMessage?: string | null;
  reservationUrl: string | null;
  website: string | null;
  otherPlatformUrl: string | null;
  otherPlatformLabel: string | null;
  otherPlatformEnabled: boolean;
}

interface LatestCheck {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
  source: string;
}

interface PlatformProviderWizardProps {
  locale: 'tr' | 'en';
  platform: ManageablePlatformDef;
  restaurants: ProviderRestaurantInfo[];
  selectedRestaurantId: string;
}

function formatRelative(iso: string, locale: 'tr' | 'en') {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return locale === 'tr' ? 'az önce' : 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'tr' ? 'az önce' : 'just now';
  if (mins < 60) return locale === 'tr' ? `${mins} dk önce` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'tr' ? `${hours} sa önce` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === 'tr' ? `${days} gün önce` : `${days}d ago`;
}

function getLogoSrc(platform: ManageablePlatformDef): string | null {
  if (platform.uiPlatformId) {
    const fileName =
      platform.uiPlatformId === 'trendyol' || platform.uiPlatformId === 'trendyol_go'
        ? 'trendyol-go'
        : platform.uiPlatformId;
    return `/platforms/${fileName}.svg`;
  }
  if (platform.logoFile) return `/platforms/${platform.logoFile}.svg`;
  return null;
}

function PlatformMark({ platform }: { platform: ManageablePlatformDef }) {
  if (platform.uiPlatformId) {
    return <PlatformChip id={platform.uiPlatformId} size={40} />;
  }
  const logoSrc = getLogoSrc(platform);
  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={platform.name}
        className="h-10 w-10 rounded-[10px] border border-[#EDEDED] bg-white object-contain p-2"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center rounded-[10px] border text-[13px] font-semibold"
      style={{
        color: platform.accent,
        borderColor: `${platform.accent}30`,
        backgroundColor: `${platform.accent}14`,
      }}
    >
      {platform.initials}
    </span>
  );
}

function LatestCheckLine({ check, locale }: { check: LatestCheck; locale: 'tr' | 'en' }) {
  const isTr = locale === 'tr';
  const relative = formatRelative(check.checkedAt, locale);
  if (check.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[#F0FDF4] px-3 py-2 text-[12px] text-[#166534]">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>
          <strong>{isTr ? 'Başarılı' : 'Successful'}</strong>
          <span className="ml-1 text-[#15803D]">· {relative}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
      <XCircle size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div>
          <strong>{isTr ? 'Son test başarısız' : 'Last test failed'}</strong>
          <span className="ml-1 text-[#7F1D1D]">· {relative}</span>
        </div>
        {check.error && <div className="mt-0.5 break-words text-[11px] text-[#7F1D1D]">{check.error}</div>}
      </div>
    </div>
  );
}

export default function PlatformProviderWizard({
  locale,
  platform,
  restaurants,
  selectedRestaurantId: initialSelectedRestaurantId,
}: PlatformProviderWizardProps) {
  const isTr = locale === 'tr';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurantRows, setRestaurantRows] = useState(restaurants);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(initialSelectedRestaurantId);
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
  const [latestCheck, setLatestCheck] = useState<LatestCheck | null>(null);
  // Stage 97 — WhatsApp review opt-in wizard. Modal owns its own staged
  // state and PUTs directly; on save we forward the partial back into
  // the local restaurantRows so the marker pill flips immediately.
  const [whatsappWizardOpen, setWhatsappWizardOpen] = useState(false);

  useEffect(() => {
    setRestaurantRows(restaurants);
  }, [restaurants]);

  // Resync the form ONLY when the selected business (or the platform page)
  // actually changes. Keying on the row object made this effect re-run after
  // every successful save — `updateSelectedRestaurant` replaces the row —
  // which wiped the "Bağlantı kaydedildi" confirmation the moment it appeared.
  useEffect(() => {
    const row = restaurantRows.find((restaurant) => restaurant.id === selectedRestaurantRowId);
    if (!row) return;
    setUrl(row[platform.urlField] ?? '');
    setEnabled(platform.enabledField ? Boolean(row[platform.enabledField]) : true);
    setError(null);
    setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.enabledField, platform.urlField, selectedRestaurantRowId]);

  useEffect(() => {
    if (!selectedRestaurantRowId) return;
    let cancelled = false;
    fetch(`/api/restaurants/${selectedRestaurantRowId}/integrations/checks`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setLatestCheck((data?.checks?.[platform.provider] as LatestCheck | undefined) ?? null);
      })
      .catch(() => {
        if (!cancelled) setLatestCheck(null);
      });
    return () => {
      cancelled = true;
    };
  }, [platform.provider, selectedRestaurantRowId]);

  const dirty = url !== currentUrl || enabled !== currentEnabled;
  const gated =
    selectedRestaurant?.externalPlatformsEnabled === false && platform.externalReview === true;

  const quality = useMemo<{
    result: DomainCheckResult;
    message: string;
  } | null>(() => {
    if (!url.trim()) return null;
    const result = checkProviderUrl(platform.provider, url);
    if (result.ok) return null;
    return {
      result,
      message: describeDomainError(platform.provider, result, locale),
    };
  }, [locale, platform.provider, url]);

  const hardError = quality?.result.severity === 'error' ? quality.message : null;
  const warning = quality?.result.severity === 'warning' ? quality.message : null;
  const configured = Boolean(currentUrl && currentUrl.trim());
  const active = configured && currentEnabled && !gated;
  const statusLabel = gated
    ? isTr
      ? 'Kilitli'
      : 'Locked'
    : active
      ? isTr
        ? 'Bağlı'
        : 'Connected'
      : configured
        ? isTr
          ? 'Pasif'
          : 'Inactive'
        : isTr
          ? 'Hazır'
          : 'Ready';
  const statusKind = gated ? 'warn' : active ? 'ok' : configured ? 'warn' : 'ghost';

  const enabledPlatformIds = useMemo<PlatformId[]>(() => {
    if (!selectedRestaurant) return [];
    const allowed = getSectorPlatforms(selectedRestaurant.category);
    const storedDefault = selectedRestaurant.defaultRedirectPlatform;
    return MANAGED_REVIEW_PLATFORMS.filter((item) => {
      if (!item.uiPlatformId) return false;
      // Sector whitelist decides what we OFFER, but a platform that is
      // already the stored default must stay visible even when it is
      // outside the sector list — otherwise the picker flagged a perfectly
      // valid Tripadvisor default on a clinic as an "orphan" and offered to
      // clear it (the public resolver honours the default regardless of
      // sector).
      const isStoredDefault = storedDefault !== null && item.provider === storedDefault;
      if (!allowed.has(item.uiPlatformId) && !isStoredDefault) return false;
      if (item.externalReview && selectedRestaurant.externalPlatformsEnabled === false) return false;
      const itemUrl = selectedRestaurant[item.urlField];
      const itemEnabled = item.enabledField ? Boolean(selectedRestaurant[item.enabledField]) : true;
      return Boolean(itemUrl && itemEnabled);
    }).map((item) => item.uiPlatformId as PlatformId);
  }, [selectedRestaurant]);

  const selectRestaurant = (restaurantId: string) => {
    if (restaurantId === selectedRestaurantId) return;
    // Switching businesses resets the form — don't silently drop an unsaved
    // URL/toggle edit.
    if (dirty) {
      const proceed = window.confirm(
        isTr
          ? 'Kaydedilmemiş değişiklikler var. İşletme değiştirirsen bu değişiklikler kaybolur. Devam edilsin mi?'
          : 'You have unsaved changes. Switching business will discard them. Continue?',
      );
      if (!proceed) return;
    }
    setSelectedRestaurantId(restaurantId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
    }
    const nextSearch = setRestaurantParam(searchParams.toString(), restaurantId);
    router.replace(`/${locale}/dashboard/platforms/${platform.slug}?${nextSearch}`, { scroll: false });
  };

  const updateSelectedRestaurant = (patch: Partial<ProviderRestaurantInfo>) => {
    if (!selectedRestaurant) return;
    setRestaurantRows((rows) =>
      rows.map((restaurant) =>
        restaurant.id === selectedRestaurant.id ? { ...restaurant, ...patch } : restaurant,
      ),
    );
  };

  const handleSave = async () => {
    if (!selectedRestaurant || saving) return;
    if (gated) {
      setError(
        isTr
          ? 'Google dışındaki yorum platformları bu işletme için kapalı.'
          : 'Non-Google review platforms are disabled for this business.',
      );
      return;
    }
    if (hardError) {
      setError(hardError);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
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
      const nextPatch: Partial<ProviderRestaurantInfo> = {
        [platform.urlField]: data?.[platform.urlField] ?? payload[platform.urlField],
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
      updateSelectedRestaurant(nextPatch);
      setSuccess(isTr ? 'Bağlantı kaydedildi.' : 'Connection saved.');
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
  };

  const runTest = async () => {
    if (!selectedRestaurant || testing) return;
    if (dirty) {
      setError(isTr ? 'Test etmeden önce kaydet.' : 'Save before testing.');
      return;
    }
    if (gated) {
      setError(
        isTr
          ? 'Bu platform admin tarafından kapalı.'
          : 'This platform is disabled by admin.',
      );
      return;
    }
    setTesting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/restaurants/${selectedRestaurant.id}/integrations/${platform.provider}/test?locale=${locale}`,
        { method: 'POST' },
      );
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        // Throttled — this is NOT a broken link. Surface it as a notice
        // instead of writing a fake failed check into the badge.
        const retryAfter = Number(response.headers.get('Retry-After') || '0');
        setError(
          isTr
            ? `Çok fazla test isteği. ${retryAfter > 0 ? `${retryAfter} sn sonra` : 'Birazdan'} tekrar dene.`
            : `Too many test requests. Try again ${retryAfter > 0 ? `in ${retryAfter}s` : 'shortly'}.`,
        );
        return;
      }
      if (!response.ok) {
        throw new Error(data?.error || (isTr ? 'Test başarısız.' : 'Test failed.'));
      }
      setLatestCheck({
        ok: data.ok ?? false,
        statusCode: data.statusCode ?? null,
        latencyMs: data.latencyMs ?? null,
        error: data.error ?? null,
        checkedAt: data.checkedAt ?? new Date().toISOString(),
        source: 'manual',
      });
    } catch (err) {
      setLatestCheck({
        ok: false,
        statusCode: null,
        latencyMs: null,
        error: err instanceof Error ? err.message : isTr ? 'Test başarısız.' : 'Test failed.',
        checkedAt: new Date().toISOString(),
        source: 'manual',
      });
    } finally {
      setTesting(false);
    }
  };

  if (!selectedRestaurant) return null;

  return (
    <div className="space-y-5 pb-24">
      <div className="bz-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <PlatformMark platform={platform} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="bz-h-tight text-[20px] font-semibold tracking-[-0.02em] text-[#0A0A0A]">
                  {platform.name}
                </h2>
                <Badge kind={statusKind}>{statusLabel}</Badge>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#525252]">
                {selectedRestaurant.name} - {isTr ? platform.categoryLabel.tr : platform.categoryLabel.en}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {restaurantRows.length > 1 && (
              <PulseSelect
                value={selectedRestaurant.id}
                onChange={selectRestaurant}
                ariaLabel={isTr ? 'İşletme seç' : 'Select business'}
                className="min-w-[220px]"
                options={restaurantRows.map((restaurant) => ({
                  value: restaurant.id,
                  label: restaurant.name,
                }))}
              />
            )}
            <Link href={`/${locale}/dashboard/platforms?restaurantId=${selectedRestaurant.id}`} className="bz-btn">
              <ArrowLeft size={13} strokeWidth={2} />
              {isTr ? 'Platformlara dön' : 'Back to platforms'}
            </Link>
          </div>
        </div>
      </div>

      {gated && (
        <AlertBanner kind="warn">
          {isTr
            ? 'Google dışındaki yorum platformları bu işletme için admin tarafından kapalı. Kayıtlı URL korunur, fakat müşteri akışı ve testler pasif kalır.'
            : 'Non-Google review platforms are disabled for this business by admin. Saved URLs are preserved, but customer routing and tests remain inactive.'}
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
            setSuccess(isTr ? 'Google bağlantısı güncellendi.' : 'Google connection updated.');
          }}
        />
      )}

      <SettingsCard
        icon={<Plug size={18} />}
        title={isTr ? 'Bağlantı' : 'Connection'}
        description={
          isTr
            ? 'URL, durum ve son test bilgisi.'
            : 'URL, state, and latest test result.'
        }
        actions={<Badge kind={statusKind}>{statusLabel}</Badge>}
      >
        <div className="space-y-4">
          {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}
          {success && !dirty && <AlertBanner kind="success" onDismiss={() => setSuccess(null)}>{success}</AlertBanner>}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <Field
              label="URL"
              htmlFor={`platform-url-${platform.slug}`}
              error={hardError ?? undefined}
            >
              <input
                id={`platform-url-${platform.slug}`}
                className="bz-input bz-mono w-full text-[16px] sm:text-[13px]"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setSuccess(null);
                  setLatestCheck(null);
                }}
                placeholder={platform.placeholder}
                disabled={gated}
              />
            </Field>

            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
              <div className="pulse-eyebrow text-[#737373]">
                {isTr ? 'DURUM' : 'STATE'}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <Badge kind={statusKind}>{statusLabel}</Badge>
                {platform.enabledField ? (
                  <APSwitch
                    checked={enabled}
                    onChange={(next) => {
                      setEnabled(next);
                      setSuccess(null);
                    }}
                    disabled={gated}
                    ariaLabel={isTr ? `${platform.name} aktif` : `${platform.name} active`}
                  />
                ) : (
                  <span className="text-[12px] text-[#737373]">
                    {url ? (isTr ? 'URL aktif' : 'URL active') : 'URL'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {warning && (
            <div className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] px-3 py-2 text-[12px] leading-snug text-[#92400E]">
              <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {latestCheck && <LatestCheckLine check={latestCheck} locale={locale} />}

          {dirty && currentUrl && !hardError && !gated && (
            <p className="text-[12px] text-[#737373]">
              {isTr
                ? 'Test etmek için önce değişiklikleri kaydet.'
                : 'Save your changes before running a test.'}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bz-btn-ghost inline-flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} />
                {isTr ? 'Aç' : 'Open'}
              </a>
            )}
            <button
              type="button"
              onClick={runTest}
              disabled={!currentUrl || dirty || testing || Boolean(hardError) || gated}
              title={
                dirty
                  ? isTr
                    ? 'Önce kaydet'
                    : 'Save first'
                  : !currentUrl
                    ? isTr
                      ? 'Önce bir URL kaydet'
                      : 'Save a URL first'
                    : undefined
              }
              className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {isTr ? 'Test et' : 'Test'}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setSuccess(null);
                }}
                disabled={gated}
                title={isTr ? 'URL temizlenir; Kaydet ile kalıcı olur.' : 'Clears the URL; Save to persist.'}
                className="bz-btn-danger inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
                {isTr ? 'Kaldır' : 'Remove'}
              </button>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Stage 97 — WhatsApp review opt-in marker + wizard CTA. Visible
          only on the WhatsApp provider page. The marker pill mirrors
          the persisted `whatsappReviewEnabled` flag on the selected
          restaurant; the wizard CTA opens a 3-step modal for full
          setup (number → message template → preview & enable). The
          CTA is gated until the saved URL normalises cleanly so we
          don't tease an unusable feature. */}
      {platform.slug === 'whatsapp' && (() => {
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
            icon={
              <MessageCircle
                size={18}
                strokeWidth={2}
                style={{ color: WHATSAPP_BRAND_GREEN }}
              />
            }
            title={isTr ? 'Değerlendirme sayfasında WhatsApp' : 'WhatsApp on review page'}
            description={
              isTr
                ? '1–3 yıldız veren müşteriler değerlendirme sayfası sonunda WhatsApp hattınızı görür. Otomatik mesaj gönderilmez — müşteri butona tıklayınca uygulama kendi mesajıyla açılır.'
                : 'Customers who rate 1–3★ see your WhatsApp line at the end of the review page. No auto-send — WhatsApp only opens when the customer taps.'
            }
            actions={
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.06em] uppercase"
                style={{
                  background: hasValidUrl
                    ? reviewEnabled
                      ? '#EAF9B8'
                      : '#F5F5F5'
                    : '#FEF3C7',
                  color: hasValidUrl
                    ? reviewEnabled
                      ? '#0A0A0A'
                      : '#737373'
                    : '#92400E',
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: hasValidUrl
                      ? reviewEnabled
                        ? '#A8D62E'
                        : '#A3A3A3'
                      : '#F59E0B',
                  }}
                />
                {hasValidUrl
                  ? reviewEnabled
                    ? isTr ? 'Aktif' : 'Active'
                    : isTr ? 'Pasif' : 'Off'
                  : isTr ? 'Numara gerekli' : 'Number required'}
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
                className="bz-btn-primary inline-flex shrink-0 items-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Wand2 size={13} strokeWidth={2.2} />
                {isTr ? 'Sihirbazı aç' : 'Open wizard'}
              </button>
            </div>
          </SettingsCard>
        );
      })()}

      {platform.category === 'review' && (
        <SettingsCard
          title={isTr ? 'Yönlendirme eşiği' : 'Redirect threshold'}
          description={
            isTr
              ? 'Hangi puandan itibaren müşteriye herkese açık platform bağlantısı sunulsun?'
              : 'From which rating up is the customer offered the public platform link?'
          }
        >
          <RedirectThresholdPicker
            key={`${selectedRestaurant.id}:${selectedRestaurant.redirectMinRating}`}
            restaurantId={selectedRestaurant.id}
            initialValue={selectedRestaurant.redirectMinRating}
            locale={locale}
          />
        </SettingsCard>
      )}

      {platform.category === 'review' && (
        <SettingsCard
          title={isTr ? 'Varsayılan yönlendirme' : 'Default redirect'}
          description={
            isTr
              ? 'QR akışı platform belirtmediğinde seçili yorum platformu kullanılır.'
              : 'When the QR flow has no explicit platform, the selected review platform is used.'
          }
        >
          <DefaultRedirectPicker
            key={selectedRestaurant.id}
            restaurantId={selectedRestaurant.id}
            enabledPlatforms={enabledPlatformIds}
            initialValue={selectedRestaurant.defaultRedirectPlatform}
            locale={locale}
            onSaved={(next) => updateSelectedRestaurant({ defaultRedirectPlatform: next })}
          />
        </SettingsCard>
      )}

      <UnsavedChangesBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
        error={error}
        success={dirty ? null : success}
        dirtyLabel={isTr ? 'Kaydedilmemiş değişiklikler var.' : 'Unsaved changes.'}
        saveLabel={isTr ? 'Kaydet' : 'Save'}
        resetLabel={isTr ? 'Geri al' : 'Reset'}
      />

      {whatsappWizardOpen && platform.slug === 'whatsapp' && (
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
            setSuccess(
              isTr ? 'WhatsApp ayarları güncellendi.' : 'WhatsApp settings updated.',
            );
          }}
        />
      )}
    </div>
  );
}
