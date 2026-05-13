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

/** Bekleme limiti — `document.fonts.ready` çoğu zaman <500ms döner; agresif
 *  bir üst sınır kullanıcıyı sonsuza kadar bekletmez (font load fail durumu
 *  için fallback path açık). */
const FONTS_READY_TIMEOUT_MS = 1500;

/** `getBoundingClientRect` 0×0 dönerse mount commit henüz tamamlanmamış —
 *  50 ms aralıkla 3 retry yeterli; daha uzun beklersek owner spinner'ı
 *  takılır gibi hisseder. */
const BBOX_RETRY_DELAY_MS = 50;
const BBOX_RETRY_LIMIT = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * `nextFrame`'in güçlendirilmiş hâli — capture sırası gelmeden önce hem
 * **web font yükleme** (Inter / Helvetica Neue) hem de **layout commit**
 * tamamlanmış mı doğrular. Üç katmanlı guard:
 *
 *   1. `document.fonts.ready` await — font yüklenmeden rasterize edilirse
 *      jsPDF + html-to-image text genişliklerini yanlış ölçer (bug 3).
 *   2. İki ardışık `requestAnimationFrame` — mount commit + paint cycle.
 *   3. `getBoundingClientRect()` width/height > 0 check — false ise
 *      50 ms × 3 retry; hâlâ sıfırsa `false` döner ve caller boş PNG
 *      üretmeden early-fail eder (bug 2).
 *
 * Browser-only — SSR caller'ları zaten `typeof window` early-return ile
 * burayı çağırmaz.
 */
async function waitForCapturable(node: HTMLElement): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1) Web font load — `document.fonts.ready` Promise her zaman döner ama
  //    bazı tarayıcılarda font fetch hâlâ devam ederken resolve eder.
  //    `Promise.race` üst sınır ile çevirilerek owner'ı sonsuza bekletmeyiz.
  //    `Document.fonts` lib.dom'da non-optional ama eski tarayıcı runtime'da
  //    eksik olabilir → optional erişim + try/catch guard.
  try {
    const fontsApi = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fontsApi?.ready) {
      await Promise.race([fontsApi.ready, delay(FONTS_READY_TIMEOUT_MS)]);
    }
  } catch {
    // Font API hata atarsa (eski tarayıcı) sessizce geç — browser'ın
    // kendi font fallback'ı raster'ı yine de doldurur.
  }

  // 2) Layout commit + paint
  await nextFrame();

  // 3) Bounding rect guard — node ölçüsüz ise capture başlatma.
  let remaining = BBOX_RETRY_LIMIT;
  while (remaining-- > 0) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
    await delay(BBOX_RETRY_DELAY_MS);
  }
  return false;
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
    const ready = await waitForCapturable(node);
    if (!ready) {
      console.error('[QR template] PNG: node not capturable (0×0 after retry)');
      return { ok: false, reason: 'snapshot_empty' };
    }
    const blob = await toBlob(node, {
      pixelRatio: options.pixelRatio ?? 3,
      cacheBust: true,
      backgroundColor: '#FFFFFF',
    });
    if (!blob || blob.size === 0) {
      console.error('[QR template] PNG: toBlob returned empty');
      return { ok: false, reason: 'snapshot_empty' };
    }
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
    const ready = await waitForCapturable(node);
    if (!ready) {
      console.error('[QR template] PDF: node not capturable (0×0 after retry)');
      return { ok: false, reason: 'snapshot_empty' };
    }
    const dataUrl = await toPng(node, {
      pixelRatio: options.pixelRatio ?? 3,
      cacheBust: true,
      backgroundColor: '#FFFFFF',
    });
    if (!dataUrl || dataUrl.length < 32) {
      console.error('[QR template] PDF: toPng returned empty data URL');
      return { ok: false, reason: 'snapshot_empty' };
    }

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
