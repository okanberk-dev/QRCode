"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Download, Eye, FileImage, FileText, Layout, Loader2, Trash2 } from "lucide-react";
import { Badge, Eyebrow, PlatformChip, type PlatformId } from "@/components/ui";
import { copyToClipboard } from "@/lib/clipboard";
import { getTemplate } from "@/components/panel/qr/templates/registry";
import { deriveInitials } from "@/components/panel/qr/Brand";
import { RenderTemplate } from "@/components/panel/qr/RenderTemplate";
import {
  downloadTemplateAsPdf,
  downloadTemplateAsPng,
} from "@/lib/qr-template-download";

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
  /** @deprecated Preview now renders the chosen template inline via
   *  `TemplatePreviewSlot`, so the legacy server-fetched SVG is no longer
   *  needed. Kept as optional prop for backwards-compat with callers that
   *  still pass it; the value is ignored. */
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

/** Preview slot — fits the chosen template (any canvas size) into a square
 *  thumbnail so the owner sees a scaled-down version of what they will
 *  download. `transform: scale` + `transform-origin: top left` + outer
 *  `overflow: hidden` clips the canvas; the inner wrapper centres it
 *  inside the slot via translate. */
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
  // Defensive fallback — legacy registry entries may not have `canvas` yet.
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
            // Disable pointer events so the slot stays click-through to
            // the card's overall click target (if any).
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

export function QRCard({ item, svg: _svg, defaultPlatformLabel = "Google", locale = "tr", onDelete }: QRCardProps) {
  const [copied, setCopied] = useState(false);
  // Wave C — client-side template-aware download. The render wrapper only
  // mounts while `pendingDownload` is non-null; useEffect runs once the
  // ref is populated, snapshots the node, then clears state.
  const [pendingDownload, setPendingDownload] = useState<'png' | 'pdf' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

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

  // Wave C — client-side template downloads (html-to-image + jspdf). The
  // template is rendered off-screen via <RenderTemplate mode="capture">
  // while `pendingDownload !== null`; the useEffect below snapshots it
  // once the ref attaches, then clears the state to unmount the wrapper.
  // Server-side `/api/restaurants/[id]/qr` is unchanged — programmatic API
  // callers still get the mono-QR contract; this path is owner-only.
  const template = getTemplate(item.templateId ?? null);
  const baseName = item.branch || item.name;
  const business = {
    name: baseName,
    initials: deriveInitials(baseName),
    primaryColor: null,
    tableNumber: item.tableNumber,
    platform: item.platform,
  } as const;

  useEffect(() => {
    if (!pendingDownload) return;
    const node = captureRef.current;
    if (!node) return;
    const kind = pendingDownload;
    const filename = `qr-${template.meta.id}-${baseName}`;
    let cancelled = false;
    (async () => {
      try {
        const result =
          kind === 'pdf'
            ? await downloadTemplateAsPdf(node, { meta: template.meta, filename })
            : await downloadTemplateAsPng(node, { filename });
        if (cancelled) return;
        if (!result.ok) {
          setDownloadError(
            isTr
              ? 'İndirme başarısız oldu, tekrar deneyin.'
              : 'Download failed, please try again.',
          );
        }
      } finally {
        if (!cancelled) setPendingDownload(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // template + business + isTr are derived from `item` references so the
    // effect intentionally keys only on the trigger to avoid re-running
    // mid-snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDownload]);

  const startTemplateDownload = (kind: 'png' | 'pdf') => {
    setDownloadError(null);
    setPendingDownload(kind);
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

      {/* Şablon preview — indirilecek artefakt'ın küçük (scaled) versiyonu.
          Owner için "wizard önizleme = indirilen birebir" — küçük slot'a
          fit ettirmek için `transform: scale(min(slotW/canvasW, slotH/canvasH))`
          + `transform-origin: top left` + `overflow: hidden` clip. */}
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

      {/* Wave C — şablon-aware indirme. PDF baskı için lime CTA (primary),
          PNG sosyal/dijital paylaşım için ghost (secondary). */}
      <div className="mt-3.5 border-t border-[#EDEDED] pt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => startTemplateDownload('pdf')}
          disabled={pendingDownload !== null}
          aria-label={isTr ? "Şablonu PDF olarak indir" : "Download template as PDF"}
          className="bz-btn-lime inline-flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingDownload === 'pdf' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          {isTr ? "Şablon PDF" : "Template PDF"}
        </button>
        <button
          type="button"
          onClick={() => startTemplateDownload('png')}
          disabled={pendingDownload !== null}
          aria-label={isTr ? "Şablonu PNG olarak indir" : "Download template as PNG"}
          className="bz-btn-ghost inline-flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingDownload === 'png' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileImage size={14} />
          )}
          {isTr ? "Şablon PNG" : "Template PNG"}
        </button>
        {downloadError && (
          <p role="alert" className="col-span-2 -mt-1 text-[11.5px] text-[#991B1B]">
            {downloadError}
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

      {/* Off-screen capture wrapper — mounts only while a template download
          is in-flight. RenderTemplate handles the off-screen positioning;
          we just provide the ref. */}
      {pendingDownload !== null && (
        <RenderTemplate
          ref={captureRef}
          templateId={item.templateId ?? null}
          qrPayload={item.qrUrl}
          business={business}
          mode="capture"
        />
      )}
    </div>
  );
}

export default QRCard;
