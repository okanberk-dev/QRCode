"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Eye,
  FileImage,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge, Eyebrow, PlatformChip, type PlatformId } from "@/components/ui";
import { copyToClipboard } from "@/lib/clipboard";

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
  /** Wave A — print/share template id picked in the wizard. Persisted only
   *  for backward-compat with legacy rows; root-cause fix (2026-05-14)
   *  retired the client-side template renderer + html-to-image pipeline.
   *  Field kept on the type so callers (admin + owner pages) still compile
   *  without churn while the server-side composer always uses the Pulse
   *  Lime classic frame. */
  templateId?: string | null;
}

interface QRCardProps {
  item: QRCardItem;
  /** @deprecated Lazy server-fetched SVG was used by an earlier preview
   *  variant; the root-cause fix renders the QR preview inside the card
   *  via a tiny inline `<img src="?format=png&width=240">`, so the value
   *  is ignored. Kept as optional prop to avoid touching call sites. */
  svg?: string;
  defaultPlatformLabel?: string;
  locale?: "tr" | "en";
  /** Optional delete handler. When omitted (e.g. read-only contexts), the
   *  trash button isn't rendered — the card stays a 3-action row. */
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

/**
 * Build the server-side QR download URL. Single source of truth shared by:
 *   - PNG download button (large width=1080 for print)
 *   - PDF print flow (same PNG, embedded in print window)
 *   - Inline thumbnail (width=240 for preview slot)
 *
 * `composePremiumQrPng` (`src/lib/qr-premium-png.ts`) renders the Pulse Lime
 * hero frame + headline + footer. Deterministic, no client-side capture
 * race (the html-to-image pipeline this replaces was producing empty PNGs
 * intermittently — see git log §38.178 + this fix's PR description).
 */
function buildQrUrl(
  item: Pick<QRCardItem, "restaurantId" | "tableNumber" | "platform" | "darkColor" | "lightColor">,
  options: { format: "png" | "svg"; width?: number },
): string {
  const params = new URLSearchParams({ format: options.format });
  if (item.tableNumber) params.set("table", item.tableNumber);
  if (item.platform) params.set("platform", item.platform);
  if (item.darkColor && item.lightColor) {
    params.set("dark", item.darkColor);
    params.set("light", item.lightColor);
  }
  if (options.width) params.set("width", String(options.width));
  return `/api/restaurants/${item.restaurantId}/qr?${params.toString()}`;
}

function safeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "qr";
}

export function QRCard({
  item,
  svg: _svg,
  defaultPlatformLabel = "Google",
  locale = "tr",
  onDelete,
}: QRCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isTr = locale === "tr";
  const platformChip = item.platform ? PLATFORM_TO_CHIP[item.platform] : null;
  const platformLabel = item.platform ? PLATFORM_LABEL[item.platform] : null;
  const fileName = safeFileName(item.name);

  /**
   * PNG download — server-side composed (Pulse Lime hero frame). Deterministic
   * blob fetch; empty/HTTP-error guards surface actionable error to the owner
   * rather than silent failure.
   *
   * Cross-browser download trigger disipline:
   *  - Anchor element DOM'a append + click + **1000ms delay** sonra remove
   *    (iOS Safari + Chrome bazı sürümler `a.remove()` ile `URL.revokeObjectURL`
   *    immediate çağrılınca download'ı iptal ediyor — boş PNG iniyor.
   *    setTimeout ile defer browser'a transfer'i tamamlama süresi verir).
   *  - `Content-Type` header `image/png` doğrulaması (server bir HTML 500 page
   *    döndürürse — Vercel framework default — `res.ok` true olabilir ama
   *    blob.type=text/html → kullanıcı bozuk dosya iner).
   *  - `blob.size === 0` veya `< 100 byte` guard — composer sessiz fail
   *    durumunda actionable error.
   */
  const downloadPng = async () => {
    if (downloadingPng) return;
    setDownloadError(null);
    setDownloadingPng(true);
    try {
      const res = await fetch(buildQrUrl(item, { format: "png", width: 1080 }));
      if (!res.ok) {
        setDownloadError(
          isTr
            ? `İndirilemedi (HTTP ${res.status}). Lütfen tekrar deneyin.`
            : `Download failed (HTTP ${res.status}). Please retry.`,
        );
        return;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("image/png")) {
        setDownloadError(
          isTr
            ? "Sunucu beklenmedik içerik döndürdü. Sayfayı yenileyip tekrar deneyin."
            : "Server returned unexpected content. Refresh and retry.",
        );
        return;
      }
      const blob = await res.blob();
      // 100 byte threshold: bir PNG header bile en az ~70 byte (8 byte
      // signature + 25 byte IHDR + 12 byte IEND); 100 byte altı kesin
      // bozuk/empty render. Owner empty file değil actionable error
      // görsün.
      if (blob.size < 100) {
        setDownloadError(
          isTr
            ? `Boş dosya alındı (${blob.size} B). Tekrar deneyin; sorun sürerse destek ile iletişime geçin.`
            : `Empty file (${blob.size} B). Please retry; contact support if the issue persists.`,
        );
        return;
      }
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `qr-${fileName}.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      // Defer cleanup — iOS Safari + Chrome download race condition fix.
      // Eğer `a.remove()` + `URL.revokeObjectURL` immediate çağrılırsa
      // bazı browser sürümlerinde transfer iptal olur → kullanıcıya boş
      // dosya iner. 1000ms yeterli (download stream başlamış olur).
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(objUrl);
      }, 1000);
    } catch (err) {
      console.error("[QRCard] PNG download failed:", err);
      setDownloadError(
        isTr ? "Bağlantı hatası. İnternet bağlantınızı kontrol edin." : "Network error.",
      );
    } finally {
      setDownloadingPng(false);
    }
  };

  /**
   * PDF print — same server-rendered PNG, embedded in a fresh window with
   * `@page A5 portrait` print CSS + `window.print()`. Owner picks
   * "Save as PDF" in the browser dialog. Avoids `jsPDF` dep entirely
   * (CLAUDE.md §24.3 QRGeneratorForm reuse pattern).
   */
  const printPdf = async () => {
    if (printingPdf) return;
    setDownloadError(null);
    setPrintingPdf(true);
    try {
      const res = await fetch(buildQrUrl(item, { format: "png", width: 1080 }));
      if (!res.ok) {
        setDownloadError(
          isTr
            ? `Yazdırma hazırlanamadı (HTTP ${res.status}).`
            : `Print failed (HTTP ${res.status}).`,
        );
        return;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("image/png")) {
        setDownloadError(
          isTr
            ? "Sunucu beklenmedik içerik döndürdü. Sayfayı yenileyip tekrar deneyin."
            : "Server returned unexpected content. Refresh and retry.",
        );
        return;
      }
      const blob = await res.blob();
      if (blob.size < 100) {
        setDownloadError(
          isTr
            ? `Boş dosya alındı (${blob.size} B). Tekrar deneyin.`
            : `Empty file (${blob.size} B). Please retry.`,
        );
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) {
        setDownloadError(
          isTr
            ? "Pop-up engellendi. Tarayıcı ayarlarından izin verin."
            : "Popup blocked. Allow popups in your browser settings.",
        );
        return;
      }
      // Minimal printable HTML — A5 portrait, image centred. Print dialog
      // auto-opens 250ms after load to give the browser time to paint.
      const title = `QR · ${item.name}`;
      w.document.open();
      w.document.write(`<!doctype html>
<html lang="${isTr ? "tr" : "en"}">
<head>
  <meta charset="utf-8" />
  <title>${title.replace(/[<>]/g, "")}</title>
  <style>
    @page { size: A5 portrait; margin: 12mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img { max-width: 100%; max-height: 100vh; height: auto; display: block; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="QR" />
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`);
      w.document.close();
    } catch {
      setDownloadError(
        isTr ? "Bağlantı hatası. İnternet bağlantınızı kontrol edin." : "Network error.",
      );
    } finally {
      setPrintingPdf(false);
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

  // Inline preview — small server-rendered PNG. Browser caches by URL +
  // Cache-Control: no-store on the API, so first paint is one network
  // round-trip; re-renders use the in-memory image without re-fetch.
  const previewSrc = buildQrUrl(item, { format: "png", width: 240 });

  return (
    <div className="bz-card relative overflow-hidden p-[18px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3.5">
        <div className="flex-1 min-w-0">
          <div className="bz-h-tight truncate" style={{ fontSize: 15 }} title={item.name}>
            {item.name}
          </div>
          {item.branch && (
            <div className="mt-1 text-[11px] text-[#737373] truncate">{item.branch}</div>
          )}
        </div>
        <Badge kind="ok">{isTr ? "Aktif" : "Active"}</Badge>
      </div>

      {/* Inline preview — server-rendered thumbnail (Pulse Lime hero frame).
          width=240 keeps payload ≤ 25 KB. Lazy-loaded so off-screen cards in
          long lists don't block initial paint. */}
      <div
        className="flex justify-center rounded-xl border border-[#EDEDED] bg-white p-3"
        aria-label={isTr ? "QR önizlemesi" : "QR preview"}
      >
        <img
          src={previewSrc}
          alt={isTr ? "QR önizlemesi" : "QR preview"}
          width={140}
          height={140}
          loading="lazy"
          decoding="async"
          className="h-[140px] w-[140px] object-contain"
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

      {/* Primary download row — server-side PNG (Pulse Lime hero) +
          browser print PDF. html-to-image + jsPDF kaldırıldı
          (root-cause fix: client capture pipeline empty-PNG race). */}
      <div className="mt-3.5 border-t border-[#EDEDED] pt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={downloadPng}
          disabled={downloadingPng}
          aria-label={isTr ? "QR'ı PNG olarak indir" : "Download QR as PNG"}
          className="bz-btn-lime inline-flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloadingPng ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileImage size={14} />
          )}
          {isTr ? "PNG indir" : "Download PNG"}
        </button>
        <button
          type="button"
          onClick={printPdf}
          disabled={printingPdf}
          aria-label={isTr ? "QR'ı PDF olarak yazdır" : "Print QR as PDF"}
          className="bz-btn-ghost inline-flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {printingPdf ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          {isTr ? "PDF yazdır" : "Print PDF"}
        </button>
        {downloadError && (
          <p role="alert" className="col-span-2 -mt-1 text-[11.5px] text-[#991B1B]">
            {downloadError}
          </p>
        )}
      </div>

      {/* Utility actions — copy URL, open target, optional delete */}
      <div className={`mt-2 grid gap-1 ${onDelete ? "grid-cols-4" : "grid-cols-3"}`}>
        <button
          type="button"
          onClick={downloadPng}
          aria-label={isTr ? "PNG indir" : "Download PNG"}
          title={isTr ? "PNG indir" : "Download PNG"}
          className="bz-btn-icon flex h-11 sm:h-9 w-full items-center justify-center"
        >
          <Download size={14} />
        </button>
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
