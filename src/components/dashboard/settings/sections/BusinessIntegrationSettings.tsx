"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  ExternalLink,
  Globe,
  Loader2,
  MessageCircle,
  Phone,
  Plug,
  RefreshCw,
  Trash2,
  Users,
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
import DefaultRedirectPicker from "@/components/dashboard/DefaultRedirectPicker";
import { getSectorPlatforms } from "@/lib/sector-platforms";
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
  /** Test endpoint provider id */
  testProvider: string;
  label: string;
  helpUrl?: string;
}

const PLATFORM_DEFS: PlatformDef[] = [
  { id: "google", urlKey: "googleReviewUrl", enabledKey: "googleEnabled", testProvider: "google", label: "Google İşletme" },
  { id: "yemeksepeti", urlKey: "yemekSepetiUrl", enabledKey: "yemekSepetiEnabled", testProvider: "yemeksepeti", label: "Yemeksepeti" },
  { id: "getir", urlKey: "getirYemekUrl", enabledKey: "getirEnabled", testProvider: "getir", label: "Getir Yemek" },
  { id: "trendyol", urlKey: "trendyolYemekUrl", enabledKey: "trendyolEnabled", testProvider: "trendyol_go", label: "Trendyol GO" },
  { id: "tripadvisor", urlKey: "tripAdvisorUrl", enabledKey: "tripAdvisorEnabled", testProvider: "tripadvisor", label: "Tripadvisor" },
  { id: "airbnb", urlKey: "airbnbUrl", enabledKey: "airbnbEnabled", testProvider: "airbnb", label: "Airbnb" },
];

interface SocialDef {
  key: keyof FormState;
  testProvider: string;
  label: string;
  icon: typeof Camera;
  placeholder: string;
}

const SOCIAL_DEFS: SocialDef[] = [
  {
    key: "instagramUrl",
    testProvider: "instagram",
    label: "Instagram",
    icon: Camera,
    placeholder: "https://instagram.com/isletmem",
  },
  {
    key: "facebookUrl",
    testProvider: "facebook",
    label: "Facebook",
    icon: Users,
    placeholder: "https://facebook.com/isletmem",
  },
  {
    key: "whatsappUrl",
    testProvider: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    placeholder: "https://wa.me/905551112233",
  },
  {
    key: "reservationUrl",
    testProvider: "reservation",
    label: "Rezervasyon linki",
    icon: Phone,
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
 * Section 3 — Entegrasyonlar (Faz 2).
 *
 * Üst kısım: <DefaultRedirectPicker> — orphan-default cleanup mevcut handler'a
 * (CLAUDE.md §19.2). Sonra sektör whitelist'ine göre filtrelenmiş 6 platform
 * kartı (Google / Yemeksepeti / Getir / Trendyol / Tripadvisor / Airbnb).
 * Alt kısım: 4 sosyal medya kartı (Instagram / Facebook / WhatsApp / Reservation).
 *
 * Her kart: PlatformChip + IntegrationStatusBadge + URL input + Enable Toggle
 * + "Test et" button + "Kaldır" (URL clear).
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

  const validateUrls = (): string | null => {
    const fields: Array<[string, string]> = [
      ["googleReviewUrl", form.googleReviewUrl],
      ["yemekSepetiUrl", form.yemekSepetiUrl],
      ["getirYemekUrl", form.getirYemekUrl],
      ["trendyolYemekUrl", form.trendyolYemekUrl],
      ["tripAdvisorUrl", form.tripAdvisorUrl],
      ["airbnbUrl", form.airbnbUrl],
      ["instagramUrl", form.instagramUrl],
      ["facebookUrl", form.facebookUrl],
      ["whatsappUrl", form.whatsappUrl],
      ["reservationUrl", form.reservationUrl],
    ];
    for (const [name, value] of fields) {
      if (!value.trim()) continue;
      try {
        const u = new URL(value.trim());
        if (!/^https?:$/.test(u.protocol)) return `${name} https:// ile başlamalı.`;
      } catch {
        return `Geçersiz ${name}.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (saving) return;
    const err = validateUrls();
    if (err) {
      setError(err);
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
      setSuccess("Entegrasyonlar güncellendi.");
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

  const runTest = async (urlKey: string, testProvider: string) => {
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

  const renderTestResult = (urlKey: string) => {
    const r = testResults[urlKey];
    if (!r) return null;
    if (r.ok) {
      return (
        <span className="bz-mono text-[11px] text-[#166534]">
          ✓ HTTP {r.statusCode} · {r.latencyMs}ms
        </span>
      );
    }
    return (
      <span className="bz-mono text-[11px] text-[#991B1B]">
        ✗ {r.error || `HTTP ${r.statusCode}`}
      </span>
    );
  };

  const hidden = visibleDefs.length === 0;

  return (
    <div className="space-y-5">
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
          <div className="space-y-4">
            {visibleDefs.map((def) => {
              const url = form[def.urlKey] as string;
              const enabled = form[def.enabledKey] as boolean;
              const status = deriveStatus(url, enabled);
              const isThisTesting = testing === def.urlKey;
              return (
                <div
                  key={def.id}
                  className="flex flex-col sm:flex-row gap-3 sm:items-start p-4"
                  style={{ background: "#FAFAFA", border: "1px solid #EDEDED", borderRadius: 12 }}
                >
                  <div className="flex items-center gap-3 sm:w-[180px] shrink-0">
                    <PlatformChip id={def.id} size={32} />
                    <div className="min-w-0">
                      <div className="bz-h-tight text-[14px] truncate">{def.label}</div>
                      <IntegrationStatusBadge status={status} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <Field label="URL" htmlFor={`url-${def.id}`}>
                      <input
                        id={`url-${def.id}`}
                        className="bz-input bz-mono"
                        type="url"
                        value={url}
                        onChange={(e) => set(def.urlKey, e.target.value as never)}
                        placeholder={`https://...`}
                      />
                    </Field>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={enabled}
                          onChange={(next) => set(def.enabledKey, next as never)}
                          ariaLabel={`${def.label} aktif`}
                        />
                        <span className="text-[12px] text-[#525252]">
                          {enabled ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderTestResult(def.urlKey)}
                        <button
                          type="button"
                          onClick={() => runTest(def.urlKey, def.testProvider)}
                          disabled={!url || isThisTesting || dirty}
                          className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
                          style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
                        >
                          {isThisTesting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          Test et
                        </button>
                        {url && (
                          <>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
                              style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
                              aria-label={`${def.label} aç`}
                            >
                              <ExternalLink size={12} />
                              Aç
                            </a>
                            <button
                              type="button"
                              onClick={() => set(def.urlKey, "" as never)}
                              className="bz-btn-icon"
                              aria-label="URL'yi temizle"
                              title="Kaldır"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
        <div className="space-y-4">
          {SOCIAL_DEFS.map((def) => {
            const url = form[def.key] as string;
            const status: IntegrationStatusKind = url ? "connected" : "not_configured";
            const isThisTesting = testing === String(def.key);
            const Icon = def.icon;
            return (
              <div
                key={def.key as string}
                className="flex flex-col sm:flex-row gap-3 sm:items-start p-4"
                style={{ background: "#FAFAFA", border: "1px solid #EDEDED", borderRadius: 12 }}
              >
                <div className="flex items-center gap-3 sm:w-[180px] shrink-0">
                  <div
                    className="flex items-center justify-center"
                    style={{ width: 32, height: 32, borderRadius: 10, background: "#0A0A0A", color: "#C6F24E" }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="bz-h-tight text-[14px] truncate">{def.label}</div>
                    <IntegrationStatusBadge status={status} className="mt-1" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <Field label="URL" htmlFor={`url-${String(def.key)}`}>
                    <input
                      id={`url-${String(def.key)}`}
                      className="bz-input bz-mono"
                      type="url"
                      value={url}
                      onChange={(e) => set(def.key, e.target.value as never)}
                      placeholder={def.placeholder}
                    />
                  </Field>
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {renderTestResult(String(def.key))}
                    <button
                      type="button"
                      onClick={() => runTest(String(def.key), def.testProvider)}
                      disabled={!url || isThisTesting || dirty}
                      className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
                      style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
                    >
                      {isThisTesting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Test et
                    </button>
                    {url && (
                      <>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bz-btn-ghost inline-flex items-center gap-1 text-[12px]"
                          style={{ height: 28, padding: "0 10px", borderRadius: 999 }}
                        >
                          <ExternalLink size={12} />
                          Aç
                        </a>
                        <button
                          type="button"
                          onClick={() => set(def.key, "" as never)}
                          className="bz-btn-icon"
                          aria-label="URL'yi temizle"
                          title="Kaldır"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
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
