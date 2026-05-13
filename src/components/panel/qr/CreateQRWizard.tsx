"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { renderAestheticQrSvg } from "@/lib/qr-aesthetic";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Hash,
  Link2,
  Loader2,
  Palette,
  QrCode,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react";
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
  /** Workspace brand colour — wizard offers it as a "Marka" preset. */
  primaryColor?: string | null;
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
  darkColor: string | null;
  lightColor: string | null;
  /** Wave A — print/share template id forwarded to QRCard for preview +
   *  PDF export. Falls back to `classic` if owner didn't change the
   *  default picker selection. */
  templateId: string | null;
}

interface CreateQRWizardProps {
  restaurants: RestaurantOption[];
  defaultRestaurantId?: string;
  locale?: "tr" | "en";
  /** Panel-scope base for the "edit platform URLs" deep link. */
  panelBase: string;
  onClose: () => void;
  onCreated: (result: QRGenerationResult) => void;
}

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

// Template step removed (Wave A simplification): server-side composePremiumQrPng
// (Pulse Lime hero) is the single design now. Wave A registry kept in code for
// future server-side template render but UI picker is hidden — owner doesn't
// pick a layout, every QR ships with the canonical Pulse template.
type StepId = "target" | "color" | "preview";

interface StepDef {
  id: StepId;
  num: string;
  icon: ReactNode;
  labelTr: string;
  labelEn: string;
}

const STEPS: StepDef[] = [
  {
    id: "target",
    num: "01",
    icon: <Tag size={14} strokeWidth={2.2} />,
    labelTr: "Hedef",
    labelEn: "Target",
  },
  {
    id: "color",
    num: "02",
    icon: <Palette size={14} strokeWidth={2.2} />,
    labelTr: "Renk",
    labelEn: "Colour",
  },
  {
    id: "preview",
    num: "03",
    icon: <QrCode size={14} strokeWidth={2.2} />,
    labelTr: "Önizle & oluştur",
    labelEn: "Preview & create",
  },
];

const SAMPLE_PREVIEW_URL = "https://buaze.com/r/sample?source=qr";

export function CreateQRWizard({
  restaurants,
  defaultRestaurantId,
  locale = "tr",
  panelBase,
  onClose,
  onCreated,
}: CreateQRWizardProps) {
  const isTr = locale === "tr";

  // ─── Wizard state ──────────────────────────────────────────────────────
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];

  // ─── Step 1 — Target ───────────────────────────────────────────────────
  const [restaurantId, setRestaurantId] = useState(
    defaultRestaurantId || restaurants[0]?.id || "",
  );
  const [name, setName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [linkType, setLinkType] = useState<"default" | "platform">("default");
  const [platform, setPlatform] = useState("google");

  // ─── Step 2 — Colour ───────────────────────────────────────────────────
  const [presetId, setPresetId] = useState<string>(DEFAULT_QR_PRESET_ID);
  const initialPreset =
    QR_PRESETS.find((p) => p.id === DEFAULT_QR_PRESET_ID) ?? QR_PRESETS[0];
  const [dark, setDark] = useState<string>(initialPreset.dark);
  const [light, setLight] = useState<string>(initialPreset.light);

  // ─── Submission state (Step 3) ─────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === restaurantId),
    [restaurants, restaurantId],
  );

  // Brand preset is restaurant-scoped — appears as an extra preset tile when
  // the workspace has a non-default brand colour.
  const brandColor = useMemo(() => {
    const raw = activeRestaurant?.primaryColor;
    if (!raw) return null;
    const hex = normaliseHex(raw);
    // Skip the schema default seed colour (#1A73E8) so workspaces that
    // never customised brand don't see a confusing "Marka" pill that
    // doesn't match what they think their brand is.
    if (!hex || hex === "#1A73E8") return null;
    return hex;
  }, [activeRestaurant?.primaryColor]);

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

  // Auto-pick the first restaurant if none preselected and list loads after mount.
  useEffect(() => {
    if (!restaurantId && restaurants[0]?.id) setRestaurantId(restaurants[0].id);
  }, [restaurantId, restaurants]);

  // Keep `platform` valid against the dynamic list — when the active
  // restaurant changes (or its config doesn't include the current pick),
  // snap to the first available platform.
  useEffect(() => {
    if (linkType !== "platform") return;
    if (availablePlatforms.length === 0) return;
    if (!availablePlatforms.some((p) => p.key === platform)) {
      setPlatform(availablePlatforms[0].key);
    }
  }, [linkType, availablePlatforms, platform]);

  // ─── Colour normalisation + contrast verdict ───────────────────────────
  const normDark = normaliseHex(dark);
  const normLight = normaliseHex(light);
  const colorsValid = !!(normDark && normLight);
  const contrast = colorsValid ? scoreContrast(normDark!, normLight!) : null;
  const contrastRisky = colorsValid && isContrastRisky(normDark!, normLight!);
  const isCustomPalette = presetId === "custom";
  const isBrandPreset = presetId === "brand";

  // Persist colours to DB only when the owner deviated from the safe
  // black-on-white classic default. Brand + preset + custom all trigger
  // persist; classic stays NULL (clean DB rows).
  const persistColors =
    colorsValid &&
    (presetId !== DEFAULT_QR_PRESET_ID || normDark !== "#000000" || normLight !== "#FFFFFF");

  const applyPreset = useCallback(
    (id: string) => {
      if (id === "custom") {
        setPresetId("custom");
        return;
      }
      if (id === "brand") {
        if (!brandColor) return;
        setPresetId("brand");
        setDark(brandColor);
        setLight("#FFFFFF");
        return;
      }
      const p = QR_PRESETS.find((x) => x.id === id);
      if (!p) return;
      setPresetId(id);
      setDark(p.dark);
      setLight(p.light);
    },
    [brandColor],
  );

  // ─── Live preview (client-side qrcode) ─────────────────────────────────
  // We render the QR with a deterministic sample URL so the preview reflects
  // colour choices instantly without hitting the server. The real QR uses
  // the actual /r/[slug] URL on submit — preview shape (modules layout) may
  // differ slightly because the URL string differs, but the colour fidelity
  // is exact. Owners scan the *generated* QR not the preview, so this is
  // visually faithful and avoids server round-trips on every colour tap.
  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!colorsValid) {
      setPreviewSvg("");
      return;
    }
    // Build the preview URL from the same shape the server would produce.
    // Slug + table + platform changes the encoded string → preview updates.
    const parts: string[] = [];
    if (activeRestaurant?.slug) {
      parts.push(`https://buaze.com/r/${activeRestaurant.slug}?source=qr`);
    } else {
      parts.push(SAMPLE_PREVIEW_URL);
    }
    if (tableNumber.trim()) parts.push(`table=${encodeURIComponent(tableNumber.trim())}`);
    if (linkType === "platform") parts.push(`platform=${platform}`);
    const previewUrl = parts.length === 1 ? parts[0] : `${parts[0]}&${parts.slice(1).join("&")}`;

    // Aesthetic rendering — rounded data modules + unified finder eyes,
    // matching the server-side `/api/restaurants/[id]/qr?format=svg`
    // output so the wizard preview is a faithful 1:1 of what owners will
    // download. Synchronous helper (no fetch needed); we still gate
    // `previewing` for the loading skeleton in case the calculation runs
    // long on lower-end devices.
    let cancelled = false;
    setPreviewing(true);
    try {
      const { svg } = renderAestheticQrSvg({
        data: previewUrl,
        size: 220,
        dark: normDark!,
        light: normLight!,
        margin: 1,
        errorCorrectionLevel: "H",
      });
      if (!cancelled) setPreviewSvg(svg);
    } catch {
      if (!cancelled) setPreviewSvg("");
    } finally {
      if (!cancelled) setPreviewing(false);
    }
    return () => {
      cancelled = true;
    };
  }, [
    colorsValid,
    normDark,
    normLight,
    activeRestaurant?.slug,
    tableNumber,
    linkType,
    platform,
  ]);

  // ─── Step navigation guards ────────────────────────────────────────────
  const platformLocked = linkType === "platform" && availablePlatforms.length === 0;
  const canAdvanceFromTarget = !!restaurantId && !platformLocked;
  const canAdvanceFromColor = colorsValid && !contrastRisky;
  const canSubmit = canAdvanceFromTarget && canAdvanceFromColor;

  const goNext = useCallback(() => {
    if (currentStep.id === "target" && !canAdvanceFromTarget) return;
    if (currentStep.id === "color" && !canAdvanceFromColor) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }, [
    currentStep.id,
    canAdvanceFromTarget,
    canAdvanceFromColor,
    stepIndex,
  ]);

  const goBack = useCallback(() => {
    setError(null);
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  const jumpTo = useCallback(
    (idx: number) => {
      // Jumping forward enforces gating; jumping backward is always allowed.
      if (idx < stepIndex) {
        setStepIndex(idx);
        setError(null);
        return;
      }
      if (idx > stepIndex) {
        if (idx >= 1 && !canAdvanceFromTarget) return;
        if (idx >= 2 && !canAdvanceFromColor) return;
        setStepIndex(idx);
      }
    },
    [stepIndex, canAdvanceFromTarget, canAdvanceFromColor],
  );

  // ─── Final submission ──────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!restaurantId) {
      setError(isTr ? "Lütfen bir işletme seçin." : "Please select a location.");
      return;
    }
    if (!colorsValid) {
      setError(
        isTr ? "Renk kodları geçersiz. #RRGGBB formatı kullan." : "Invalid colour code.",
      );
      return;
    }
    if (contrastRisky) {
      setError(
        isTr
          ? "Renk kontrastı çok düşük — QR taranamayabilir."
          : "Contrast too low — the QR may fail to scan.",
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
      // Wave A registry intact — every QR persists with `classic` template.
      // Server-side composePremiumQrPng (Pulse Lime) is the canonical render
      // path; UI picker hidden until Wave D server-render expansion.
      params.set("template", "classic");

      const res = await fetch(`/api/restaurants/${restaurantId}/qr?${params.toString()}`);
      if (!res.ok) {
        // Server may have crashed before our outer try/catch could format
        // a JSON error (auth/JWT verify, framework-level 5xx). In that
        // case `res.json()` throws → data is null → we fall back to a
        // status-code-aware message so owner can report something more
        // actionable than the bare "oluşturulamadı."
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
        } else if (data?.error) {
          // Server-formatted message (includes Prisma code / sharp error
          // detail when present — see route.ts outer catch). Best signal.
          setError(data.error);
        } else {
          // Server returned a non-JSON body (Next.js framework default
          // 5xx HTML). Surface the status code so ops can pivot to logs.
          setError(
            isTr
              ? `QR oluşturulamadı (HTTP ${res.status}). Sayfayı yenileyip tekrar deneyin; sorun sürerse destek ile iletişime geçin.`
              : `QR generation failed (HTTP ${res.status}). Refresh and retry; contact support if the issue persists.`,
          );
        }
        return;
      }

      const svg = await res.text();
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
      const safeBase =
        envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl) ? envAppUrl : "https://buaze.com";
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
        templateId: "classic",
      });
      onClose();
    } catch {
      setError(
        isTr ? "Bağlantı hatası. İnternet bağlantınızı kontrol edin." : "Network error.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    restaurantId,
    colorsValid,
    contrastRisky,
    tableNumber,
    linkType,
    platform,
    persistColors,
    normDark,
    normLight,
    restaurants,
    onCreated,
    onClose,
    isTr,
  ]);

  // ─── Render helpers ────────────────────────────────────────────────────
  const summaryRestaurantName = activeRestaurant?.name ?? (isTr ? "İşletme" : "Location");
  const summaryPlatformLabel =
    linkType === "platform" && PLATFORM_META[platform]
      ? PLATFORM_META[platform].label
      : isTr
        ? "Varsayılan platform"
        : "Default platform";

  // Allow Enter on inputs in step 1/2 to advance; Cmd+Enter to submit on step 3.
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    headerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-1.5">
          <Wand2 size={14} strokeWidth={2.2} className="text-[#0A0A0A]" />
          {isTr ? "QR sihirbazı" : "QR wizard"}
        </span>
      }
      onClose={onClose}
      size={620}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stepIndex === 0 ? onClose : goBack}
              className="bz-btn-ghost inline-flex items-center justify-center gap-1.5"
              disabled={submitting}
            >
              {stepIndex === 0 ? (
                isTr ? "İptal" : "Cancel"
              ) : (
                <>
                  <ArrowLeft size={13} strokeWidth={2.2} />
                  {isTr ? "Geri" : "Back"}
                </>
              )}
            </button>
            <span className="bz-mono hidden text-[11px] text-[#737373] sm:inline">
              {stepIndex + 1} / {STEPS.length}
            </span>
          </div>
          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={
                (currentStep.id === "target" && !canAdvanceFromTarget) ||
                (currentStep.id === "color" && !canAdvanceFromColor)
              }
              className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              {isTr ? "Devam et" : "Continue"}
              <ArrowRight size={13} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canSubmit}
              className="bz-btn-primary inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <QrCode size={14} strokeWidth={2.2} />
              )}
              {submitting
                ? isTr
                  ? "Oluşturuluyor…"
                  : "Generating…"
                : isTr
                  ? "QR oluştur"
                  : "Generate QR"}
            </button>
          )}
        </div>
      }
    >
      <div ref={headerRef} className="flex flex-col gap-5">
        {/* Stepper — desktop pill row + mobile segmented progress */}
        <div className="bz-card-soft flex items-center gap-1 p-1.5 sm:p-2">
          {STEPS.map((s, idx) => {
            const active = idx === stepIndex;
            const done = idx < stepIndex;
            const reachable =
              idx <= stepIndex ||
              (idx === 1 && canAdvanceFromTarget) ||
              (idx === 2 && canAdvanceFromTarget && canAdvanceFromColor);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpTo(idx)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className="group flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-medium transition-colors disabled:cursor-not-allowed"
                style={{
                  background: active ? "#0A0A0A" : "transparent",
                  color: active
                    ? "#FFFFFF"
                    : done
                      ? "#0A0A0A"
                      : reachable
                        ? "#525252"
                        : "#A3A3A3",
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    background: active ? "#C6F24E" : done ? "#EAF9B8" : "#FAFAFA",
                    color: "#0A0A0A",
                    border: !active && !done ? "1px solid #EDEDED" : "none",
                  }}
                >
                  {done ? <Check size={11} strokeWidth={2.6} /> : s.icon}
                </span>
                <span className="truncate">{isTr ? s.labelTr : s.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* ───── STEP 1: TARGET ───────────────────────────────────────── */}
        {currentStep.id === "target" && (
          <div className="flex flex-col gap-4">
            {restaurants.length > 1 && (
              <Field
                label={isTr ? "İşletme" : "Location"}
                hint={isTr ? "QR hangi işletmeye bağlanacak?" : "Which location is this for?"}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Hash size={11} strokeWidth={2.2} />
                    {isTr ? "Masa numarası" : "Table number"}
                  </span>
                }
                hint={isTr ? "Boş bırakılabilir (örn. A1, VIP-3)" : "Optional (e.g. A1, VIP-3)"}
              >
                <input
                  className="bz-input bz-mono"
                  value={tableNumber}
                  onChange={(e) =>
                    setTableNumber(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                  }
                  placeholder={isTr ? "Boş bırakılabilir" : "Optional"}
                  maxLength={20}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </Field>
            </div>

            <Field
              label={isTr ? "Yüksek puan yönlendirmesi" : "High-rating redirect"}
              hint={
                isTr
                  ? "1–3 yıldız her zaman dahili kaydedilir."
                  : "1–3 stars always captured internally."
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
                          }}
                        >
                          <PlatformChip id={p.chipId} size={20} />
                          <span className="truncate">{p.label}</span>
                          {active && (
                            <Check size={13} strokeWidth={2.6} className="ml-auto text-[#0A0A0A]" />
                          )}
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
                        ? "Önce işletme ayarlarından en az bir platform URL'si ekleyin."
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
          </div>
        )}

        {/* ───── STEP 2: COLOUR ───────────────────────────────────────── */}
        {currentStep.id === "color" && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            {/* Left — preset grid + custom panel */}
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? "HAZIR ŞABLONLAR" : "PRESETS"}
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {QR_PRESETS.map((p) => {
                    const active = presetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        aria-pressed={active}
                        title={isTr ? p.hintTr : p.hintEn}
                        className="group flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors"
                        style={{
                          border: `1px solid ${active ? "#0A0A0A" : "#EDEDED"}`,
                          background: active ? "#FAFAFA" : "#FFFFFF",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 items-center justify-center rounded-md p-1"
                          style={{
                            background: p.light,
                            border:
                              p.dark === p.light ? "1px solid #EDEDED" : "1px solid transparent",
                          }}
                        >
                          <span
                            className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[1px]"
                          >
                            {[1, 0, 1, 0, 1, 0, 1, 1, 0].map((on, i) => (
                              <span
                                key={i}
                                className="block rounded-[1px]"
                                style={{ background: on ? p.dark : "transparent" }}
                              />
                            ))}
                          </span>
                        </span>
                        <span className="truncate text-[11px] font-medium text-[#0A0A0A]">
                          {isTr ? p.labelTr : p.labelEn}
                        </span>
                      </button>
                    );
                  })}

                  {brandColor && (
                    <button
                      type="button"
                      onClick={() => applyPreset("brand")}
                      aria-pressed={isBrandPreset}
                      title={isTr ? "Marka rengini kullan" : "Use brand colour"}
                      className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors"
                      style={{
                        border: `1px solid ${isBrandPreset ? "#0A0A0A" : "#EDEDED"}`,
                        background: isBrandPreset ? "#FAFAFA" : "#FFFFFF",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 items-center justify-center rounded-md p-1"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #EDEDED",
                        }}
                      >
                        <span className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[1px]">
                          {[1, 0, 1, 0, 1, 0, 1, 1, 0].map((on, i) => (
                            <span
                              key={i}
                              className="block rounded-[1px]"
                              style={{ background: on ? brandColor : "transparent" }}
                            />
                          ))}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-0.5 truncate text-[11px] font-medium text-[#0A0A0A]">
                        <Sparkles size={9} strokeWidth={2.4} className="text-[#A8D62E]" />
                        {isTr ? "Marka" : "Brand"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => applyPreset("custom")}
                    aria-pressed={isCustomPalette}
                    title={isTr ? "Kendi renklerini gir" : "Pick your own colours"}
                    className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors"
                    style={{
                      border: `1px solid ${isCustomPalette ? "#0A0A0A" : "#EDEDED"}`,
                      background: isCustomPalette ? "#FAFAFA" : "#FFFFFF",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-full"
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
              </div>

              {(isCustomPalette || isBrandPreset) && (
                <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="pulse-eyebrow text-[#737373]">
                        {isTr ? "Ön plan (modüller)" : "Foreground (modules)"}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normDark ?? "#000000"}
                          onChange={(e) => {
                            setDark(e.target.value.toUpperCase());
                            // Native picker = custom palette intent.
                            if (presetId !== "custom") setPresetId("custom");
                          }}
                          aria-label={isTr ? "Ön plan rengi" : "Foreground colour"}
                          className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-[#EDEDED] bg-white p-0"
                        />
                        <input
                          type="text"
                          value={dark}
                          onChange={(e) => {
                            setDark(e.target.value);
                            if (presetId !== "custom") setPresetId("custom");
                          }}
                          placeholder="#000000"
                          maxLength={7}
                          spellCheck={false}
                          autoCapitalize="off"
                          autoCorrect="off"
                          inputMode="text"
                          className="bz-input bz-mono flex-1 uppercase"
                        />
                      </div>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="pulse-eyebrow text-[#737373]">
                        {isTr ? "Arka plan" : "Background"}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normLight ?? "#FFFFFF"}
                          onChange={(e) => {
                            setLight(e.target.value.toUpperCase());
                            if (presetId !== "custom") setPresetId("custom");
                          }}
                          aria-label={isTr ? "Arka plan rengi" : "Background colour"}
                          className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-[#EDEDED] bg-white p-0"
                        />
                        <input
                          type="text"
                          value={light}
                          onChange={(e) => {
                            setLight(e.target.value);
                            if (presetId !== "custom") setPresetId("custom");
                          }}
                          placeholder="#FFFFFF"
                          maxLength={7}
                          spellCheck={false}
                          autoCapitalize="off"
                          autoCorrect="off"
                          inputMode="text"
                          className="bz-input bz-mono flex-1 uppercase"
                        />
                      </div>
                    </label>
                  </div>
                  <p className="mt-2.5 text-[11.5px] leading-[1.5] text-[#525252]">
                    {isTr
                      ? "Renk kodunu doğrudan yazabilir veya sol kareye tıklayıp grafik seçici kullanabilirsin."
                      : "Type the hex code directly or tap the swatch to use the graphical picker."}
                  </p>
                </div>
              )}

              {colorsValid && contrast && (
                <div
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{
                    borderColor:
                      contrast.level === "risky"
                        ? "#FECACA"
                        : contrast.level === "passable"
                          ? "#FDE68A"
                          : "#D1FAE5",
                    background:
                      contrast.level === "risky"
                        ? "#FEF2F2"
                        : contrast.level === "passable"
                          ? "#FFFBEB"
                          : "#F0FDF4",
                  }}
                >
                  {contrast.level === "risky" ? (
                    <AlertTriangle size={16} strokeWidth={2.2} className="shrink-0 text-[#DC2626]" />
                  ) : contrast.level === "passable" ? (
                    <AlertTriangle size={16} strokeWidth={2.2} className="shrink-0 text-[#D97706]" />
                  ) : (
                    <Check size={16} strokeWidth={2.4} className="shrink-0 text-[#16A34A]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-[#0A0A0A]">
                      {isTr ? contrast.messageTr : contrast.messageEn}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#525252]">
                      {isTr ? "Kontrast" : "Contrast"}:{" "}
                      <span className="bz-mono">{contrast.ratio.toFixed(2)}:1</span>
                      {contrast.level === "risky" && (
                        <span className="ml-1 text-[#991B1B]">
                          {isTr ? "· Devam edemezsin" : "· Cannot proceed"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right — live preview */}
            <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-[#EDEDED] bg-white p-4 lg:w-[240px] lg:sticky lg:top-0">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? "CANLI ÖNİZLEME" : "LIVE PREVIEW"}
              </span>
              <div
                className="relative flex h-[200px] w-[200px] items-center justify-center rounded-xl"
                style={{
                  background: normLight ?? "#FFFFFF",
                  border: "1px solid #EDEDED",
                }}
              >
                {previewing && !previewSvg ? (
                  <Loader2 size={20} className="animate-spin text-[#A3A3A3]" />
                ) : previewSvg ? (
                  <div
                    className="h-full w-full p-2"
                    aria-label={isTr ? "QR önizlemesi" : "QR preview"}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                ) : (
                  <QrCode size={48} className="text-[#D4D4D4]" strokeWidth={1.4} />
                )}
              </div>
              <p className="text-center text-[11px] leading-[1.5] text-[#737373]">
                {isTr
                  ? "Sadece görsel önizleme. Gerçek QR oluşturulduğunda kaydedilir."
                  : "Visual preview only. The real QR is saved on creation."}
              </p>
            </div>
          </div>
        )}

        {/* ───── STEP 3: PREVIEW & CREATE ─────────────────────────────── */}
        {currentStep.id === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-6">
              <div
                className="flex h-[220px] w-[220px] items-center justify-center rounded-xl sm:h-[260px] sm:w-[260px]"
                style={{
                  background: normLight ?? "#FFFFFF",
                  border: "1px solid #EDEDED",
                }}
              >
                {previewing && !previewSvg ? (
                  <Loader2 size={24} className="animate-spin text-[#A3A3A3]" />
                ) : previewSvg ? (
                  <div
                    className="h-full w-full p-3"
                    aria-label={isTr ? "QR önizlemesi" : "QR preview"}
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                ) : (
                  <QrCode size={64} className="text-[#D4D4D4]" strokeWidth={1.2} />
                )}
              </div>
              <p className="text-center text-[11.5px] leading-[1.55] text-[#525252]">
                {isTr
                  ? "Bu, oluşturulacak QR'ın görsel önizlemesidir. Yeşil butona basınca panelinde kayıtlı olur ve indirebilirsin."
                  : "This is a preview of the QR. Press the green button to save it to your panel and download."}
              </p>
            </div>

            <div className="bz-card flex flex-col divide-y divide-[#EDEDED]">
              <SummaryRow
                label={isTr ? "İşletme" : "Location"}
                value={summaryRestaurantName}
              />
              {tableNumber.trim() && (
                <SummaryRow
                  label={isTr ? "Masa" : "Table"}
                  value={<span className="bz-mono">{tableNumber.trim()}</span>}
                />
              )}
              <SummaryRow
                label={isTr ? "Yönlendirme" : "Redirect"}
                value={
                  linkType === "platform" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <PlatformChip id={PLATFORM_META[platform]?.chipId ?? "google"} size={14} />
                      {summaryPlatformLabel}
                    </span>
                  ) : (
                    summaryPlatformLabel
                  )
                }
              />
              <SummaryRow
                label={isTr ? "Renk" : "Colour"}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-3.5 w-3.5 rounded-sm"
                      style={{
                        background: normDark ?? "#000",
                        border: "1px solid #EDEDED",
                      }}
                    />
                    <span className="bz-mono text-[11px]">{normDark}</span>
                    <ChevronRight size={10} className="text-[#A3A3A3]" />
                    <span
                      aria-hidden="true"
                      className="inline-block h-3.5 w-3.5 rounded-sm"
                      style={{
                        background: normLight ?? "#FFF",
                        border: "1px solid #EDEDED",
                      }}
                    />
                    <span className="bz-mono text-[11px]">{normLight}</span>
                  </span>
                }
              />
              {name.trim() && (
                <SummaryRow
                  label={isTr ? "İç ad" : "Internal name"}
                  value={<span className="truncate">{name.trim()}</span>}
                />
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="pulse-eyebrow text-[#737373]">{label}</span>
      <span className="min-w-0 truncate text-right text-[12.5px] font-medium text-[#0A0A0A]">
        {value}
      </span>
    </div>
  );
}

export default CreateQRWizard;
