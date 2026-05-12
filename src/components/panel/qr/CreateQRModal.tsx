"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, QrCode, Link2, Palette } from "lucide-react";
import { Field, Modal, PlatformChip, RadioCard, type PlatformId } from "@/components/ui";
import { getSectorPlatforms } from "@/lib/sector-platforms";
import {
  QR_PRESETS,
  DEFAULT_QR_PRESET_ID,
  normaliseHex,
  scoreContrast,
  isContrastRisky,
} from "@/lib/qr-colors";

interface RestaurantOption {
  id: string;
  name: string;
  slug: string;
  // Optional — when present the modal filters the platform grid to platforms
  // that are (a) allowed by the restaurant's sector and (b) actually
  // configured (URL filled). Falls back to "show all 4 delivery platforms"
  // for callers that haven't been updated yet (defensive).
  category?: string | null;
  googlePlaceId?: string | null;
  yemekSepetiUrl?: string | null;
  getirYemekUrl?: string | null;
  trendyolYemekUrl?: string | null;
  tripAdvisorUrl?: string | null;
  airbnbUrl?: string | null;
  bookingUrl?: string | null;
  yandexUrl?: string | null;
  externalPlatformsEnabled?: boolean;
}

export interface QRGenerationResult {
  restaurantId: string;
  restaurantName: string;
  tableNumber: string | null;
  platform: string | null;
  qrUrl: string;
  svg: string;
  createdAt: string;
  // Stage 96 — colour pair used at generation time. NULL when owner kept
  // the default classic palette (black on white) — downstream callers
  // skip persisting NULL pairs in DB.
  darkColor: string | null;
  lightColor: string | null;
}

interface CreateQRModalProps {
  restaurants: RestaurantOption[];
  /** Pre-selected restaurant — if owner has a single one or admin pre-scoped */
  defaultRestaurantId?: string;
  locale?: "tr" | "en";
  /**
   * Panel-scope base for the "edit platform URLs" deep link in the empty
   * state. Owner panel passes `/${locale}/dashboard`; admin panel passes
   * `/admin`. Modal appends `/restaurants/${id}`. Required because the
   * modal is mounted from both panels but their restaurant detail routes
   * are not the same — `/admin/...` has no `[locale]` segment.
   */
  panelBase: string;
  onClose: () => void;
  onCreated: (result: QRGenerationResult) => void;
}

// QR-flow platform key → meta. Keys MUST mirror `/r/[slug]` platformUrls map
// + `/api/restaurants/[id]/qr` validPlatforms whitelist. `sectorKey` bridges
// sector-platforms.ts ('trendyol' without _go) ↔ QR/Feedback ('trendyol_go').
type UrlField =
  | "googlePlaceId"
  | "yemekSepetiUrl"
  | "getirYemekUrl"
  | "trendyolYemekUrl"
  | "tripAdvisorUrl"
  | "airbnbUrl"
  | "bookingUrl"
  | "yandexUrl";

const PLATFORM_META: Record<
  string,
  { label: string; chipId: PlatformId; urlField: UrlField; sectorKey: string }
> = {
  google: { label: "Google Maps", chipId: "google", urlField: "googlePlaceId", sectorKey: "google" },
  yemeksepeti: { label: "Yemeksepeti", chipId: "yemeksepeti", urlField: "yemekSepetiUrl", sectorKey: "yemeksepeti" },
  getir: { label: "Getir Yemek", chipId: "getir", urlField: "getirYemekUrl", sectorKey: "getir" },
  trendyol_go: { label: "Trendyol GO", chipId: "trendyol_go", urlField: "trendyolYemekUrl", sectorKey: "trendyol" },
  tripadvisor: { label: "Tripadvisor", chipId: "tripadvisor", urlField: "tripAdvisorUrl", sectorKey: "tripadvisor" },
  airbnb: { label: "Airbnb", chipId: "airbnb", urlField: "airbnbUrl", sectorKey: "airbnb" },
  booking: { label: "Booking", chipId: "booking", urlField: "bookingUrl", sectorKey: "booking" },
  yandex: { label: "Yandex", chipId: "yandex", urlField: "yandexUrl", sectorKey: "yandex" },
};

const FALLBACK_KEYS = ["google", "yemeksepeti", "getir", "trendyol_go"] as const;

export function CreateQRModal({
  restaurants,
  defaultRestaurantId,
  locale = "tr",
  panelBase,
  onClose,
  onCreated,
}: CreateQRModalProps) {
  const isTr = locale === "tr";

  const [restaurantId, setRestaurantId] = useState(
    defaultRestaurantId || restaurants[0]?.id || "",
  );
  const [name, setName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [linkType, setLinkType] = useState<"default" | "platform">("default");
  const [platform, setPlatform] = useState("google");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stage 96 — colour picker state. Default preset = classic (black on
  // white). Owner can pick a preset, jump to "Özel" (custom), or directly
  // type hex codes. Both fields stay in sync with `presetId` so visiting
  // a preset clears any custom override naturally.
  const [presetId, setPresetId] = useState<string>(DEFAULT_QR_PRESET_ID);
  const initialPreset =
    QR_PRESETS.find((p) => p.id === DEFAULT_QR_PRESET_ID) ?? QR_PRESETS[0];
  const [dark, setDark] = useState<string>(initialPreset.dark);
  const [light, setLight] = useState<string>(initialPreset.light);

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === restaurantId),
    [restaurants, restaurantId],
  );

  // Derive the platform grid: sector whitelist ∩ filled URL fields. Falls
  // back to the legacy 4-platform delivery list if the caller didn't pass
  // category/URL data — backward-compatible.
  const availablePlatforms = useMemo(() => {
    if (!activeRestaurant) return [] as { key: string; label: string; chipId: PlatformId }[];

    const hasPlatformShape =
      "category" in activeRestaurant ||
      "googlePlaceId" in activeRestaurant ||
      "yemekSepetiUrl" in activeRestaurant ||
      "getirYemekUrl" in activeRestaurant ||
      "trendyolYemekUrl" in activeRestaurant ||
      "tripAdvisorUrl" in activeRestaurant ||
      "airbnbUrl" in activeRestaurant ||
      "bookingUrl" in activeRestaurant ||
      "yandexUrl" in activeRestaurant ||
      "externalPlatformsEnabled" in activeRestaurant;

    if (!hasPlatformShape) {
      return FALLBACK_KEYS.map((key) => ({
        key,
        label: PLATFORM_META[key].label,
        chipId: PLATFORM_META[key].chipId,
      }));
    }

    const sectorAllowed = getSectorPlatforms(activeRestaurant.category ?? null);

    return Object.entries(PLATFORM_META)
      .filter(([key]) => activeRestaurant.externalPlatformsEnabled !== false || key === "google")
      .filter(([, meta]) => sectorAllowed.has(meta.sectorKey as PlatformId))
      .filter(([, meta]) => {
        const value = activeRestaurant[meta.urlField];
        return typeof value === "string" && value.trim().length > 0;
      })
      .map(([key, meta]) => ({ key, label: meta.label, chipId: meta.chipId }));
  }, [activeRestaurant]);

  // Auto-pick the first restaurant if none preselected and list loads after mount
  useEffect(() => {
    if (!restaurantId && restaurants[0]?.id) setRestaurantId(restaurants[0].id);
  }, [restaurantId, restaurants]);

  // Keep `platform` valid against the dynamic list — when the active
  // restaurant changes (or its config doesn't include the current pick),
  // snap to the first available platform. Avoids submitting a key the
  // server would reject as un-configured.
  useEffect(() => {
    if (linkType !== "platform") return;
    if (availablePlatforms.length === 0) return;
    if (!availablePlatforms.some((p) => p.key === platform)) {
      setPlatform(availablePlatforms[0].key);
    }
  }, [linkType, availablePlatforms, platform]);

  // Stage 96 — normalise + score the active colour pair. Hex normalisation
  // lets the user type `#abc` or `#aabbcc` and the picker stays calm. Risky
  // contrast (< 3:1) blocks save — scanners would struggle and the owner
  // would only find out after printing.
  const normDark = normaliseHex(dark);
  const normLight = normaliseHex(light);
  const colorsValid = !!(normDark && normLight);
  const contrast = colorsValid
    ? scoreContrast(normDark!, normLight!)
    : null;
  const contrastRisky = colorsValid && isContrastRisky(normDark!, normLight!);
  const isCustomPalette = presetId === "custom";
  // Persist only when owner actually deviated from the safe classic default
  // OR explicitly used the custom picker — keeps DB rows clean.
  const persistColors =
    colorsValid &&
    (presetId !== DEFAULT_QR_PRESET_ID ||
      normDark !== "#000000" ||
      normLight !== "#FFFFFF");

  const applyPreset = (id: string) => {
    if (id === "custom") {
      setPresetId("custom");
      return;
    }
    const p = QR_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setDark(p.dark);
    setLight(p.light);
  };

  const submit = async () => {
    if (!restaurantId) {
      setError(isTr ? "Lütfen bir işletme seçin." : "Please select a location.");
      return;
    }

    if (!colorsValid) {
      setError(
        isTr
          ? "Renk kodları geçersiz. #RRGGBB formatı kullan."
          : "Invalid colour code. Use #RRGGBB format.",
      );
      return;
    }
    if (contrastRisky) {
      setError(
        isTr
          ? "Renk kontrastı çok düşük — QR taranamayabilir. Daha koyu/açık bir pair seç."
          : "Contrast too low — the QR may fail to scan. Pick a higher-contrast pair.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const params = new URLSearchParams({ format: "svg" });
      if (tableNumber.trim()) params.set("table", tableNumber.trim());
      if (linkType === "platform") params.set("platform", platform);
      if (persistColors) {
        params.set("dark", normDark!);
        params.set("light", normLight!);
      }

      const res = await fetch(`/api/restaurants/${restaurantId}/qr?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 401) {
          setError(isTr ? "Oturumunuz sona erdi." : "Session expired.");
        } else if (res.status === 409) {
          setError(
            isTr
              ? "Bu işletme pasif. Önce aktifleştirin."
              : "This location is inactive. Activate it first.",
          );
        } else if (res.status === 429) {
          setError(
            isTr
              ? "Çok fazla istek. Lütfen biraz bekleyin."
              : "Too many requests. Please wait.",
          );
        } else {
          setError(data?.error || (isTr ? "QR oluşturulamadı." : "QR generation failed."));
        }
        return;
      }

      const svg = await res.text();
      const restaurant = restaurants.find((r) => r.id === restaurantId);

      // The endpoint embeds the slug in the SVG payload, but we don't get the
      // public URL back directly. Reconstruct from the same params we sent —
      // the server uses the same NEXT_PUBLIC_APP_URL prefix.
      const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
      const safeBase = envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)
        ? envAppUrl
        : "https://buaze.com";
      let qrUrl = `${safeBase}/r/${restaurant?.slug ?? ""}?source=qr`;
      if (tableNumber.trim()) qrUrl += `&table=${encodeURIComponent(tableNumber.trim())}`;
      if (linkType === "platform") qrUrl += `&platform=${platform}`;

      onCreated({
        restaurantId,
        restaurantName: restaurant?.name || "",
        tableNumber: tableNumber.trim() || null,
        platform: linkType === "platform" ? platform : null,
        qrUrl,
        svg,
        createdAt: new Date().toISOString(),
        darkColor: persistColors ? normDark : null,
        lightColor: persistColors ? normLight : null,
      });

      onClose();
    } catch {
      setError(
        isTr
          ? "Bağlantı hatası. İnternet bağlantınızı kontrol edin."
          : "Network error. Please check your connection.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const platformLocked = linkType === "platform" && availablePlatforms.length === 0;

  return (
    <Modal
      title={isTr ? "Yeni QR kodu oluştur" : "Create new QR code"}
      onClose={onClose}
      size={520}
    >
      <div className="flex flex-col gap-4">
        {restaurants.length > 1 && (
          <Field
            label={isTr ? "İşletme" : "Location"}
            hint={isTr ? "QR hangi işletmeye bağlanacak?" : "Which location is this QR for?"}
          >
            <select
              className="bz-input"
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field
          label={isTr ? "QR adı (opsiyonel)" : "QR name (optional)"}
          hint={isTr ? "Sadece sen göreceksin" : "Internal label only"}
        >
          <input
            className="bz-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isTr ? "Örn. Vitrin masası" : "e.g. Window seat"}
            maxLength={60}
          />
        </Field>

        <Field
          label={isTr ? "Yüksek puan yönlendirmesi" : "High-rating redirect"}
          hint={
            isTr
              ? "1–3 yıldız her zaman dahili olarak kaydedilir."
              : "1–3 stars are always captured internally."
          }
        >
          <div className="flex flex-col gap-2">
            <RadioCard
              active={linkType === "default"}
              onClick={() => setLinkType("default")}
              title={isTr ? "Varsayılan platforma gönder" : "Use default platform"}
              body={
                isTr
                  ? "İşletme ayarlarındaki varsayılan platform kullanılır"
                  : "Uses the default platform from business settings"
              }
            />
            <RadioCard
              active={linkType === "platform"}
              onClick={() => setLinkType("platform")}
              title={isTr ? "Belirli bir platforma sabitle" : "Pin to specific platform"}
              body={
                isTr
                  ? "Bu QR'ı tarayan müşteri yalnızca bu platforma yönlendirilir"
                  : "Customer scanning this QR is sent only to this platform"
              }
            />
            {linkType === "platform" && availablePlatforms.length > 0 && (
              <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {availablePlatforms.map((p) => {
                  const active = platform === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPlatform(p.key)}
                      aria-pressed={active}
                      className="flex min-h-[44px] items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left"
                      style={{
                        border: `1px solid ${active ? "#0A0A0A" : "#EDEDED"}`,
                        background: active ? "#FAFAFA" : "#fff",
                        fontFamily: "inherit",
                      }}
                    >
                      <PlatformChip id={p.chipId} size={20} />
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {linkType === "platform" && platformLocked && activeRestaurant && (
              <div className="mt-1 rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-3 py-3 text-[12.5px] leading-relaxed text-[#525252]">
                <p className="font-medium text-[#0A0A0A]">
                  {isTr
                    ? "Bu işletme için yapılandırılmış platform yok."
                    : "No platform configured for this location yet."}
                </p>
                <p className="mt-1">
                  {isTr
                    ? "Önce işletme ayarlarından en az bir platform URL'si ekleyin (Google, Yemeksepeti, Getir, Trendyol GO veya Tripadvisor)."
                    : "Add at least one platform URL from the location settings first."}
                </p>
                <Link
                  href={`${panelBase}/restaurants/${activeRestaurant.id}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#A8D62E]"
                >
                  <Link2 size={12} />
                  {isTr ? "Platform URL'lerini düzenle" : "Edit platform URLs"}
                </Link>
              </div>
            )}
          </div>
        </Field>

        <Field
          label={isTr ? "Masa numarası (opsiyonel)" : "Table number (optional)"}
          hint={
            isTr
              ? "Boş bırakılabilir; harf ve rakam karışık olabilir (örn. A1, VIP-3)"
              : "Optional; can mix letters and numbers (e.g. A1, VIP-3)"
          }
        >
          <input
            className="bz-input"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
            placeholder={isTr ? "Boş bırakılabilir" : "Optional"}
            maxLength={20}
          />
        </Field>

        {/* Stage 96 — QR colour picker. 6 curated scan-safe presets +
            "Özel" custom hex pair. Live preview swatch + WCAG contrast
            score + risky-pair block. CLAUDE.md §11 brand palette respected
            (Pulse / lime accent surfaces only via preset, not direct UI). */}
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <Palette size={12} strokeWidth={2} />
              {isTr ? "QR rengi" : "QR colour"}
            </span>
          }
          hint={
            isTr
              ? "Marka renginle eşleştir veya hazır şablon seç. Düşük kontrast taramayı engeller."
              : "Match your brand or pick a preset. Low contrast prevents scanning."
          }
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {QR_PRESETS.map((p) => {
                const active = presetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    aria-pressed={active}
                    title={isTr ? p.hintTr : p.hintEn}
                    className="group flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors"
                    style={{
                      border: `1px solid ${active ? "#0A0A0A" : "#EDEDED"}`,
                      background: active ? "#FAFAFA" : "#FFFFFF",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{
                        background: p.light,
                        border: `1px solid ${p.dark === p.light ? "#EDEDED" : "transparent"}`,
                      }}
                    >
                      <span
                        className="block h-3 w-3 rounded-full"
                        style={{ background: p.dark }}
                      />
                    </span>
                    <span className="truncate text-[11px] font-medium text-[#0A0A0A]">
                      {isTr ? p.labelTr : p.labelEn}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => applyPreset("custom")}
                aria-pressed={isCustomPalette}
                title={isTr ? "Kendi renklerini gir" : "Pick your own colours"}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors"
                style={{
                  border: `1px solid ${isCustomPalette ? "#0A0A0A" : "#EDEDED"}`,
                  background: isCustomPalette ? "#FAFAFA" : "#FFFFFF",
                }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #B47AEA, #FF6B6B)",
                    border: "1px solid #EDEDED",
                  }}
                />
                <span className="truncate text-[11px] font-medium text-[#0A0A0A]">
                  {isTr ? "Özel" : "Custom"}
                </span>
              </button>
            </div>

            {isCustomPalette && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="pulse-eyebrow text-[#737373]">
                      {isTr ? "Ön plan" : "Foreground"}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normDark ?? "#000000"}
                        onChange={(e) => setDark(e.target.value.toUpperCase())}
                        aria-label={isTr ? "Ön plan rengi" : "Foreground colour"}
                        className="h-10 w-10 shrink-0 cursor-pointer rounded border border-[#EDEDED] bg-white p-0"
                      />
                      <input
                        type="text"
                        value={dark}
                        onChange={(e) => setDark(e.target.value)}
                        placeholder="#000000"
                        maxLength={7}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        className="bz-input bz-mono flex-1 text-[14px] uppercase"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="pulse-eyebrow text-[#737373]">
                      {isTr ? "Arka plan" : "Background"}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normLight ?? "#FFFFFF"}
                        onChange={(e) => setLight(e.target.value.toUpperCase())}
                        aria-label={isTr ? "Arka plan rengi" : "Background colour"}
                        className="h-10 w-10 shrink-0 cursor-pointer rounded border border-[#EDEDED] bg-white p-0"
                      />
                      <input
                        type="text"
                        value={light}
                        onChange={(e) => setLight(e.target.value)}
                        placeholder="#FFFFFF"
                        maxLength={7}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        className="bz-input bz-mono flex-1 text-[14px] uppercase"
                      />
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Live preview + contrast verdict. Stays compact when classic
                default is active; full panel surfaces on any deviation. */}
            {colorsValid && (
              <div
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{
                  borderColor:
                    contrast?.level === "risky"
                      ? "#FECACA"
                      : contrast?.level === "passable"
                        ? "#FDE68A"
                        : "#EDEDED",
                  background:
                    contrast?.level === "risky"
                      ? "#FEF2F2"
                      : contrast?.level === "passable"
                        ? "#FFFBEB"
                        : "#FAFAFA",
                }}
              >
                {/* Swatch preview — `dark` foreground squares on `light`
                    background mimicking a QR's visual signature. */}
                <div
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 grid-cols-3 grid-rows-3 gap-[1px] rounded-md p-[3px]"
                  style={{ background: normLight ?? "#FFFFFF", border: "1px solid #EDEDED" }}
                >
                  {[1, 0, 1, 0, 1, 0, 1, 1, 0].map((on, i) => (
                    <span
                      key={i}
                      className="block rounded-[1px]"
                      style={{
                        background: on ? (normDark ?? "#000000") : "transparent",
                      }}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0A0A0A]">
                    {contrast?.level === "risky" ? (
                      <AlertTriangle size={13} strokeWidth={2.2} className="text-[#DC2626]" />
                    ) : contrast?.level === "passable" ? (
                      <AlertTriangle size={13} strokeWidth={2.2} className="text-[#D97706]" />
                    ) : (
                      <Check size={13} strokeWidth={2.4} className="text-[#16A34A]" />
                    )}
                    {isTr ? contrast?.messageTr : contrast?.messageEn}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#525252]">
                    {isTr ? "Kontrast" : "Contrast"}: <span className="bz-mono">{contrast?.ratio.toFixed(2)}:1</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </Field>

        {error && (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bz-btn-ghost w-full sm:w-auto"
            disabled={submitting}
          >
            {isTr ? "İptal" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={submit}
            className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            disabled={submitting || !restaurantId || platformLocked || !colorsValid || contrastRisky}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
            {submitting
              ? isTr
                ? "Oluşturuluyor…"
                : "Generating…"
              : isTr
                ? "QR oluştur"
                : "Generate QR"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default CreateQRModal;
