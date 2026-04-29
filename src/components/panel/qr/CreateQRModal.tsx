"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, QrCode, Link2 } from "lucide-react";
import { Field, Modal, PlatformChip, RadioCard, type PlatformId } from "@/components/ui";
import { getSectorPlatforms } from "@/lib/sector-platforms";

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
}

export interface QRGenerationResult {
  restaurantId: string;
  restaurantName: string;
  tableNumber: string | null;
  platform: string | null;
  qrUrl: string;
  svg: string;
  createdAt: string;
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
  | "airbnbUrl";

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
      "airbnbUrl" in activeRestaurant;

    if (!hasPlatformShape) {
      return FALLBACK_KEYS.map((key) => ({
        key,
        label: PLATFORM_META[key].label,
        chipId: PLATFORM_META[key].chipId,
      }));
    }

    const sectorAllowed = getSectorPlatforms(activeRestaurant.category ?? null);

    return Object.entries(PLATFORM_META)
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

  const submit = async () => {
    if (!restaurantId) {
      setError(isTr ? "Lütfen bir işletme seçin." : "Please select a location.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const params = new URLSearchParams({ format: "svg" });
      if (tableNumber.trim()) params.set("table", tableNumber.trim());
      if (linkType === "platform") params.set("platform", platform);

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
            disabled={submitting || !restaurantId || platformLocked}
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
