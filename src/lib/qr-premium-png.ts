// CLAUDE.md §11 + §3 — Standalone premium PNG composer. Mevcut Premium PDF
// template (`qr-premium-template.ts`) HTML/CSS + window.print() üzerinden
// estetik bir A5 çıktı üretirdi; ama "PNG indir" düz raw qrcode binary'siydi
// → kullanıcı algısında "wizard daha estetik" çıktı. Bu modül PNG indirme
// için Lime frame + headline + footer composite yapar, Premium PDF ile
// görsel kimlik birebir aynı.
//
// CLAUDE.md §7 disipline: yeni dep yok — `sharp` zaten kurulu (^0.34.5,
// menu görsel akışı için), `qrcode` zaten kurulu, font Sans-Serif fallback
// (sharp/SVG text rendering harici font yüklemiyor; sistem default'a düşer
// + tarayıcı render gerekmez çünkü statik raster output).

import sharp from "sharp";

import { renderAestheticQrSvg } from "./qr-aesthetic";

export interface PremiumPngParams {
  /** Encoded QR payload — what the symbol will resolve to when scanned. */
  data: string;
  /** Output PNG side (px). Default 1200 → high-DPI prints. */
  size?: number;
  /** Foreground colour (modules). Default `#0A0A0A`. */
  dark?: string;
  /** Background colour (interior QR card). Default `#FFFFFF`. */
  light?: string;
  /** Restaurant name — rendered as headline. Trimmed to 32 chars. */
  restaurantName: string;
  /** Public-facing host (footer). Trimmed to 48 chars. */
  qrHost: string;
  /** Locale for static labels (eyebrow + CTA + footer). */
  locale?: "tr" | "en";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the Lime hero frame SVG — outer Lime canvas + soft accent circle
 * + headline text + white QR card slot + monospace footer. The QR itself
 * is composited on top with `sharp.composite` so we never inline a giant
 * base64 SVG inside another SVG (which sharp doesn't reliably re-render).
 */
function buildFrameSvg(opts: {
  size: number;
  dark: string;
  restaurantName: string;
  qrHost: string;
  locale: "tr" | "en";
  qrSlot: { x: number; y: number; size: number; cardRadius: number; cardPad: number };
}): string {
  const { size, dark, restaurantName, qrHost, locale, qrSlot } = opts;
  const isTr = locale === "tr";
  const eyebrow = isTr ? "BUAZE · TARA & PAYLAŞ" : "BUAZE · SCAN & SHARE";
  const cta = isTr ? "QR'I OKUT" : "SCAN QR";
  const footer = "POWERED BY BUAZE";

  const titleSafe = escapeXml(restaurantName.slice(0, 32) || "BUAZE");
  const hostSafe = escapeXml(qrHost.slice(0, 48));
  const eyebrowSafe = escapeXml(eyebrow);
  const ctaSafe = escapeXml(cta);

  // Card sits centred horizontally, slightly above mid (~36% from top)
  // so the headline above can breathe + footer below remains readable.
  const cardOuter = qrSlot.size + qrSlot.cardPad * 2;
  const cardX = qrSlot.x - qrSlot.cardPad;
  const cardY = qrSlot.y - qrSlot.cardPad;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size * 1.333}" width="${size}" height="${Math.round(size * 1.333)}">
  <defs>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="${dark}" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- Lime hero canvas -->
  <rect width="${size}" height="${size * 1.333}" fill="#EAF9B8"/>

  <!-- Top-left accent circle (Pulse signature) -->
  <circle cx="${size * 0.04}" cy="${size * 0.04}" r="${size * 0.1}" fill="#C6F24E" opacity="0.55"/>

  <!-- Eyebrow -->
  <text x="${size / 2}" y="${size * 0.12}" font-family="ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace" font-size="${size * 0.028}" font-weight="600" fill="${dark}" fill-opacity="0.62" text-anchor="middle" letter-spacing="${size * 0.005}">${eyebrowSafe}</text>

  <!-- Headline (restaurant name) -->
  <text x="${size / 2}" y="${size * 0.21}" font-family="'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${size * 0.072}" font-weight="500" fill="${dark}" text-anchor="middle" letter-spacing="-${size * 0.0018}">${titleSafe}</text>

  <!-- QR card (white) — symbol composited on top -->
  <rect x="${cardX}" y="${cardY}" width="${cardOuter}" height="${cardOuter}" rx="${qrSlot.cardRadius}" ry="${qrSlot.cardRadius}" fill="#FFFFFF" filter="url(#cardShadow)"/>

  <!-- CTA pill -->
  <g transform="translate(${size / 2}, ${size * 1.13})">
    <rect x="-${size * 0.13}" y="-${size * 0.038}" width="${size * 0.26}" height="${size * 0.076}" rx="${size * 0.038}" ry="${size * 0.038}" fill="#FFFFFF" stroke="${dark}" stroke-width="${Math.max(1.5, size * 0.0025)}"/>
    <text x="0" y="${size * 0.012}" font-family="'Space Grotesk', system-ui, sans-serif" font-size="${size * 0.03}" font-weight="600" fill="${dark}" text-anchor="middle" letter-spacing="${size * 0.001}">${ctaSafe}</text>
    <circle cx="${size * 0.085}" cy="0" r="${size * 0.012}" fill="#C6F24E"/>
  </g>

  <!-- Footer -->
  <text x="${size / 2}" y="${size * 1.27}" font-family="ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace" font-size="${size * 0.024}" font-weight="600" fill="${dark}" fill-opacity="0.55" text-anchor="middle" letter-spacing="${size * 0.004}">${footer}</text>
  <text x="${size / 2}" y="${size * 1.305}" font-family="ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace" font-size="${size * 0.022}" font-weight="500" fill="${dark}" fill-opacity="0.7" text-anchor="middle">${hostSafe}</text>
</svg>`;
}

/**
 * Generate a Lime-framed premium PNG. Composites a rounded aesthetic QR
 * onto a Pulse-branded canvas (3:4 portrait, A5-friendly). Server-side
 * sharp pipeline:
 *   1. Render aesthetic QR SVG (rounded modules + unified finders).
 *   2. Rasterise QR via `sharp(svgBuffer).png()` at target slot size.
 *   3. Build outer frame SVG (Lime canvas + headline + card + footer).
 *   4. Composite QR PNG over the frame.
 *   5. Output final PNG buffer (300 DPI-friendly print quality).
 *
 * Throws sharp errors upward — caller should fall back to plain qrcode
 * binary if composite fails (caller's responsibility).
 */
export async function composePremiumQrPng(params: PremiumPngParams): Promise<Buffer> {
  const size = params.size ?? 1200;
  const dark = params.dark ?? "#0A0A0A";
  const light = params.light ?? "#FFFFFF";

  // QR slot geometry — symbol size ≈ 52% of canvas width, centred,
  // sitting at ~32% from the top. White card adds 6% padding around it.
  const qrSize = Math.round(size * 0.52);
  const cardPad = Math.round(size * 0.05);
  const qrX = Math.round((size - qrSize) / 2);
  const qrY = Math.round(size * 0.31);
  const cardRadius = Math.round(size * 0.04);

  // 1) Aesthetic QR SVG (transparent-ish background so we can composite
  // cleanly over the white card). Use opts.light so the QR's own light
  // squares match the white card slot exactly.
  const { svg: qrSvg } = renderAestheticQrSvg({
    data: params.data,
    size: qrSize,
    dark,
    light,
    margin: 1,
    errorCorrectionLevel: "H",
  });

  const qrPng = await sharp(Buffer.from(qrSvg, "utf-8"))
    .resize(qrSize, qrSize, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  // 2) Outer frame SVG (Lime canvas + headline + card slot + footer)
  const frameSvg = buildFrameSvg({
    size,
    dark,
    restaurantName: params.restaurantName,
    qrHost: params.qrHost,
    locale: params.locale ?? "tr",
    qrSlot: {
      x: qrX,
      y: qrY,
      size: qrSize,
      cardRadius,
      cardPad,
    },
  });

  // 3) Composite QR over frame
  const framePng = await sharp(Buffer.from(frameSvg, "utf-8"))
    .png()
    .toBuffer();

  const composite = await sharp(framePng)
    .composite([{ input: qrPng, left: qrX, top: qrY }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return composite;
}
