"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Eye, FileImage, FileText, Loader2, Trash2 } from "lucide-react";
import { Badge, Eyebrow, PlatformChip, type PlatformId } from "@/components/ui";
import { copyToClipboard } from "@/lib/clipboard";
import { getTemplate } from "@/components/panel/qr/templates/registry";
import { deriveInitials } from "@/components/panel/qr/Brand";

export interface QRCardItem {
  id: string;
  /** Display name — derived from tableNumber/platform/restaurant */
  name: string;
  /** Branch / restaurant name (visible when listing across multiple) */
  branch?: string;
  /** Pinned platform key (google | yemeksepeti | getir | trendyol_go) */
  platform: string | null;
  /** ISO timestamp */
  createdAt: string;
  /** Public URL the QR encodes */
  qrUrl: string;
  /** restaurantId — used for download endpoint scoping */
  restaurantId: string;
  /** tableNumber — passed through to download endpoint */
  tableNumber: string | null;
  /** Owner-chosen foreground hex (e.g. `#0A0A0A`). Forwarded to PNG/SVG
   *  endpoint so downloads match the saved palette, not platform default. */
  darkColor?: string | null;
  /** Owner-chosen background hex (e.g. `#FFFFFF`). Paired with `darkColor`. */
  lightColor?: string | null;
  /** Wave A — print/share template id picked in the wizard. NULL for
   *  legacy rows (rendered as `classic` via registry fallback). UI picker
   *  hidden in current sweep — server-side composePremiumQrPng (Pulse Lime)
   *  is the canonical render for every download. */
  templateId?: string | null;
}

interface QRCardProps {
  item: QRCardItem;
  /** @deprecated Preview now renders the chosen template inline via
   *  `TemplatePreviewSlot`, so the legacy server-fetched SVG is no longer
   *  needed. Kept as optional prop for backwards-compat with callers that
   *  still pass it; the value is ignored. */
  svg?: string;
  defaultPlatformLabel?: string;
  locale?: "tr" | "en";
  /** Optional delete handler. When omitted (e.g. read-only contexts), the
   *  trash button isn't rendered — the card stays a 2-action utility row. */
  onDelete?: () => void;
}

const PLATFORM_TO_CHIP: Record<string, PlatformId> = {
  google: "google",
  yemeksepeti: "yemeksepeti",
  getir: "getir",
  trendyol_go: "trendyol_go",
  tripadvisor: "tripadvisor",
  airbnb: "airbnb",
  booking: "booking",
  yandex: "yandex",
};

const PLATFORM_LABEL: Record<string, string> = {
  google: "Google Maps",
  yemeksepeti: "Yemeksepeti",
  getir: "Getir Yemek",
  trendyol_go: "Trendyol GO",
  tripadvisor: "Tripadvisor",
  airbnb: "Airbnb",
  booking: "Booking",
  yandex: "Yandex",
};

/** Preview slot — renders the chosen template at scaled-down size so the
 *  thumbnail visually previews what the owner will download. Pure React
 *  render (no html-to-image) — boş çıkma riski yok, deterministik. */
const PREVIEW_SLOT_PX = 140;
function TemplatePreviewSlot({
  template,
  qrPayload,
  business,
}: {
  template: ReturnType<typeof getTemplate>;
  qrPayload: string;
  business: import("./templates/types").TemplateBusiness;
}) {
  const canvas = template.meta.canvas;
  const canvasW = canvas?.width ?? 720;
  const canvasH = canvas?.height ?? 900;
  const scale = Math.min(PREVIEW_SLOT_PX / canvasW, PREVIEW_SLOT_PX / canvasH);
  const scaledW = canvasW * scale;
  const scaledH = canvasH * scale;
  const { Component } = template;
  return (
    <div
      style={{
        width: PREVIEW_SLOT_PX,
        height: PREVIEW_SLOT_PX,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: scaledW,
          height: scaledH,
          position: "relative",
        }}
      >
        <div
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <Component qrPayload={qrPayload} business={business} />
        </div>
      </div>
    </div>
  );
}

/** Build the server-side QR endpoint URL with owner-chosen palette + table
 *  + platform query params. Used by both PNG download and PDF print flows. */
function buildQrEndpoint(item: QRCardItem, format: "png" | "svg"): string {
  const params = new URLSearchParams({ format });
  if (item.tableNumber) params.set("table", item.tableNumber);
  if (item.platform) params.set("platform", item.platform);
  // Owner-chosen palette → download endpoint. Pair only — API requires both
  // (`isValidHexColor` + `persistColors = !!(darkRaw && lightRaw)`).
  if (item.darkColor && item.lightColor) {
    params.set("dark", item.darkColor);
    params.set("light", item.lightColor);
  }
  // Wave A — registry intact, every download ships as `classic` (Pulse Lime
  // hero, server-side composePremiumQrPng). UI picker hidden.
  params.set("template", item.templateId || "classic");
  return `/api/restaurants/${item.restaurantId}/qr?${params.toString()}`;
}

export function QRCard({ item, svg: _svg, defaultPlatformLabel = "Google", locale = "tr", onDelete }: QRCardProps) {
  const [copied, setCopied] = useState(false);
  // Server-side download flow: button → fetch → blob → download. No html-to-image,
  // no off-screen mount, no ref race. Boş çıkma riski sıfır (sharp deterministik).
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isTr = locale === "tr";
  const platformChip = item.platform ? PLATFORM_TO_CHIP[item.platform] : null;
  const platformLabel = item.platform ? PLATFORM_LABEL[item.platform] : null;

  const template = getTemplate(item.templateId ?? null);
  const baseName = item.branch || item.name;
  const business = {
    name: baseName,
    initials: deriveInitials(baseName),
    primaryColor: null,
    tableNumber: item.tableNumber,
    platform: item.platform,
  } as const;

  /** PNG download — fetch server-rendered Pulse Lime PNG → blob → save.
   *  composePremiumQrPng (sharp + SVG) deterministik; html-to-image race yok. */
  const downloadPng = async () => {
    setDownloadError(null);
    setDownloading("png");
    try {
      const url = buildQrEndpoint(item, "png");
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDownloadError(
          data?.error ||
            (isTr
              ? `İndirme başarısız (HTTP ${res.status}). Tekrar deneyin.`
              : `Download failed (HTTP ${res.status}). Please try again.`),
        );
        return;
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        setDownloadError(
          isTr ? "İndirilen dosya boş geldi, tekrar deneyin." : "Empty file returned, please try again.",
        );
        return;
      }
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `qr-${baseName.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      setDownloadError(
        isTr ? "Bağlantı hatası. İnternet bağlantınızı kontrol edin." : "Network error.",
      );
    } finally {
      setDownloading(null);
    }
  };

  /** PDF print — fetch server-rendered PNG → embed in new window with @page A5
   *  print CSS → trigger native print dialog. Browser offers physical print or
   *  "Save as PDF". Pattern reuses CLAUDE.md §24.3 (QRGeneratorForm). No deps
   *  (no jsPDF), no client capture (no html-to-image). */
  const printPdf = async () => {
    setDownloadError(null);
    setDownloading("pdf");
    try {
      const url = buildQrEndpoint(item, "png");
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDownloadError(
          data?.error ||
            (isTr
              ? `İndirme başarısız (HTTP ${res.status}). Tekrar deneyin.`
              : `Download failed (HTTP ${res.status}). Please try again.`),
        );
        return;
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        setDownloadError(
          isTr ? "İndirilen dosya boş geldi, tekrar deneyin." : "Empty file returned, please try again.",
        );
        return;
      }
      // Convert blob to data URL so the print window doesn't need to fetch
      // again (avoids cross-origin / cookie issues in popup context).
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const printWin = window.open("", "_blank", "noopener,noreferrer,width=600,height=800");
      if (!printWin) {
        setDownloadError(
          isTr
            ? "Popup engellendi. Tarayıcı pop-up izinlerini kontrol edin veya PNG indirip elle yazdırın."
            : "Popup blocked. Allow popups for this site or download PNG and print manually.",
        );
        return;
      }
      const safeTitle = baseName.replace(/[<>"&]/g, "");
      // Inline HTML — A5 portrait, centred, single image. Auto-print on load
      // (with 250ms settle for image decode); user "Save as PDF" or cancel.
      printWin.document.write(`<!doctype html><html><head><title>${safeTitle}</title>
<style>
  @page { size: A5 portrait; margin: 12mm; }
  html, body { margin: 0; padding: 0; background: #FFFFFF; }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  img {
    display: block;
    max-width: 100%;
    max-height: 100vh;
    width: auto;
    height: auto;
  }
  @media print {
    body { min-height: auto; }
  }
</style>
</head><body><img src="${dataUrl}" alt="${safeTitle}"/>
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 250);
  });
</script>
</body></html>`);
      printWin.document.close();
    } catch {
      setDownloadError(
        isTr ? "Bağlantı hatası. İnternet bağlantınızı kontrol edin." : "Network error.",
      );
    } finally {
      setDownloading(null);
    }
  };

  const copy = async () => {
    const ok = await copyToClipboard(item.qrUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const created = new Date(item.createdAt);
  const createdLabel = created.toLocaleDateString(isTr ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div className="bz-card relative overflow-hidden p-[18px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3.5">
        <div className="flex-1 min-w-0">
          <div
            className="bz-h-tight truncate"
            style={{ fontSize: 15 }}
            title={item.name}
          >
            {item.name}
          </div>
          {item.branch && (
            <div className="mt-1 text-[11px] text-[#737373] truncate">{item.branch}</div>
          )}
        </div>
        <Badge kind="ok">{isTr ? "Aktif" : "Active"}</Badge>
      </div>

      {/* Şablon preview — pure React render, no html-to-image. Owner sees
          the canonical Pulse Lime template at 140px scale. */}
      <div
        className="flex justify-center rounded-xl border border-[#EDEDED] bg-white p-3.5"
        aria-label={isTr ? "Şablon önizleme" : "Template preview"}
      >
        <TemplatePreviewSlot
          template={template}
          qrPayload={item.qrUrl}
          business={business}
        />
      </div>

      {/* Platform binding row */}
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FAFAFA] px-2.5 py-2">
        <ArrowUpRight size={12} className="text-[#737373]" />
        {platformChip ? (
          <>
            <PlatformChip id={platformChip} size={16} />
            <span className="text-[12px] text-[#525252] font-medium truncate">
              {platformLabel}
            </span>
          </>
        ) : (
          <span className="text-[12px] text-[#737373] truncate">
            {isTr ? "Varsayılan platform" : "Default platform"} · {defaultPlatformLabel}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 text-[12px]">
        <div>
          <Eyebrow>{isTr ? "Hedef" : "Target"}</Eyebrow>
          <div className="bz-h-tight mt-1" style={{ fontSize: 14 }}>
            {item.tableNumber
              ? `${isTr ? "Masa" : "Table"} ${item.tableNumber}`
              : isTr
                ? "Genel"
                : "General"}
          </div>
        </div>
        <div>
          <Eyebrow>{isTr ? "Oluşturuldu" : "Created"}</Eyebrow>
          <div className="mt-1 text-[12px] text-[#525252]">{createdLabel}</div>
        </div>
      </div>

      {/* Download row — server-side rendered Pulse Lime artefact. PNG = save
          to disk; PDF = native browser print dialog (Save as PDF works). */}
      <div className="mt-3.5 border-t border-[#EDEDED] pt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={downloadPng}
          disabled={downloading !== null}
          aria-label={isTr ? "PNG indir" : "Download PNG"}
          className="bz-btn-lime inline-flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading === "png" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileImage size={14} />
          )}
          {isTr ? "PNG indir" : "Download PNG"}
        </button>
        <button
          type="button"
          onClick={printPdf}
          disabled={downloading !== null}
          aria-label={isTr ? "PDF olarak yazdır" : "Print as PDF"}
          className="bz-btn-ghost inline-flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading === "pdf" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          {isTr ? "PDF yazdır" : "Print PDF"}
        </button>
        {downloadError && (
          <p role="alert" className="col-span-2 -mt-1 text-[11.5px] leading-[1.45] text-[#991B1B]">
            {downloadError}
          </p>
        )}
      </div>

      {/* Utility actions — copy URL + open target + (optional) delete. */}
      <div
        className={`mt-2 grid gap-1 ${onDelete ? "grid-cols-3" : "grid-cols-2"}`}
      >
        <button
          type="button"
          onClick={copy}
          aria-label={isTr ? "URL'yi kopyala" : "Copy URL"}
          title={isTr ? "URL'yi kopyala" : "Copy URL"}
          className="bz-btn-icon flex h-11 sm:h-9 w-full items-center justify-center"
        >
          {copied ? <Check size={14} className="text-[#A8D62E]" /> : <Copy size={14} />}
        </button>
        <a
          href={item.qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={isTr ? "Hedef sayfayı aç" : "Open target page"}
          title={isTr ? "Hedef sayfayı aç" : "Open target page"}
          className="bz-btn-icon flex h-11 sm:h-9 w-full items-center justify-center"
        >
          <Eye size={14} />
        </a>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={isTr ? "QR'ı sil" : "Delete QR"}
            title={isTr ? "Sil" : "Delete"}
            className="bz-btn-icon flex h-11 sm:h-9 w-full items-center justify-center"
            style={{ color: "#DC2626" }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default QRCard;
