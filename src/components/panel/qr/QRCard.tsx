"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Copy,
  Eye,
  FileImage,
  FileText,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { PlatformChip } from "@/components/ui";
import {
  QR_PLATFORM_LABELS,
  QR_PLATFORM_TO_CHIP,
  buildQrImageUrl,
  downloadQrPng,
  qrDownloadErrorMessage,
} from "./qr-shared";
import { PulseMenu, PulseMenuDivider, PulseMenuItem } from "@/components/ui/PulseMenu";
import { copyToClipboard } from "@/lib/clipboard";
import { resolveDisplayTimeZone } from "@/lib/timezone";

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
  locale?: "tr" | "en";
  /** Optional delete handler. When omitted (e.g. read-only contexts), the
   *  "…" menu has no delete item. */
  onDelete?: () => void;
}

export function QRCard({
  item,
  locale = "tr",
  onDelete,
}: QRCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isTr = locale === "tr";
  const platformChip = item.platform ? QR_PLATFORM_TO_CHIP[item.platform] : null;
  const platformLabel = item.platform ? QR_PLATFORM_LABELS[item.platform] : null;

  /**
   * PNG download — **plain QR** (yalnız QR matrix, kullanıcının seçtiği
   * renklerde). Kullanıcı talebi: arka plan Pulse Lime tasarımı + headline
   * + footer YOK; "sadece QR kod gözüksün, wizardda kullanıcının
   * tasarladığı şekliyle". Bonus: Vercel serverless'ta composer SVG text
   * font'unu bulamadığında kare yazı (tofu) çıkıyordu — plain mode hiç
   * text içermez = font sorunu yapısal olarak çözülür.
   *
   * Cross-browser download trigger disipline:
   *  - Anchor element DOM'a append + click + **1000ms delay** sonra remove
   *    (iOS Safari + Chrome bazı sürümler `a.remove()` ile `URL.revokeObjectURL`
   *    immediate çağrılınca download'ı iptal ediyor — boş PNG iniyor).
   *  - `Content-Type` header `image/png` doğrulaması (server HTML 500 page
   *    döndürürse `blob.type=text/html` → bozuk dosya iner).
   *  - `blob.size < 100` guard — composer sessiz fail durumunda actionable
   *    error.
   */
  const downloadPng = async () => {
    if (downloadingPng) return;
    setDownloadError(null);
    setDownloadingPng(true);
    try {
      await downloadQrPng(item, item.name);
    } catch (err) {
      console.error("[QRCard] PNG download failed:", err);
      setDownloadError(qrDownloadErrorMessage(err, isTr));
    } finally {
      setDownloadingPng(false);
    }
  };

  /**
   * PDF print — **plain QR** (yalnız QR matrix, kullanıcının seçtiği
   * renklerde). Kullanıcı talebi: PDF'de Pulse Lime hero frame + headline
   * + footer yok; "sadece kullanıcının tasarladığı gibi insin". Bonus:
   * composePremiumQrPng SVG text rendering'i Vercel serverless'ta
   * sistem fontu eksikliği nedeniyle kare yazı (Unicode tofu) çıkarıyordu
   * — plain mode hiç text içermez, font sorunu yapısal olarak çözülür.
   *
   * Server-rendered PNG'yi (style=plain) yeni window'a embed eder, A5
   * portrait print CSS + `window.print()`. Owner "Save as PDF" seçer.
   * jsPDF dep'siz (CLAUDE.md §24.3 QRGeneratorForm reuse pattern).
   */
  const printPdf = async () => {
    if (printingPdf) return;
    setDownloadError(null);
    setPrintingPdf(true);
    try {
      // PDF için plain QR — Pulse Lime hero frame yok, sadece QR.
      const res = await fetch(
        buildQrImageUrl(item, { format: "png", width: 1080, style: "plain" }),
      );
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
      // No "noopener" here: with it window.open returns null, so we could
      // never write the print page. The opener is cut right after opening.
      const w = window.open("", "_blank");
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
      w.opener = null;
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
  // Business time zone (CLAUDE.md §46): the server renders this card, so a
  // browser-local date would not match it and break hydration.
  const createdLabel = Number.isNaN(created.getTime())
    ? ""
    : created.toLocaleDateString(isTr ? "tr-TR" : "en-US", {
        day: "2-digit",
        month: "short",
        timeZone: resolveDisplayTimeZone(),
      });

  // Inline preview — plain QR (sadece module matrix, kullanıcı renkleri).
  // Kullanıcı talebi: arka plan Pulse Lime tasarımı yok, "sadece QR kod
  // gözüksün". `style=plain` server `QRCode.toBuffer` mono mode'a yönelir.
  const previewSrc = buildQrImageUrl(item, { format: "png", width: 240, style: "plain" });
  // Admin passes the business as `branch`; skip it when the name already
  // starts with it ("Kadıköy Şube · Masa 3").
  const showBranch = Boolean(item.branch) && !item.name.startsWith(item.branch ?? "");

  return (
    <div className="bz-card relative overflow-hidden p-[18px]">
      {/* Header — name + one "…" menu for the less common actions
          (copy link, open target, delete). */}
      <div className="flex items-start justify-between gap-2 mb-3.5">
        <div className="flex-1 min-w-0">
          <div className="bz-h-tight truncate" style={{ fontSize: 15 }} title={item.name}>
            {item.name}
          </div>
          {showBranch && (
            <div className="mt-1 text-[12px] text-[#737373] truncate">{item.branch}</div>
          )}
        </div>
        <PulseMenu
          trigger={
            <button
              type="button"
              aria-label={isTr ? `${item.name} için diğer işlemler` : `More actions for ${item.name}`}
              className="bz-btn-icon -mr-1.5 -mt-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center sm:h-8 sm:w-8"
            >
              <MoreHorizontal size={16} />
            </button>
          }
        >
          <PulseMenuItem icon={<Copy size={14} />} onSelect={copy}>
            {isTr ? "Bağlantıyı kopyala" : "Copy link"}
          </PulseMenuItem>
          <PulseMenuItem
            icon={<Eye size={14} />}
            onSelect={() => window.open(item.qrUrl, "_blank", "noopener,noreferrer")}
          >
            {isTr ? "Müşterinin gördüğü sayfayı aç" : "Open the customer page"}
          </PulseMenuItem>
          {onDelete && (
            <>
              <PulseMenuDivider />
              <PulseMenuItem icon={<Trash2 size={14} />} danger onSelect={onDelete}>
                {isTr ? "QR'ı sil" : "Delete QR"}
              </PulseMenuItem>
            </>
          )}
        </PulseMenu>
      </div>

      {/* Inline preview — plain QR thumbnail (sadece module matrix, kullanıcı
          renklerinde). Pulse Lime hero frame yok; "kullanıcının tasarladığı
          gibi" görünmesi için arka plan sade beyaz card. width=240 server
          response ≤ 5 KB. Lazy-loaded; off-screen card'lar initial paint'i
          bloklamaz. */}
      <div
        className="flex justify-center rounded-[20px] border border-pn-line bg-white p-3"
        aria-label={isTr ? "QR önizlemesi" : "QR preview"}
      >
        <img
          src={previewSrc}
          alt={isTr ? "QR önizlemesi" : "QR preview"}
          width={160}
          height={160}
          loading="lazy"
          decoding="async"
          className="h-[160px] w-[160px] object-contain"
        />
      </div>

      {/* Platform binding + created date. The table is already in the
          card name, so it is not repeated here. */}
      <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-pn-canvas px-2.5 py-2">
        <ArrowUpRight size={12} className="shrink-0 text-[#737373]" />
        {platformChip ? (
          <>
            <PlatformChip id={platformChip} size={16} />
            <span className="min-w-0 truncate text-[12px] font-medium text-[#525252]">
              {platformLabel}
            </span>
          </>
        ) : (
          <span className="min-w-0 truncate text-[12px] text-[#737373]">
            {isTr ? "Varsayılan platform" : "Default platform"}
          </span>
        )}
        <span
          className="ml-auto shrink-0 text-[12px] text-[#737373]"
          title={isTr ? "Oluşturulma tarihi" : "Created"}
        >
          {createdLabel}
        </span>
      </div>

      {/* Primary download row — plain QR (sadece module matrix, kullanıcı
          renklerinde). PNG: server-side `QRCode.toBuffer` mono. PDF:
          aynı plain PNG + browser print → Save as PDF. Pulse Lime hero
          frame YOK (kullanıcı talebi). html-to-image + jsPDF kaldırıldı
          (PR #656 + #658 cleanup). */}
      <div className="mt-3.5 border-t border-pn-line pt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={downloadPng}
          disabled={downloadingPng}
          aria-label={isTr ? "QR'ı PNG olarak indir" : "Download QR as PNG"}
          className="bz-btn-lime inline-flex h-10 w-full items-center justify-center gap-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
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
          className="bz-btn-ghost inline-flex h-10 w-full items-center justify-center gap-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {printingPdf ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          {isTr ? "PDF yazdır" : "Print PDF"}
        </button>
        {downloadError && (
          <p role="alert" className="col-span-2 -mt-1 text-[12px] text-[#991B1B]">
            {downloadError}
          </p>
        )}
        <p aria-live="polite" className="col-span-2 -mt-1 text-[12px] text-[#3F6212] empty:hidden">
          {copied ? (isTr ? "Bağlantı kopyalandı." : "Link copied.") : ""}
        </p>
      </div>

    </div>
  );
}

export default QRCard;
