"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2 as LinkIcon,
  Loader2,
  Phone,
  Plug,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  AlertBanner,
  Field,
  IntegrationStatusBadge,
  PlatformChip,
  Toggle,
  type IntegrationStatusKind,
  type PlatformId,
} from "@/components/ui";
import { AlertTriangle } from "lucide-react";
import DefaultRedirectPicker from "@/components/dashboard/DefaultRedirectPicker";
import { getSectorPlatforms } from "@/lib/sector-platforms";
import {
  checkProviderUrl,
  describeDomainError,
  type DomainCheckResult,
  type IntegrationProvider,
} from "@/lib/integration-domains";
import { SettingsCard } from "../SettingsCard";
import { UnsavedChangesBar } from "../UnsavedChangesBar";
import { GoogleBusinessIntegrationPanel } from "./GoogleBusinessIntegrationPanel";

interface RestaurantData {
  id: string;
  name?: string;
  category: string;
  address?: string | null;
  city?: string | null;
  googlePlaceId?: string | null;
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
  defaultRedirectPlatform: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  reservationUrl: string | null;
  website: string | null;
  // "Diğer" custom platform — owner kendi review platform URL'i.
  otherPlatformUrl?: string | null;
  otherPlatformLabel?: string | null;
  otherPlatformEnabled?: boolean;
}

interface BusinessIntegrationSettingsProps {
  restaurant: RestaurantData;
  locale?: "tr" | "en";
  onSaved?: (next: RestaurantData) => void;
}

interface FormState {
  googleReviewUrl: string;
  googleEnabled: boolean;
  yemekSepetiUrl: string;
  yemekSepetiEnabled: boolean;
  getirYemekUrl: string;
  getirEnabled: boolean;
  trendyolYemekUrl: string;
  trendyolEnabled: boolean;
  tripAdvisorUrl: string;
  tripAdvisorEnabled: boolean;
  airbnbUrl: string;
  airbnbEnabled: boolean;
  bookingUrl: string;
  bookingEnabled: boolean;
  yandexUrl: string;
  yandexEnabled: boolean;
  instagramUrl: string;
  facebookUrl: string;
  whatsappUrl: string;
  reservationUrl: string;
  otherPlatformUrl: string;
  otherPlatformLabel: string;
  otherPlatformEnabled: boolean;
}

interface PlatformDef {
  id: PlatformId;
  /** API field name for URL */
  urlKey: keyof FormState;
  /** API field name for enable flag */
  enabledKey: keyof FormState;
  /** Test endpoint provider id (also used for domain validation). */
  testProvider: IntegrationProvider;
  label: string;
  placeholder: string;
}

const PLATFORM_DEFS: PlatformDef[] = [
  {
    id: "google",
    urlKey: "googleReviewUrl",
    enabledKey: "googleEnabled",
    testProvider: "google",
    label: "Google İşletme",
    placeholder: "https://g.page/r/...",
  },
  {
    id: "yemeksepeti",
    urlKey: "yemekSepetiUrl",
    enabledKey: "yemekSepetiEnabled",
    testProvider: "yemeksepeti",
    label: "Yemeksepeti",
    placeholder: "https://www.yemeksepeti.com/restaurant/...",
  },
  {
    id: "getir",
    urlKey: "getirYemekUrl",
    enabledKey: "getirEnabled",
    testProvider: "getir",
    label: "Getir Yemek",
    placeholder: "https://getir.com/yemek/restaurant/...",
  },
  {
    id: "trendyol",
    urlKey: "trendyolYemekUrl",
    enabledKey: "trendyolEnabled",
    testProvider: "trendyol_go",
    label: "Trendyol GO",
    placeholder: "https://tgoapp.com/restaurant/...",
  },
  {
    id: "tripadvisor",
    urlKey: "tripAdvisorUrl",
    enabledKey: "tripAdvisorEnabled",
    testProvider: "tripadvisor",
    label: "Tripadvisor",
    placeholder: "https://www.tripadvisor.com/Restaurant_Review-...",
  },
  {
    id: "airbnb",
    urlKey: "airbnbUrl",
    enabledKey: "airbnbEnabled",
    testProvider: "airbnb",
    label: "Airbnb",
    placeholder: "https://www.airbnb.com/rooms/...",
  },
  {
    id: "booking",
    urlKey: "bookingUrl",
    enabledKey: "bookingEnabled",
    testProvider: "booking",
    label: "Booking",
    placeholder: "https://www.booking.com/hotel/tr/...",
  },
  {
    id: "yandex",
    urlKey: "yandexUrl",
    enabledKey: "yandexEnabled",
    testProvider: "yandex",
    label: "Yandex",
    placeholder: "https://yandex.com.tr/maps/org/...",
  },
];

interface SocialDef {
  /** Logo path under /public/platforms/. */
  logoFile: string;
  key: keyof FormState;
  testProvider: IntegrationProvider;
  label: string;
  placeholder: string;
}

const SOCIAL_DEFS: SocialDef[] = [
  {
    key: "instagramUrl",
    testProvider: "instagram",
    label: "Instagram",
    logoFile: "instagram",
    placeholder: "https://instagram.com/isletmem",
  },
  {
    key: "facebookUrl",
    testProvider: "facebook",
    label: "Facebook",
    logoFile: "facebook",
    placeholder: "https://facebook.com/isletmem",
  },
  {
    key: "whatsappUrl",
    testProvider: "whatsapp",
    label: "WhatsApp",
    logoFile: "whatsapp",
    placeholder: "https://wa.me/905551112233",
  },
  {
    key: "reservationUrl",
    testProvider: "reservation",
    label: "Rezervasyon linki",
    logoFile: "", // free-form, lucide Phone icon fallback
    placeholder: "https://reservation.example.com/isletmem",
  },
];

function toForm(r: RestaurantData): FormState {
  return {
    googleReviewUrl: r.googleReviewUrl ?? "",
    googleEnabled: r.googleEnabled,
    yemekSepetiUrl: r.yemekSepetiUrl ?? "",
    yemekSepetiEnabled: r.yemekSepetiEnabled,
    getirYemekUrl: r.getirYemekUrl ?? "",
    getirEnabled: r.getirEnabled,
    trendyolYemekUrl: r.trendyolYemekUrl ?? "",
    trendyolEnabled: r.trendyolEnabled,
    tripAdvisorUrl: r.tripAdvisorUrl ?? "",
    tripAdvisorEnabled: r.tripAdvisorEnabled,
    airbnbUrl: r.airbnbUrl ?? "",
    airbnbEnabled: r.airbnbEnabled,
    bookingUrl: r.bookingUrl ?? "",
    bookingEnabled: r.bookingEnabled,
    yandexUrl: r.yandexUrl ?? "",
    yandexEnabled: r.yandexEnabled,
    instagramUrl: r.instagramUrl ?? "",
    facebookUrl: r.facebookUrl ?? "",
    whatsappUrl: r.whatsappUrl ?? "",
    reservationUrl: r.reservationUrl ?? "",
    otherPlatformUrl: r.otherPlatformUrl ?? "",
    otherPlatformLabel: r.otherPlatformLabel ?? "",
    otherPlatformEnabled: r.otherPlatformEnabled ?? true,
  };
}

function isDirty(a: FormState, b: FormState) {
  return (Object.keys(a) as (keyof FormState)[]).some((k) => a[k] !== b[k]);
}

function deriveStatus(url: string, enabled: boolean): IntegrationStatusKind {
  if (!url) return "not_configured";
  if (!enabled) return "disconnected";
  return "connected";
}

interface LatestCheck {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
  source: string;
}

function providerForFormKey(key: keyof FormState): IntegrationProvider | null {
  const platDef = PLATFORM_DEFS.find((d) => d.urlKey === key);
  if (platDef) return platDef.testProvider;
  const socDef = SOCIAL_DEFS.find((d) => d.key === key);
  if (socDef) return socDef.testProvider;
  return null;
}

function formatRelative(iso: string, locale: "tr" | "en"): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return locale === "tr" ? "az önce" : "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === "tr" ? "az önce" : "just now";
  if (mins < 60) return locale === "tr" ? `${mins} dk önce` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === "tr" ? `${hours} sa önce` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === "tr" ? `${days} gün önce` : `${days}d ago`;
}

/**
 * Section 3 — Platform Bağlantıları / Platform Links.
 *
 * Üst kısım: <DefaultRedirectPicker> — orphan-default cleanup mevcut handler'a
 * (CLAUDE.md §19.2). Sonra sektör whitelist'ine göre filtrelenmiş 6 platform
 * kartı (Google / Yemeksepeti / Getir / Trendyol / Tripadvisor / Airbnb).
 * Alt kısım: 4 sosyal medya kartı (Instagram / Facebook / WhatsApp / Reservation).
 *
 * Her kart: PlatformChip + IntegrationStatusBadge + URL input + Enable Toggle
 * + "Test et" button + "Kaldır" (URL clear).
 *
 * Quality control (CLAUDE.md §19.4): `checkProviderUrl` 2-katmanlı sonuç döner.
 *   - severity 'error'   → kırmızı satır + save block (invalid_url / wrong_protocol / wrong_domain)
 *   - severity 'warning' → amber satır, save geçer (generic_homepage / not_review_link)
 *
 * Test: server-side POST `/api/restaurants/[id]/integrations/[provider]/test`.
 */
export function BusinessIntegrationSettings({
  restaurant,
  locale = "tr",
  onSaved,
}: BusinessIntegrationSettingsProps) {
  const [form, setForm] = useState<FormState>(() => toForm(restaurant));
  const [initial, setInitial] = useState<FormState>(() => toForm(restaurant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [retestingAll, setRetestingAll] = useState(false);
  const [latestChecks, setLatestChecks] = useState<Record<string, LatestCheck>>({});

  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
    setError(null);
    setSuccess(null);
  }, [restaurant]);

  // Mount'ta provider başına son test sonuçlarını çek (CLAUDE.md §19.4 + §23.7
  // Phase 11.23). Owner panel açıldığında "Son test: 2 saat önce" rozeti
  // hemen görünür. DB write fail olduysa boş dön (UI kırılmaz).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/restaurants/${restaurant.id}/integrations/checks`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.checks) return;
        setLatestChecks(data.checks as Record<string, LatestCheck>);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [restaurant.id]);

  const dirty = useMemo(() => isDirty(form, initial), [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess(null);
    // URL değiştiyse o provider'ın son test sonucu artık stale — rozeti
    // gizle. Owner kaydedip yeniden test edince fresh rozet gelir.
    const provider = providerForFormKey(key);
    if (provider) {
      setLatestChecks((prev) => {
        if (!prev[provider]) return prev;
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    }
  };

  const allowedPlatforms = useMemo(() => getSectorPlatforms(form.googleEnabled ? restaurant.category : restaurant.category), [restaurant.category, form.googleEnabled]);
  const visibleDefs = useMemo(
    () => PLATFORM_DEFS.filter((d) => allowedPlatforms.has(d.id)),
    [allowedPlatforms],
  );
  const enabledPlatformsForPicker = useMemo<PlatformId[]>(
    () =>
      visibleDefs
        .filter((d) => {
          const url = form[d.urlKey] as string;
          const enabled = form[d.enabledKey] as boolean;
          return Boolean(url && enabled);
        })
        .map((d) => d.id),
    [visibleDefs, form],
  );

  // Per-field link quality check — runs on every keystroke so feedback
  // appears next to the offending row, not as a single banner at save time.
  // 2-tier severity (CLAUDE.md §19.4):
  //   error   → kırmızı, save block
  //   warning → amber, save geçer (homepage / generic listing path)
  type FieldQuality = { result: DomainCheckResult; provider: IntegrationProvider; message: string };
  const fieldQuality = useMemo<Partial<Record<keyof FormState, FieldQuality>>>(() => {
    const out: Partial<Record<keyof FormState, FieldQuality>> = {};
    const checks: Array<[keyof FormState, IntegrationProvider]> = [
      ...PLATFORM_DEFS.map((d) => [d.urlKey, d.testProvider] as [keyof FormState, IntegrationProvider]),
      ...SOCIAL_DEFS.map((d) => [d.key, d.testProvider] as [keyof FormState, IntegrationProvider]),
    ];
    for (const [field, provider] of checks) {
      const value = form[field] as string;
      if (!value || !value.trim()) continue;
      const result = checkProviderUrl(provider, value);
      if (!result.ok) {
        out[field] = {
          result,
          provider,
          message: describeDomainError(provider, result, locale),
        };
      }
    }
    return out;
  }, [form, locale]);

  const hasHardErrors = Object.values(fieldQuality).some(
    (q) => q?.result.severity === "error",
  );

  const handleSave = async () => {
    if (saving) return;
    if (hasHardErrors) {
      setError(
        locale === "tr"
          ? "Bazı bağlantılar marka adresine işaret etmiyor. Aşağıdaki kırmızı uyarıları düzeltip tekrar dene."
          : "Some links don't point to the brand domain. Fix the red errors below and try again.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Partial<RestaurantData> = {
        googleReviewUrl: form.googleReviewUrl.trim() || null,
        googleEnabled: form.googleEnabled,
        yemekSepetiUrl: form.yemekSepetiUrl.trim() || null,
        yemekSepetiEnabled: form.yemekSepetiEnabled,
        getirYemekUrl: form.getirYemekUrl.trim() || null,
        getirEnabled: form.getirEnabled,
        trendyolYemekUrl: form.trendyolYemekUrl.trim() || null,
        trendyolEnabled: form.trendyolEnabled,
        tripAdvisorUrl: form.tripAdvisorUrl.trim() || null,
        tripAdvisorEnabled: form.tripAdvisorEnabled,
        airbnbUrl: form.airbnbUrl.trim() || null,
        airbnbEnabled: form.airbnbEnabled,
        bookingUrl: form.bookingUrl.trim() || null,
        bookingEnabled: form.bookingEnabled,
        yandexUrl: form.yandexUrl.trim() || null,
        yandexEnabled: form.yandexEnabled,
        instagramUrl: form.instagramUrl.trim() || null,
        facebookUrl: form.facebookUrl.trim() || null,
        whatsappUrl: form.whatsappUrl.trim() || null,
        reservationUrl: form.reservationUrl.trim() || null,
        otherPlatformUrl: form.otherPlatformUrl.trim() || null,
        otherPlatformLabel: form.otherPlatformLabel.trim() || null,
        otherPlatformEnabled: form.otherPlatformEnabled,
      };
      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Kaydedilemedi.");
      }
      const updated = await res.json();
      setInitial(form);
      setSuccess(
        locale === "tr"
          ? "Platform bağlantıları güncellendi."
          : "Platform links updated.",
      );
      onSaved?.({ ...restaurant, ...payload, ...updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kaydedilemedi.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
    setError(null);
    setSuccess(null);
  };

  const runTest = async (urlKey: string, testProvider: IntegrationProvider) => {
    if (testing || retestingAll) return;
    if (dirty) {
      setError(
        locale === "tr"
          ? "Test etmeden önce değişiklikleri kaydet."
          : "Save changes before testing.",
      );
      return;
    }
    setTesting(urlKey);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurant.id}/integrations/${testProvider}/test`,
        { method: "POST" },
      );
      const data = await res.json();
      setLatestChecks((prev) => ({
        ...prev,
        [testProvider]: {
          ok: data.ok ?? false,
          statusCode: data.statusCode ?? null,
          latencyMs: data.latencyMs ?? null,
          error: data.error ?? null,
          checkedAt: data.checkedAt ?? new Date().toISOString(),
          source: "manual",
        },
      }));
    } catch (err) {
      setLatestChecks((prev) => ({
        ...prev,
        [testProvider]: {
          ok: false,
          statusCode: null,
          latencyMs: null,
          error: (err as Error).message,
          checkedAt: new Date().toISOString(),
          source: "manual",
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleRetestAll = async () => {
    if (retestingAll || testing) return;
    if (dirty) {
      setError(
        locale === "tr"
          ? "Yeniden test etmeden önce değişiklikleri kaydet."
          : "Save changes before retesting.",
      );
      return;
    }
    setRetestingAll(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurant.id}/integrations/retest`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error ||
            (locale === "tr" ? "Yeniden test başarısız." : "Retest failed."),
        );
      }
      const data = await res.json();
      const updates: Record<string, LatestCheck> = {};
      for (const r of (data.results ?? []) as Array<{
        provider: string;
        ok: boolean;
        statusCode: number;
        latencyMs: number;
        error?: string;
        checkedAt: string;
      }>) {
        updates[r.provider] = {
          ok: r.ok,
          statusCode: r.statusCode || null,
          latencyMs: r.latencyMs || null,
          error: r.error ?? null,
          checkedAt: r.checkedAt,
          source: "retest_all",
        };
      }
      setLatestChecks((prev) => ({ ...prev, ...updates }));
      const checked = data.checked ?? 0;
      setSuccess(
        locale === "tr"
          ? `${checked} platform yeniden test edildi.`
          : `${checked} platforms retested.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "tr"
            ? "Yeniden test sırasında hata oluştu."
            : "Retest failed.",
      );
    } finally {
      setRetestingAll(false);
    }
  };

  const hidden = visibleDefs.length === 0;
  const isTr = locale === "tr";

  const handleGoogleLinkSelected = (next: {
    googlePlaceId: string | null;
    googleReviewUrl: string | null;
    googleEnabled: boolean;
  }) => {
    setForm((prev) => ({
      ...prev,
      googleReviewUrl: next.googleReviewUrl ?? "",
      googleEnabled: next.googleEnabled,
    }));
    setInitial((prev) => ({
      ...prev,
      googleReviewUrl: next.googleReviewUrl ?? "",
      googleEnabled: next.googleEnabled,
    }));
    setSuccess(
      locale === "tr"
        ? "Google işletmesi bağlandı ve yorum linki güncellendi."
        : "Google business connected and review link updated.",
    );
    onSaved?.({ ...restaurant, ...next });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-[13px] leading-relaxed text-[#525252] flex-1 sm:max-w-[680px]">
          {isTr
            ? "Google, Yemeksepeti, Getir, Trendyol, Tripadvisor ve diğer platform linklerinizi tek yerden yönetin. Buaze linklerinizi doğrular, erişilebilirliğini test eder ve QR akışlarında doğru yönlendirme yapmanıza yardımcı olur."
            : "Manage your Google, delivery, travel, social and reservation links from one place. Buaze validates your links, checks reachability, and helps your QR flows route customers safely."}
        </p>
        <button
          type="button"
          onClick={handleRetestAll}
          disabled={retestingAll || testing !== null || dirty}
          className="bz-btn-ghost shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full text-[13px]"
          style={{ minHeight: 40 }}
        >
          {retestingAll ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {isTr ? "Tümünü yeniden test et" : "Retest all"}
        </button>
      </div>
      <AlertBanner kind="info">
        {isTr
          ? "Bu sayfa platform bağlantılarını yönetir. Resmi API senkronizasyonları desteklenen platformlarda ayrıca yapılandırılır. Bazı platformlar otomatik testleri engelleyebilir; başarısız test her zaman bağlantının tarayıcıda kırık olduğu anlamına gelmez."
          : "This page manages platform links. Official API sync is configured separately for supported platforms. Some platforms may block automated checks — a failed test does not always mean the link is broken in a browser."}
      </AlertBanner>
      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner kind="success" onDismiss={() => setSuccess(null)}>
          {success}
        </AlertBanner>
      )}

      <SettingsCard
        icon={<Plug size={18} />}
        title="Varsayılan platform"
        description="Yüksek puanlı yorumlar QR'da platform belirtilmemişse buraya yönlenir."
      >
        <DefaultRedirectPicker
          restaurantId={restaurant.id}
          enabledPlatforms={enabledPlatformsForPicker}
          initialValue={restaurant.defaultRedirectPlatform}
          locale={locale}
        />
      </SettingsCard>

      <GoogleBusinessIntegrationPanel
        restaurant={restaurant}
        locale={locale}
        dirty={dirty}
        onGoogleLinkSelected={handleGoogleLinkSelected}
      />

      {!hidden && (
        <SettingsCard
          icon={<Globe size={18} />}
          title="Yorum platformları"
          description={`Sektörüne (${restaurant.category}) uygun platformları aşağıda yönet.`}
        >
          <div className="space-y-3 sm:space-y-4">
            {visibleDefs.map((def) => {
              const url = form[def.urlKey] as string;
              const enabled = form[def.enabledKey] as boolean;
              const status = deriveStatus(url, enabled);
              const isThisTesting = testing === def.urlKey;
              return (
                <IntegrationCard
                  key={def.id}
                  logo={<PlatformChip id={def.id} size={36} />}
                  label={def.label}
                  status={status}
                  url={url}
                  placeholder={def.placeholder}
                  fieldId={`url-${def.id}`}
                  quality={fieldQuality[def.urlKey] ?? null}
                  onUrlChange={(v) => set(def.urlKey, v as never)}
                  onClear={() => set(def.urlKey, "" as never)}
                  onTest={() => runTest(def.urlKey, def.testProvider)}
                  testing={isThisTesting}
                  latestCheck={latestChecks[def.testProvider] ?? null}
                  locale={locale}
                  testDisabled={
                    dirty ||
                    retestingAll ||
                    fieldQuality[def.urlKey]?.result.severity === "error"
                  }
                  toggle={
                    <Toggle
                      checked={enabled}
                      onChange={(next) => set(def.enabledKey, next as never)}
                      ariaLabel={`${def.label} aktif`}
                    />
                  }
                  toggleLabel={enabled ? "Aktif" : "Pasif"}
                />
              );
            })}
          </div>
        </SettingsCard>
      )}

      <SettingsCard
        icon={<Camera size={18} />}
        title="Sosyal medya & rezervasyon"
        description="İşletmenin sosyal medya kanalları ve rezervasyon linki."
      >
        <div className="space-y-2 sm:space-y-3">
          {SOCIAL_DEFS.map((def) => {
            if (def.key === "reservationUrl") {
              return (
                <div key={def.key as string} className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3 opacity-75">
                  <div className="flex items-center gap-3">
                    <FallbackIconChip><Phone size={18} /></FallbackIconChip>
                    <div>
                      <div className="bz-h-tight text-[14px]">{def.label}</div>
                      <div className="text-[12px] text-[#737373] mt-0.5">
                        {isTr ? "Şu anda pasif, talebe göre açılacaktır." : "Currently passive, will be opened based on demand."}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const url = form[def.key] as string;
            const status: IntegrationStatusKind = url ? "connected" : "not_configured";
            const isThisTesting = testing === String(def.key);
            const logo = def.logoFile ? (
              <SocialLogo file={def.logoFile} alt={def.label} />
            ) : (
              <FallbackIconChip>
                <Phone size={18} />
              </FallbackIconChip>
            );
            return (
              <CompactIntegrationCard
                key={def.key as string}
                logo={logo}
                label={def.label}
                status={status}
                url={url}
                placeholder={def.placeholder}
                fieldId={`url-${String(def.key)}`}
                quality={fieldQuality[def.key] ?? null}
                onUrlChange={(v) => set(def.key, v as never)}
                onClear={() => set(def.key, "" as never)}
                onTest={() => runTest(String(def.key), def.testProvider)}
                testing={isThisTesting}
                latestCheck={latestChecks[def.testProvider] ?? null}
                locale={locale}
                testDisabled={
                  dirty ||
                  retestingAll ||
                  fieldQuality[def.key]?.result.severity === "error"
                }
              />
            );
          })}
        </div>
      </SettingsCard>

      {/* "Diğer" özel platform — TheFork, OpenTable veya sektör-spesifik
          review URL'leri için. Domain validation YOK (free-form), sadece
          http(s) protocol kontrolü save sırasında server-side. */}
      <SettingsCard
        icon={<LinkIcon size={18} />}
        title={isTr ? "Diğer platform" : "Other platform"}
        description={
          isTr
            ? "Listelerimizde yer almayan başka bir review platformu varsa (TheFork, OpenTable, sektör-spesifik) URL'i buraya ekleyebilirsin."
            : "If you use a review platform we don't list (TheFork, OpenTable, sector-specific), add its URL here."
        }
      >
        <div className="rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <FallbackIconChip>
              <LinkIcon size={18} />
            </FallbackIconChip>
            <div className="flex-1 space-y-3">
              <Field
                label={isTr ? "Platform adı" : "Platform name"}
                hint={isTr ? "Müşterinin tanıyacağı ad (örn. TheFork, OpenTable)" : "The platform name your customers recognize"}
              >
                <input
                  type="text"
                  className="bz-input w-full"
                  value={form.otherPlatformLabel}
                  onChange={(e) => set("otherPlatformLabel", e.target.value.slice(0, 60))}
                  placeholder={isTr ? "Örn. TheFork, OpenTable" : "e.g. TheFork, OpenTable"}
                  maxLength={60}
                />
              </Field>
              <Field label={isTr ? "URL" : "URL"}>
                <input
                  type="url"
                  className="bz-input w-full"
                  value={form.otherPlatformUrl}
                  onChange={(e) => set("otherPlatformUrl", e.target.value)}
                  placeholder="https://..."
                />
              </Field>
              <label className="flex items-center gap-2 text-[12px] text-[#525252] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.otherPlatformEnabled}
                  onChange={(e) => set("otherPlatformEnabled", e.target.checked)}
                  className="h-4 w-4 accent-[#0A0A0A]"
                />
                <span>
                  {isTr
                    ? "Müşteri akışında etkin (yüksek puan yönlendirmesi için kullanılabilir)"
                    : "Active in customer flow (available for high-rating redirect)"}
                </span>
              </label>
            </div>
          </div>
        </div>
      </SettingsCard>

      <UnsavedChangesBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
        error={error}
        success={dirty ? null : success}
      />
    </div>
  );
}

export default BusinessIntegrationSettings;

// ─── Helpers ──────────────────────────────────────────────────────────────

interface IntegrationCardQuality {
  result: DomainCheckResult;
  provider: IntegrationProvider;
  message: string;
}

interface IntegrationCardProps {
  logo: React.ReactNode;
  label: string;
  status: IntegrationStatusKind;
  url: string;
  placeholder: string;
  fieldId: string;
  quality: IntegrationCardQuality | null;
  onUrlChange: (next: string) => void;
  onClear: () => void;
  onTest: () => void;
  testing: boolean;
  latestCheck: LatestCheck | null;
  locale: "tr" | "en";
  testDisabled: boolean;
  toggle?: React.ReactNode;
  toggleLabel?: string;
}

function IntegrationCard({
  logo,
  label,
  status,
  url,
  placeholder,
  fieldId,
  quality,
  onUrlChange,
  onClear,
  onTest,
  testing,
  latestCheck,
  locale,
  testDisabled,
  toggle,
  toggleLabel,
}: IntegrationCardProps) {
  const errorMessage =
    quality && quality.result.severity === "error" ? quality.message : null;
  const warningMessage =
    quality && quality.result.severity === "warning" ? quality.message : null;
  return (
    <div
      className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:p-5"
    >
      {/* Header — logo + label + status. Stacks vertically on small phones,
          horizontal at >=400px. */}
      <div className="flex items-center gap-3">
        <div className="shrink-0">{logo}</div>
        <div className="min-w-0 flex-1">
          <div className="bz-h-tight text-[14px] sm:text-[15px] truncate">{label}</div>
          <IntegrationStatusBadge status={status} className="mt-1" />
        </div>
        {toggle && (
          <div className="flex shrink-0 items-center gap-2">
            {toggle}
            <span className="hidden sm:inline text-[12px] text-[#525252]">
              {toggleLabel}
            </span>
          </div>
        )}
      </div>

      {/* URL input + inline domain error */}
      <div className="mt-4">
        <Field label="URL" htmlFor={fieldId} error={errorMessage ?? undefined}>
          <input
            id={fieldId}
            className="bz-input bz-mono text-[13px]"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={placeholder}
          />
        </Field>
        {warningMessage && (
          <div
            role="status"
            className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug"
            style={{ color: "#92400E" }}
          >
            <AlertTriangle size={12} strokeWidth={2.25} className="mt-0.5 shrink-0" />
            <span>{warningMessage}</span>
          </div>
        )}
      </div>

      {/* Latest test result (if any) — shown above actions so it stays
          visible on phones even when the action row wraps. Mount fetch
          (GET /integrations/checks) hydrates this; manual + retest_all
          test'ler buraya overwrite eder. */}
      {latestCheck && (
        <div className="mt-3">
          <LatestCheckLine check={latestCheck} locale={locale} />
        </div>
      )}

      {/* Actions — full-width grid on mobile (44px+ touch targets), inline
          flex on tablet/desktop. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onTest}
          disabled={!url || testing || testDisabled}
          className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 rounded-full text-[13px] sm:text-[12px]"
          style={{ minHeight: 40 }}
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Test et
        </button>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bz-btn-ghost inline-flex items-center justify-center gap-1.5 rounded-full text-[13px] sm:text-[12px]"
            style={{ minHeight: 40 }}
            aria-label={`${label} aç`}
          >
            <ExternalLink size={14} />
            Aç
          </a>
        ) : (
          <span aria-hidden className="hidden sm:block" />
        )}
        {url && (
          <button
            type="button"
            onClick={onClear}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white text-[12.5px] text-[#737373] hover:text-[#991B1B] hover:border-[#FECACA] sm:col-span-1"
            style={{ minHeight: 40, padding: "0 14px" }}
            aria-label="URL'yi temizle"
            title="Kaldır"
          >
            <Trash2 size={14} />
            Kaldır
          </button>
        )}
      </div>
    </div>
  );
}

function LatestCheckLine({
  check,
  locale,
}: {
  check: LatestCheck;
  locale: "tr" | "en";
}) {
  const isTr = locale === "tr";
  const relative = formatRelative(check.checkedAt, locale);
  if (check.ok) {
    // Success durumunda kullanıcı dostu sade mesaj. HTTP detay (status code +
    // latency) kasıtlı gizli — owner için anlamsız teknik detay (Phase 11.34).
    // Domain whitelist + reachability test geçti → "Başarılı / Successful"
    // yeterli sinyal. Operatör/dev detay isterse browser DevTools network'ten
    // doğrudan endpoint response'una bakabilir.
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-[#F0FDF4] px-3 py-2 text-[12px] text-[#166534]"
      >
        <CheckCircle2 size={14} className="shrink-0" />
        <span>
          <strong>{isTr ? "Başarılı" : "Successful"}</strong>
          <span className="text-[#15803D] ml-1">· {relative}</span>
        </span>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]"
    >
      <XCircle size={14} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div>
          <strong>{isTr ? "Son test başarısız" : "Last test failed"}</strong>
          <span className="text-[#7F1D1D] ml-1">· {relative}</span>
        </div>
        {(check.error || check.statusCode) && (
          <div className="mt-0.5 text-[11px] text-[#7F1D1D] break-words">
            {check.error || `HTTP ${check.statusCode}`}
          </div>
        )}
      </div>
    </div>
  );
}

function SocialLogo({ file, alt }: { file: string; alt: string }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "#fff",
        border: "1px solid #EDEDED",
        flexShrink: 0,
      }}
    >
      <img
        src={`/platforms/${file}.svg`}
        alt={alt}
        width={24}
        height={24}
        style={{ objectFit: "contain" }}
      />
    </span>
  );
}

function FallbackIconChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "#0A0A0A",
        color: "#C6F24E",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function CompactIntegrationCard({
  logo,
  label,
  url,
  placeholder,
  fieldId,
  quality,
  onUrlChange,
  onClear,
  onTest,
  testing,
  latestCheck,
  locale,
  testDisabled,
}: IntegrationCardProps) {
  const errorMessage = quality && quality.result.severity === "error" ? quality.message : null;
  const warningMessage = quality && quality.result.severity === "warning" ? quality.message : null;
  
  return (
    <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:w-[140px] shrink-0">
          <div className="scale-90 origin-left">{logo}</div>
          <div className="bz-h-tight text-[14px] truncate">{label}</div>
        </div>
        
        <div className="flex-1 min-w-0">
          <input
            id={fieldId}
            className="bz-input bz-mono text-[13px] w-full"
            style={{ minHeight: 36, padding: "0 12px" }}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={placeholder}
          />
          {(errorMessage || warningMessage) && (
            <div
              className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug"
              style={{ color: errorMessage ? "#991B1B" : "#92400E" }}
            >
              <AlertTriangle size={12} strokeWidth={2.25} className="mt-0.5 shrink-0" />
              <span>{errorMessage || warningMessage}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          <button
            type="button"
            onClick={onTest}
            disabled={!url || testing || testDisabled}
            className="bz-btn-ghost inline-flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36 }}
            title="Test et"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bz-btn-ghost inline-flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36 }}
              title="Aç"
            >
              <ExternalLink size={14} />
            </a>
          )}
          {url && (
            <button
              type="button"
              onClick={onClear}
              className="bz-btn-ghost inline-flex items-center justify-center rounded-full text-[#737373] hover:text-[#991B1B]"
              style={{ width: 36, height: 36 }}
              title="Kaldır"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {latestCheck && (
        <div className="mt-2 sm:ml-[156px]">
          <LatestCheckLine check={latestCheck} locale={locale} />
        </div>
      )}
    </div>
  );
}
