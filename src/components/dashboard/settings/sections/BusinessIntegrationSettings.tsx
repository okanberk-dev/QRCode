"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Globe,
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

interface RestaurantData {
  id: string;
  category: string;
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

interface TestResult {
  ok: boolean;
  statusCode: number;
  latencyMs: number;
  error?: string;
  url?: string;
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
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    const next = toForm(restaurant);
    setForm(next);
    setInitial(next);
    setError(null);
    setSuccess(null);
  }, [restaurant]);

  const dirty = useMemo(() => isDirty(form, initial), [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess(null);
    // Eski test sonucu URL değiştiyse anlamını kaybeder; rozet sıfırlanır.
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[String(key)];
      return next;
    });
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
    if (testing) return;
    if (dirty) {
      setError("Test etmeden önce değişiklikleri kaydet.");
      return;
    }
    setTesting(urlKey);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurant.id}/integrations/${testProvider}/test`,
        { method: "POST" },
      );
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [urlKey]: data }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [urlKey]: { ok: false, statusCode: 0, latencyMs: 0, error: (err as Error).message },
      }));
    } finally {
      setTesting(null);
    }
  };

  const hidden = visibleDefs.length === 0;
  const isTr = locale === "tr";

  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-[#525252]">
        {isTr
          ? "Google, Yemeksepeti, Getir, Trendyol, Tripadvisor ve diğer platform linklerinizi tek yerden yönetin. Buaze linklerinizi doğrular, erişilebilirliğini test eder ve QR akışlarında doğru yönlendirme yapmanıza yardımcı olur."
          : "Manage your Google, delivery, travel, social and reservation links from one place. Buaze validates your links, checks reachability, and helps your QR flows route customers safely."}
      </p>
      <AlertBanner kind="info">
        {isTr
          ? "Bu sayfa platform bağlantılarını yönetir. Resmi API senkronizasyonları desteklenen platformlarda ayrıca yapılandırılır."
          : "This page manages platform links. Official API sync is configured separately for supported platforms."}
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
                  testResult={testResults[def.urlKey]}
                  testDisabled={dirty || fieldQuality[def.urlKey]?.result.severity === "error"}
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
        <div className="space-y-3 sm:space-y-4">
          {SOCIAL_DEFS.map((def) => {
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
              <IntegrationCard
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
                testResult={testResults[String(def.key)]}
                testDisabled={dirty || fieldQuality[def.key]?.result.severity === "error"}
              />
            );
          })}
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
  testResult?: TestResult;
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
  testResult,
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

      {/* Test result (if any) — shown above actions so it stays visible on
          phones even when the action row wraps. */}
      {testResult && (
        <div className="mt-3">
          <TestResultLine result={testResult} />
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

function TestResultLine({ result }: { result: TestResult }) {
  if (result.ok) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg bg-[#F0FDF4] px-3 py-2 text-[12px] text-[#166534]"
      >
        <CheckCircle2 size={14} className="shrink-0" />
        <span className="bz-mono">
          HTTP {result.statusCode} · {result.latencyMs}ms
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
      <span>{result.error || `HTTP ${result.statusCode}`}</span>
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
