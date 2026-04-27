"use client";

import { useEffect, useState } from "react";
import { Loader2, QrCode } from "lucide-react";
import { Field, Modal, PlatformChip, RadioCard } from "@/components/ui";

interface RestaurantOption {
  id: string;
  name: string;
  slug: string;
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
  onClose: () => void;
  onCreated: (result: QRGenerationResult) => void;
}

const PLATFORMS = [
  { key: "google", label: "Google Maps" },
  { key: "yemeksepeti", label: "Yemeksepeti" },
  { key: "getir", label: "Getir Yemek" },
  { key: "trendyol_go", label: "Trendyol GO" },
] as const;

const PLATFORM_TO_CHIP: Record<string, "google" | "yemeksepeti" | "getir" | "trendyol_go"> = {
  google: "google",
  yemeksepeti: "yemeksepeti",
  getir: "getir",
  trendyol_go: "trendyol_go",
};

export function CreateQRModal({
  restaurants,
  defaultRestaurantId,
  locale = "tr",
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

  // Auto-pick the first restaurant if none preselected and list loads after mount
  useEffect(() => {
    if (!restaurantId && restaurants[0]?.id) setRestaurantId(restaurants[0].id);
  }, [restaurantId, restaurants]);

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
            {linkType === "platform" && (
              <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {PLATFORMS.map((p) => {
                  const active = platform === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPlatform(p.key)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors"
                      style={{
                        border: `1px solid ${active ? "#0A0A0A" : "#EDEDED"}`,
                        background: active ? "#FAFAFA" : "#fff",
                        fontFamily: "inherit",
                      }}
                    >
                      <PlatformChip id={PLATFORM_TO_CHIP[p.key]} size={18} />
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
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

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="bz-btn-ghost"
            disabled={submitting}
          >
            {isTr ? "İptal" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={submit}
            className="bz-btn-primary inline-flex items-center gap-1.5"
            disabled={submitting || !restaurantId}
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
