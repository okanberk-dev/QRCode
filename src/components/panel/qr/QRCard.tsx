"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Download, Eye, Layout, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Badge, Eyebrow, PlatformChip, type PlatformId } from "@/components/ui";
import { copyToClipboard } from "@/lib/clipboard";
import { downloadPremiumQrPdf } from "@/lib/qr-premium-template";
import { getTemplate } from "@/components/panel/qr/templates/registry";

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
   *  legacy rows (rendered as `classic` via registry fallback). Used to
   *  surface the template badge + thread through downloads in Wave B. */
  templateId?: string | null;
}

interface QRCardProps {
  item: QRCardItem;
  /** Optional: rendered SVG markup. If omitted, preview shows skeleton until fetched. */
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

export function QRCard({ item, svg, defaultPlatformLabel = "Google", locale = "tr", onDelete }: QRCardProps) {
  const [copied, setCopied] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumError, setPremiumError] = useState<string | null>(null);

  const isTr = locale === "tr";
  const platformChip = item.platform ? PLATFORM_TO_CHIP[item.platform] : null;
  const platformLabel = item.platform ? PLATFORM_LABEL[item.platform] : null;

  const downloadPng = async () => {
    const params = new URLSearchParams({ format: "png" });
    if (item.tableNumber) params.set("table", item.tableNumber);
    if (item.platform) params.set("platform", item.platform);
    // Owner-chosen palette → download endpoint. Pair only — API requires both
    // (`isValidHexColor` + `persistColors = !!(darkRaw && lightRaw)`).
    if (item.darkColor && item.lightColor) {
      params.set("dark", item.darkColor);
      params.set("light", item.lightColor);
    }
    // Wave A — thread templateId through so the server keeps the row's
    // `template_id` in sync if the owner re-downloaded after picker change.
    // Wave B replaces this with client-side html-to-image render against
    // the actual template component.
    if (item.templateId) params.set("template", item.templateId);
    const url = `/api/restaurants/${item.restaurantId}/qr?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = `qr-${item.name.replace(/\s+/g, "-")}.png`;
    a.click();
    URL.revokeObjectURL(objUrl);
  };

  // Pulse Lime hero template (window.print → kullanıcı Save as PDF). Mevcut
  // `svg` prop set ise onu kullanır (modal'dan yeni üretim); aksi halde
  // server'dan tek SVG fetch eder (history kartı için). CLAUDE.md §40 disipline:
  // tek-yüzeyde fetch, server-rendered trusted markup.
  const downloadPremium = async () => {
    setPremiumError(null);
    setPremiumLoading(true);
    try {
      let qrSvg = svg;
      if (!qrSvg) {
        const params = new URLSearchParams({ format: "svg" });
        if (item.tableNumber) params.set("table", item.tableNumber);
        if (item.platform) params.set("platform", item.platform);
        // Same palette propagation as PNG download — premium template will
        // render in owner's chosen colours rather than mono default.
        if (item.darkColor && item.lightColor) {
          params.set("dark", item.darkColor);
          params.set("light", item.lightColor);
        }
        const res = await fetch(`/api/restaurants/${item.restaurantId}/qr?${params.toString()}`);
        if (!res.ok) {
          setPremiumError(isTr ? "QR alınamadı, tekrar deneyin." : "Could not fetch QR.");
          return;
        }
        qrSvg = await res.text();
      }
      const opened = downloadPremiumQrPdf({
        qrSvg,
        title: item.name,
        qrUrl: item.qrUrl,
        locale,
      });
      if (!opened) {
        setPremiumError(
          isTr
            ? "Yeni sekme engellendi — tarayıcıda pop-up izni verin."
            : "Pop-up blocked — allow pop-ups in your browser.",
        );
      }
    } catch {
      setPremiumError(isTr ? "Şablon hazırlanamadı." : "Could not prepare template.");
    } finally {
      setPremiumLoading(false);
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

  // Wave A — `getTemplate` falls back to `classic` for null/legacy rows so
  // every QR has a humane label, even before the migration backfills.
  const template = getTemplate(item.templateId ?? null);

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

      {/* QR preview */}
      <div className="flex justify-center rounded-xl border border-[#EDEDED] bg-white p-3.5">
        {svg ? (
          <div
            className="h-[128px] w-[128px] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
            aria-label={isTr ? "QR önizleme" : "QR preview"}
          />
        ) : (
          <div className="bz-skeleton h-[128px] w-[128px] rounded-md" aria-hidden="true" />
        )}
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

      {/* Template badge — Wave A surface; Wave B swaps the static preview
          above with the real template component. */}
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#FAFAFA] px-2.5 py-2">
        <Layout size={12} className="text-[#737373]" />
        <span className="text-[12px] text-[#525252] font-medium truncate">
          {isTr ? "Şablon" : "Template"} · {template.meta.name}
        </span>
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

      {/* Premium PDF — Pulse Lime şablon (signature CTA) */}
      <div className="mt-3.5 border-t border-[#EDEDED] pt-3">
        <button
          type="button"
          onClick={downloadPremium}
          disabled={premiumLoading}
          aria-label={isTr ? "Premium PDF şablon indir" : "Download premium PDF template"}
          className="bz-btn-lime inline-flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {premiumLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {premiumLoading
            ? isTr
              ? "Hazırlanıyor…"
              : "Preparing…"
            : isTr
              ? "Premium PDF şablon"
              : "Premium PDF template"}
        </button>
        {premiumError && (
          <p role="alert" className="mt-1.5 text-[11.5px] text-[#991B1B]">
            {premiumError}
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        className={`mt-2 grid gap-1 ${
          onDelete ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
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
