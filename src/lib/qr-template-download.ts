/**
 * Client-side download helpers for QR templates.
 *
 * Renders any registry template off-screen, captures it as PNG via
 * `html-to-image`, then optionally embeds the PNG into a single-page PDF
 * via `jspdf`. Server-side rendering is intentionally NOT touched —
 * `/api/restaurants/[id]/qr?format=png` keeps its mono-QR contract for
 * programmatic / API callers; this helper exists for owner-facing
 * "Şablonu indir" actions where the print artefact is the deliverable.
 *
 * Lifecycle:
 *   1. Caller renders <RenderTemplate mode="capture" ref={node}> (already
 *      off-screen, see `RenderTemplate.tsx`).
 *   2. Calls `downloadTemplateAsPng(node, …)` or `…AsPdf(…)`.
 *   3. Helper waits one frame for layout, snapshots, triggers download,
 *      then revokes the object URL.
 *
 * Browser-only — every public fn checks `typeof window` so calls during
 * SSR don't blow up (`window is not defined`); returns `{ ok: false,
 * reason: 'unsupported' }` instead.
 */

import { toBlob, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { TemplateMeta } from '@/components/panel/qr/templates/registry';

/** A4 portrait dimensions in millimetres. */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** Pulse Lime tint — printed margin when the template is narrower than A4. */
const PDF_PAGE_BG = '#FAFAFA';

export interface DownloadResult {
  ok: boolean;
  reason?: 'unsupported' | 'capture_failed' | 'snapshot_empty' | 'pdf_failed';
}

interface CommonOptions {
  /** File basename without extension. Default: `qr-template`. */
  filename?: string;
  /** Pixel density multiplier. 3× matches print fidelity (~300dpi @ 100mm). */
  pixelRatio?: number;
}

function safeFilename(name: string | undefined, ext: 'png' | 'pdf'): string {
  const base = (name || 'qr-template')
    .toString()
    .normalize('NFKD')
    // Strip combining marks (Türkçe diakritikler ASCII'ye düşsün)
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'qr-template'}.${ext}`;
}

/** One animation frame — gives the browser a tick to lay out the off-screen
 *  template before snapshotting. Without this, `html-to-image` can capture
 *  an empty wrapper on first call. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

/** Snapshot a DOM node as PNG and trigger a download. */
export async function downloadTemplateAsPng(
  node: HTMLElement,
  options: CommonOptions = {},
): Promise<DownloadResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  try {
    await nextFrame();
    const blob = await toBlob(node, {
      pixelRatio: options.pixelRatio ?? 3,
      cacheBust: true,
      backgroundColor: '#FFFFFF',
    });
    if (!blob || blob.size === 0) return { ok: false, reason: 'snapshot_empty' };
    triggerBlobDownload(blob, safeFilename(options.filename, 'png'));
    return { ok: true };
  } catch (error) {
    console.error('[QR template] PNG snapshot failed:', error);
    return { ok: false, reason: 'capture_failed' };
  }
}

export interface PdfOptions extends CommonOptions {
  /** Template metadata — used for physical mm sizing + bleed.
   *  Pass the meta object from the registry so the PDF page matches the
   *  template's intended print size (centred on A4 with bleed margin). */
  meta: Pick<TemplateMeta, 'print' | 'name'>;
}

/** Snapshot a DOM node and embed it in a single-page A4 PDF. */
export async function downloadTemplateAsPdf(
  node: HTMLElement,
  options: PdfOptions,
): Promise<DownloadResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  try {
    await nextFrame();
    const dataUrl = await toPng(node, {
      pixelRatio: options.pixelRatio ?? 3,
      cacheBust: true,
      backgroundColor: '#FFFFFF',
    });
    if (!dataUrl || dataUrl.length < 32) return { ok: false, reason: 'snapshot_empty' };

    const { widthMm, heightMm, bleedMm = 0 } = options.meta.print;
    // Centre the template on the A4 page, respecting bleed as outer margin.
    // If the template is wider/taller than A4, we shrink uniformly so it
    // still fits (consumer printers can crop the bleed if needed).
    const maxW = A4_WIDTH_MM - bleedMm * 2;
    const maxH = A4_HEIGHT_MM - bleedMm * 2;
    const scale = Math.min(maxW / widthMm, maxH / heightMm, 1);
    const w = widthMm * scale;
    const h = heightMm * scale;
    const x = (A4_WIDTH_MM - w) / 2;
    const y = (A4_HEIGHT_MM - h) / 2;

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    // Subtle background tint so the bleed area reads as deliberate (not
    // a missing print area).
    pdf.setFillColor(PDF_PAGE_BG);
    pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, 'F');
    pdf.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST');
    // Footer caption (helpful when prints are stored without context).
    pdf.setFontSize(7);
    pdf.setTextColor(115, 115, 115);
    pdf.text(
      `${options.meta.name} · ${widthMm}×${heightMm}mm · buaze.com`,
      A4_WIDTH_MM / 2,
      A4_HEIGHT_MM - 6,
      { align: 'center' },
    );
    pdf.save(safeFilename(options.filename, 'pdf'));
    return { ok: true };
  } catch (error) {
    console.error('[QR template] PDF generation failed:', error);
    return { ok: false, reason: 'pdf_failed' };
  }
}
