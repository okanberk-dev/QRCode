// CLAUDE.md §3 + §11 — Owner panelinde QR oluşturulduktan sonra "Premium PDF
// şablon indir" akışı için Pulse Lime hero template. Marketing `QRGeneratorForm`
// canvas paterninden farklı: bu, `window.print()` üzerinden A5 dikey PDF üretir
// (kullanıcı tarayıcıdan "Save as PDF" veya direkt print eder). No-dep, no
// canvas composite.

export interface PremiumQrTemplateParams {
  /** Raw `<svg>...</svg>` markup — server'dan `/api/restaurants/[id]/qr?format=svg` döner. */
  qrSvg: string;
  /** Headline (restoran adı + masa/platform). Maks 60 char display. */
  title: string;
  /** Public QR URL — footer host'u için (örn. "buaze.com/r/slug"). */
  qrUrl: string;
  locale: "tr" | "en";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortHost(value: string): string {
  try {
    const u = new URL(value);
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    const host = u.hostname.replace(/^www\./, "");
    return path ? `${host}/${path.split("?")[0]}` : host;
  } catch {
    return "buaze.com";
  }
}

function buildPremiumQrTemplateHtml({ qrSvg, title, qrUrl, locale }: PremiumQrTemplateParams): string {
  const isTr = locale === "tr";
  const eyebrowText = isTr ? "BUAZE · TARA & PAYLAŞ" : "BUAZE · SCAN & SHARE";
  const ctaText = isTr ? "QR'I OKUT" : "SCAN QR";
  const safeTitle = escapeHtml(title.slice(0, 80) || "BUAZE");
  const safeUrl = escapeHtml(shortHost(qrUrl));
  const safeDoc = isTr ? "Buaze QR şablonu" : "Buaze QR template";

  // QR SVG'yi gömüyoruz; server-rendered, trusted markup (kendi
  // /api/restaurants/[id]/qr endpoint'imizden geliyor). Yine de defansif
  // olarak inline `<script>` ihtimaline karşı bir minimal kontrol:
  // qrcode npm paketi sadece <svg> + <path> + <rect> üretir, script üretmez.
  const cleanedSvg = qrSvg
    .replace(/<\?xml[^?]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  return `<!DOCTYPE html>
<html lang="${isTr ? "tr" : "en"}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(safeDoc)} — ${safeTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #EAF9B8; }
  body {
    font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
    color: #0A0A0A;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .card {
    width: 100%;
    max-width: 480px;
    aspect-ratio: 3 / 4;
    background: #EAF9B8;
    border: 2px solid #0A0A0A;
    border-radius: 28px;
    padding: clamp(28px, 6vw, 48px) clamp(24px, 5vw, 40px);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 30px 60px -24px rgba(10,10,10,0.25);
    position: relative;
    overflow: hidden;
  }

  /* Top-left accent corner — Pulse signature */
  .card::before {
    content: '';
    position: absolute;
    top: -32px;
    left: -32px;
    width: 96px;
    height: 96px;
    background: #C6F24E;
    border-radius: 999px;
    opacity: 0.6;
  }

  .eyebrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(10,10,10,0.6);
    position: relative;
    z-index: 1;
  }

  .pulse-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #C6F24E;
    border-radius: 999px;
    margin: 0 8px;
    vertical-align: middle;
    box-shadow: 0 0 0 3px rgba(198,242,78,0.45);
  }

  .headline {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: clamp(22px, 5.2vw, 34px);
    font-weight: 500;
    letter-spacing: -0.025em;
    line-height: 1.06;
    margin-top: 14px;
    max-width: 380px;
    position: relative;
    z-index: 1;
  }

  .qr-frame {
    background: #FFFFFF;
    border-radius: 22px;
    padding: 18px;
    margin: clamp(24px, 5vw, 36px) 0;
    box-shadow:
      0 14px 32px -16px rgba(10,10,10,0.28),
      0 0 0 1px rgba(10,10,10,0.04);
    position: relative;
    z-index: 1;
  }

  .qr-frame svg {
    display: block;
    width: clamp(180px, 38vw, 260px);
    height: clamp(180px, 38vw, 260px);
  }

  .cta {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #0A0A0A;
    background: #FFFFFF;
    border: 1.5px solid #0A0A0A;
    border-radius: 999px;
    padding: 8px 18px;
    position: relative;
    z-index: 1;
    margin-bottom: clamp(18px, 4vw, 28px);
  }

  .footer {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(10,10,10,0.55);
    position: relative;
    z-index: 1;
    margin-top: auto;
  }

  .url {
    margin-top: 6px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 500;
    color: rgba(10,10,10,0.7);
    word-break: break-all;
    position: relative;
    z-index: 1;
  }

  @media print {
    @page {
      size: A5 portrait;
      margin: 10mm;
    }
    html, body {
      background: #FFFFFF;
    }
    body {
      padding: 0;
      min-height: 0;
      align-items: stretch;
    }
    .card {
      max-width: 100%;
      width: 100%;
      aspect-ratio: auto;
      height: 100%;
      box-shadow: none;
      border-radius: 18px;
      page-break-inside: avoid;
    }
  }
</style>
</head>
<body>
  <article class="card" aria-label="${safeTitle}">
    <p class="eyebrow">${escapeHtml(eyebrowText)}</p>
    <h1 class="headline">${safeTitle}</h1>
    <div class="qr-frame" aria-label="QR">${cleanedSvg}</div>
    <span class="cta">${escapeHtml(ctaText)} <span class="pulse-dot" aria-hidden="true"></span></span>
    <div class="footer">
      ${isTr ? "POWERED BY BUAZE" : "POWERED BY BUAZE"}
      <div class="url">${safeUrl}</div>
    </div>
  </article>
  <script>
    window.addEventListener('load', function () {
      // Font yüklenmesini bekle (FOUT önler), sonra print dialog'unu aç.
      var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
      ready.then(function () {
        setTimeout(function () { window.print(); }, 280);
      });
    });
  </script>
</body>
</html>`;
}

export function downloadPremiumQrPdf(params: PremiumQrTemplateParams): boolean {
  if (typeof window === "undefined") return false;
  // Blob URL paterni: `window.open("", "_blank", "noopener,noreferrer")` +
  // `w.document.write()` Chrome/Safari'de `noopener` flag'iyle birlikte
  // çoğunlukla başarısız oluyor (yeni window opak, write engellenir veya
  // null döner). HTML'i Blob olarak servis edip URL ile açmak modern,
  // pop-up blocker'a dayanıklı + noopener güvenliği korunur.
  const html = buildPremiumQrTemplateHtml(params);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!w) {
    // Pop-up blocked.
    URL.revokeObjectURL(blobUrl);
    return false;
  }
  // Blob URL'i Browser dökümanı yükledikten sonra revoke et. 60 sn yeterli
  // — yazdırma dialog'u açılana kadar geçen süreyi cömertçe karşılar.
  // Erken revoke print preview'u kırabilir.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return true;
}
