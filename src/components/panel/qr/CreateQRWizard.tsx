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
import { Field, Modal, PlatformChip, PulseSelect, type PlatformId } from "@/components/ui";
import {
  WIZARD_BACK_CLASS,
  WIZARD_NEXT_CLASS,
  WizardCheck,
  WizardChoice,
  WizardSteps,
  WizardSummaryRow,
} from "@/components/ui/WizardSteps";
import { getSectorPlatforms } from "@/lib/sector-platforms";
import {
  QR_PRESETS,
  DEFAULT_QR_PRESET_ID,
  normaliseHex,
  scoreContrast,
  isContrastRisky,
} from "@/lib/qr-colors";
// Wizard 3-step: Hedef → Renk → Önizle. Template seçim adımı Wave A
// backlog'a ertelendi; server-side composer `composePremiumQrPng` zaten
// tek Pulse Lime hero frame'i üretir. Submit'te `templateId: null`
// gönderilir, route `?template=` boş geldiğinde NULL kaydeder.

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
    // Mobile bottom-sheet modal is ~345px wide → 96px per pill →
    // 54px for the truncated label. "Önizle & oluştur" (16 chars) used
    // to truncate to "Önizle & olu…" on mobile. Shortened to a single
    // word so the label stays readable across viewport widths.
    labelTr: "Önizle",
    labelEn: "Preview",
  },
];

const SAMPLE_PREVIEW_URL = "https://www.buaze.com/r/sample?source=qr";

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

  // ─── Submission state (Step 3 — Preview) ──────────────────────────────
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
  //
  // Layout-shift fix (2026-05-14): `renderAestheticQrSvg` emits the SVG with
  // hardcoded `width="N" height="N"` attributes (intrinsic size, needed
  // server-side for `sharp` PNG composition). When we inject the SVG via
  // `dangerouslySetInnerHTML` inside a smaller container the SVG keeps its
  // intrinsic size and overflows — the QR modules appeared clipped or
  // off-centre depending on the container. We strip the width/height attrs
  // here so the viewBox-only SVG scales fluidly to fill its wrapper.
  const [previewSvg, setPreviewSvg] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);
  const previewSvgFluid = useMemo(
    () => previewSvg.replace(/\s+width="\d+"\s+height="\d+"/i, ""),
    [previewSvg],
  );

  useEffect(() => {
    if (!colorsValid) {
      setPreviewSvg("");
      return;
    }
    // Build the preview URL from the same shape the server would produce.
    // Slug + table + platform changes the encoded string → preview updates.
    const parts: string[] = [];
    if (activeRestaurant?.slug) {
      parts.push(`https://www.buaze.com/r/${activeRestaurant.slug}?source=qr`);
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
  }, [currentStep.id, canAdvanceFromTarget, canAdvanceFromColor, stepIndex]);

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
      // `save=1` — record this QR in the history list (previews and
      // downloads of existing QRs don't).
      const params = new URLSearchParams({ format: "svg", save: "1" });
      if (tableNumber.trim()) params.set("table", tableNumber.trim());
      if (linkType === "platform") params.set("platform", platform);
      if (persistColors) {
        params.set("dark", normDark!);
        params.set("light", normLight!);
      }
      // Template seçim adımı kaldırıldı (root-cause fix): server route
      // `?template=` boşken `templateId` null kaydeder, `composePremiumQrPng`
      // zaten Pulse Lime hero frame uygular. Wave A backlog'a alındı.

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
        envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl) ? envAppUrl : "https://www.buaze.com";
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
        templateId: null,
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
  // Step change → reset scroll so the new step starts at the top. The
  // scrolling container is the Modal body (`overflow-y-auto`), not
  // `headerRef` itself; calling `scrollTo` on a non-scrolling element is a
  // silent no-op which used to leave step 3 partially scrolled out of view
  // after a long step 2 (presets + custom panel + contrast banner). Walk
  // up the DOM to find the actual scroll ancestor.
  useEffect(() => {
    let el: HTMLElement | null = headerRef.current;
    while (el && el !== document.body) {
      const overflowY = window.getComputedStyle(el).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        el.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      el = el.parentElement;
    }
  }, [stepIndex]);

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-1.5">
          <Wand2 size={14} strokeWidth={2.2} className="text-pn-ink" />
          {isTr ? "QR sihirbazı" : "QR wizard"}
        </span>
      }
      onClose={onClose}
      size={620}
      footer={
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            onClick={stepIndex === 0 ? onClose : goBack}
            className={`${WIZARD_BACK_CLASS} sm:mr-auto`}
            disabled={submitting}
          >
            {stepIndex === 0 ? (
              isTr ? "İptal" : "Cancel"
            ) : (
              <>
                <ArrowLeft size={15} strokeWidth={2} />
                {isTr ? "Geri" : "Back"}
              </>
            )}
          </button>
          <span className="hidden text-[13px] tabular-nums text-[#9A9A9A] sm:inline">
            {stepIndex + 1} / {STEPS.length}
          </span>
          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={
                (currentStep.id === "target" && !canAdvanceFromTarget) ||
                (currentStep.id === "color" && !canAdvanceFromColor)
              }
              className={WIZARD_NEXT_CLASS}
            >
              {isTr ? "Devam et" : "Continue"}
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canSubmit}
              className={WIZARD_NEXT_CLASS}
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <QrCode size={15} strokeWidth={2} />
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
        {/* Stepper — pill row from 640px, "Adım 2 / 3" line + progress on phones */}
        <WizardSteps
          ariaLabel={isTr ? "QR sihirbazı adımları" : "QR wizard steps"}
          locale={isTr ? "tr" : "en"}
          surface="card"
          steps={STEPS.map((st) => ({ label: isTr ? st.labelTr : st.labelEn }))}
          current={stepIndex}
          canSelect={(idx) =>
            idx <= stepIndex ||
            (idx === 1 && canAdvanceFromTarget) ||
            (idx === 2 && canAdvanceFromTarget && canAdvanceFromColor)
          }
          onSelect={jumpTo}
        />

        {/* ───── STEP 1: TARGET ───────────────────────────────────────── */}
        {currentStep.id === "target" && (
          <div className="flex flex-col gap-4">
            {restaurants.length > 1 && (
              <Field
                label={isTr ? "İşletme" : "Location"}
                hint={isTr ? "QR hangi işletmeye bağlanacak?" : "Which location is this for?"}
              >
                <PulseSelect
                  className="w-full"
                  value={restaurantId}
                  onChange={(v) => setRestaurantId(v)}
                  options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
                />
              </Field>
            )}
            {restaurants.length === 1 && activeRestaurant && (
              <p className="text-[13px] text-[#525252]">
                {isTr ? "İşletme: " : "Location: "}
                <span className="font-medium text-pn-ink">{activeRestaurant.name}</span>
              </p>
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
                  ? "Eşiğin altındaki puanlar önce işletmenize özel forma düşer."
                  : "Ratings below your threshold go to your private form first."
              }
            >
              <div className="flex flex-col gap-2">
                <WizardChoice
                  role="radio"
                  aria-checked={linkType === "default"}
                  selected={linkType === "default"}
                  tone="plain"
                  onClick={() => setLinkType("default")}
                  icon={<Sparkles size={17} strokeWidth={1.8} />}
                  title={isTr ? "Varsayılan platforma gönder" : "Use default platform"}
                  description={
                    isTr
                      ? "İşletme ayarlarındaki varsayılan platform kullanılır"
                      : "Uses the default platform from business settings"
                  }
                />
                <WizardChoice
                  role="radio"
                  aria-checked={linkType === "platform"}
                  selected={linkType === "platform"}
                  tone="plain"
                  onClick={() => setLinkType("platform")}
                  icon={<Link2 size={17} strokeWidth={1.8} />}
                  title={isTr ? "Belirli bir platforma sabitle" : "Pin to specific platform"}
                  description={
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
                          className={`flex min-h-[52px] items-center gap-2.5 rounded-[16px] px-3 py-2 text-left text-[14px] font-medium text-pn-ink transition-[background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${
                            active
                              ? "bg-pn-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)]"
                              : "bg-[#F6F6F6] hover:bg-[#EDEDED]"
                          }`}
                        >
                          <PlatformChip id={p.chipId} size={22} />
                          <span className="min-w-0 flex-1 truncate">{p.label}</span>
                          <WizardCheck selected={active} />
                        </button>
                      );
                    })}
                  </div>
                )}
                {linkType === "platform" && platformLocked && activeRestaurant && (
                  <div className="mt-1 rounded-[18px] border border-dashed border-pn-line-strong px-4 py-3.5 text-[13px] leading-relaxed text-[#525252]">
                    <p className="font-medium text-pn-ink">
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
                      className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-pn-accent-soft px-3.5 text-[13px] font-medium text-pn-accent transition-colors hover:bg-[#EAF9B8]"
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
                <span className="text-[14px] font-medium text-pn-ink">
                  {isTr ? "Hazır renkler" : "Presets"}
                </span>
                <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {QR_PRESETS.map((p) => {
                    const active = presetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        aria-pressed={active}
                        title={isTr ? p.hintTr : p.hintEn}
                        className={`group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[16px] px-2 py-2.5 transition-[background-color,box-shadow,transform] duration-200 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${
                          active
                            ? "bg-pn-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)]"
                            : "bg-[#F6F6F6] hover:bg-[#EDEDED]"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 items-center justify-center rounded-[10px] p-1"
                          style={{
                            background: p.light,
                            border:
                              p.dark === p.light ? "1px solid #EBEBEB" : "1px solid transparent",
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
                        <span className="truncate text-[12px] font-medium text-pn-ink">
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
                      className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[16px] px-2 py-2.5 transition-[background-color,box-shadow,transform] duration-200 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${
                        isBrandPreset
                          ? "bg-pn-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)]"
                          : "bg-[#F6F6F6] hover:bg-[#EDEDED]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 items-center justify-center rounded-[10px] p-1"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #EBEBEB",
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
                      <span className="inline-flex items-center gap-0.5 truncate text-[12px] font-medium text-pn-ink">
                        <Sparkles size={9} strokeWidth={2.4} className="text-pn-accent-ink" />
                        {isTr ? "Marka" : "Brand"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => applyPreset("custom")}
                    aria-pressed={isCustomPalette}
                    title={isTr ? "Kendi renklerini gir" : "Pick your own colours"}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[16px] px-2 py-2.5 transition-[background-color,box-shadow,transform] duration-200 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${
                      isCustomPalette
                        ? "bg-pn-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)]"
                        : "bg-[#F6F6F6] hover:bg-[#EDEDED]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        background:
                          "conic-gradient(from 0deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #B47AEA, #FF6B6B)",
                        border: "1px solid #EBEBEB",
                      }}
                    />
                    <span className="truncate text-[12px] font-medium text-pn-ink">
                      {isTr ? "Özel" : "Custom"}
                    </span>
                  </button>
                </div>
              </div>

              {(isCustomPalette || isBrandPreset) && (
                <div className="rounded-[18px] bg-[#F6F6F6] p-4">
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    <label className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-pn-ink">
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
                          className="h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-pn-line bg-white p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0"
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
                          className="bz-input min-w-0 flex-1 text-[16px] tabular-nums uppercase sm:text-[14px]"
                        />
                      </div>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-pn-ink">
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
                          className="h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-pn-line bg-white p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0"
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
                          className="bz-input min-w-0 flex-1 text-[16px] tabular-nums uppercase sm:text-[14px]"
                        />
                      </div>
                    </label>
                  </div>
                  <p className="mt-2.5 text-[12px] leading-[1.5] text-[#525252]">
                    {isTr
                      ? "Renk kodunu doğrudan yazabilir veya sol kareye tıklayıp grafik seçici kullanabilirsin."
                      : "Type the hex code directly or tap the swatch to use the graphical picker."}
                  </p>
                </div>
              )}

              {colorsValid && contrast && (
                <div
                  className={`flex items-center gap-3 rounded-[18px] px-4 py-3 ${
                    contrast.level === "risky"
                      ? "bg-[#FDECEC]"
                      : contrast.level === "passable"
                        ? "bg-[#FFF6DB]"
                        : "bg-[#ECF7E6]"
                  }`}
                >
                  {contrast.level === "risky" ? (
                    <AlertTriangle size={16} strokeWidth={2.2} className="shrink-0 text-[#DC2626]" />
                  ) : contrast.level === "passable" ? (
                    <AlertTriangle size={16} strokeWidth={2.2} className="shrink-0 text-[#D97706]" />
                  ) : (
                    <Check size={16} strokeWidth={2.4} className="shrink-0 text-[#16A34A]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-pn-ink">
                      {isTr ? contrast.messageTr : contrast.messageEn}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#525252]">
                      {isTr ? "Kontrast" : "Contrast"}:{" "}
                      <span className="tabular-nums">{contrast.ratio.toFixed(2)}:1</span>
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

            {/* Right — live preview. Layout-shift fix (2026-05-14):
                aspect-square + fluid width so the box scales naturally on
                mobile (narrow modals) and desktop sticky rail. SVG is
                injected with `[&>svg]:h-full [&>svg]:w-full [&>svg]:block`
                so the viewBox-only output fills the container without
                overflow. Single background (SVG paints its own light bg
                via the `light` palette) — outer container only provides
                the rounded frame. */}
            <div className="mx-auto flex w-full max-w-[240px] shrink-0 flex-col items-center gap-2.5 rounded-[24px] bg-[#F6F6F6] p-4 lg:mx-0 lg:w-[240px] lg:sticky lg:top-0">
              <span className="text-[14px] font-medium text-pn-ink">
                {isTr ? "Canlı önizleme" : "Live preview"}
              </span>
              <div
                className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px]"
                style={{ background: normLight ?? "#FFFFFF" }}
              >
                {previewing && !previewSvgFluid ? (
                  <Loader2 size={20} className="animate-spin text-[#A3A3A3]" />
                ) : previewSvgFluid ? (
                  <div
                    className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                    aria-label={isTr ? "QR önizlemesi" : "QR preview"}
                    dangerouslySetInnerHTML={{ __html: previewSvgFluid }}
                  />
                ) : (
                  <QrCode size={48} className="text-[#D4D4D4]" strokeWidth={1.4} />
                )}
              </div>
              <p className="text-center text-[12px] leading-[1.5] text-[#737373]">
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
            <div className="flex flex-col items-center gap-3 rounded-[24px] bg-[#F6F6F6] p-5 sm:p-6">
              {/* Layout-shift fix (2026-05-14): aspect-square + fluid
                  max-width replaces the fixed 220/260 box. The SVG is
                  injected with `[&>svg]:h-full [&>svg]:w-full` so the
                  viewBox-only output scales naturally without overflow.
                  Single background (SVG paints `light`); outer box is just
                  the rounded frame. Honours iOS Safari narrow modal widths
                  (modal hits 92vw bottom-sheet mode at sm-). */}
              <div
                className="relative flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-[20px]"
                style={{ background: normLight ?? "#FFFFFF" }}
              >
                {previewing && !previewSvgFluid ? (
                  <Loader2 size={24} className="animate-spin text-[#A3A3A3]" />
                ) : previewSvgFluid ? (
                  <div
                    className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                    aria-label={isTr ? "QR önizlemesi" : "QR preview"}
                    dangerouslySetInnerHTML={{ __html: previewSvgFluid }}
                  />
                ) : (
                  <QrCode size={64} className="text-[#D4D4D4]" strokeWidth={1.2} />
                )}
              </div>
              <p className="text-center text-[13px] leading-[1.55] text-[#737373]">
                {isTr
                  ? "Bu, oluşturulacak QR'ın görsel önizlemesidir. «QR oluştur»a basınca panelinde kayıtlı olur ve indirebilirsin."
                  : "This is a preview of the QR. Press “Generate QR” to save it to your panel and download."}
              </p>
            </div>

            <div className="space-y-2">
              <WizardSummaryRow
                tone="plain"
                icon={<Tag size={16} strokeWidth={1.8} />}
                label={isTr ? "İşletme" : "Location"}
                value={summaryRestaurantName}
              />
              {tableNumber.trim() && (
                <WizardSummaryRow
                  tone="plain"
                  icon={<Hash size={16} strokeWidth={1.8} />}
                  label={isTr ? "Masa" : "Table"}
                  value={<span className="tabular-nums">{tableNumber.trim()}</span>}
                />
              )}
              <WizardSummaryRow
                tone="plain"
                icon={<Link2 size={16} strokeWidth={1.8} />}
                label={isTr ? "Yönlendirme" : "Redirect"}
                value={
                  linkType === "platform" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <PlatformChip id={PLATFORM_META[platform]?.chipId ?? "google"} size={16} />
                      {summaryPlatformLabel}
                    </span>
                  ) : (
                    summaryPlatformLabel
                  )
                }
              />
              <WizardSummaryRow
                tone="plain"
                icon={<Palette size={16} strokeWidth={1.8} />}
                label={isTr ? "Renk" : "Colour"}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-4 w-4 rounded-full border border-pn-line"
                      style={{ background: normDark ?? "#000" }}
                    />
                    <span className="tabular-nums text-[13px]">{normDark}</span>
                    <ChevronRight size={12} className="text-[#A3A3A3]" />
                    <span
                      aria-hidden="true"
                      className="inline-block h-4 w-4 rounded-full border border-pn-line"
                      style={{ background: normLight ?? "#FFF" }}
                    />
                    <span className="tabular-nums text-[13px]">{normLight}</span>
                  </span>
                }
              />
              {name.trim() && (
                <WizardSummaryRow
                  tone="plain"
                  icon={<QrCode size={16} strokeWidth={1.8} />}
                  label={isTr ? "İç ad" : "Internal name"}
                  value={<span className="truncate">{name.trim()}</span>}
                />
              )}
            </div>

            {error && (
              <div className="rounded-[18px] bg-[#FDECEC] px-4 py-3 text-[13px] text-[#B42318]">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CreateQRWizard;
