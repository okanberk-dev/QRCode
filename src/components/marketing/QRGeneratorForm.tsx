'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Download, Printer } from 'lucide-react';

/**
 * Free QR generator (/solutions/qr-generator, CLAUDE.md §24).
 *
 * Everything happens in the browser: no account, no request to Buaze, no
 * scan tracking — the code is static and only encodes the URL.
 *
 * The preview follows the link field: a valid link redraws the code about
 * 400 ms after typing stops, and every download is disabled until the drawn
 * code matches the field, so nobody prints a code for an older link.
 *
 * Outputs:
 *   - "Kartı PNG olarak indirin": the themed card, drawn on a canvas;
 *   - "A5 PDF olarak yazdırın": the same card in a new window with A5 print
 *     CSS; the browser's print dialog saves it as PDF (§24.3: window.open +
 *     escaped HTML + print, no PDF dependency);
 *   - "Yalnız QR kodunu indirin": the plain code as PNG.
 *
 * The print window is opened without `noopener` on purpose: with it,
 * window.open() returns null and nothing could be written into the page.
 * The window only ever holds our own escaped HTML, and its `opener` is
 * cleared right after writing.
 */

type FormLocale = 'tr' | 'en';

interface QRGeneratorFormProps {
  locale: FormLocale;
}

type TemplateKey = 'beyaz' | 'lime' | 'koyu' | 'minimal';

interface Palette {
  card: string;
  fg: string;
  border: string;
  eyebrow: string;
  label: { tr: string; en: string };
}

const TEMPLATES: Record<TemplateKey, Palette> = {
  beyaz: { card: '#FFFFFF', fg: '#0A0A0A', border: '#E5E5E5', eyebrow: 'rgba(10,10,10,0.6)', label: { tr: 'Beyaz', en: 'White' } },
  lime: { card: '#C6F24E', fg: '#0A0A0A', border: '#A8D62E', eyebrow: 'rgba(10,10,10,0.65)', label: { tr: 'Lime', en: 'Lime' } },
  koyu: { card: '#0A0A0A', fg: '#FFFFFF', border: '#0A0A0A', eyebrow: 'rgba(255,255,255,0.7)', label: { tr: 'Koyu', en: 'Dark' } },
  minimal: { card: '#FAFAFA', fg: '#0A0A0A', border: '#EDEDED', eyebrow: 'rgba(10,10,10,0.6)', label: { tr: 'Minimal', en: 'Minimal' } },
};

const TEMPLATE_ORDER: readonly TemplateKey[] = ['beyaz', 'lime', 'koyu', 'minimal'];

/** Already in normalised form (URL.toString adds the trailing slash), so the
 * first preview counts as in sync with the field. */
const DEFAULT_URL = 'https://www.buaze.com/';
/** Width of the plain QR PNG in pixels. */
const QR_PX = 1000;
/** Card layout units (3:4); the exported PNG is drawn at CARD_SCALE × this size. */
const CARD_W = 1200;
const CARD_H = 1600;
const CARD_SCALE = 1.25;

const COPY = {
  tr: {
    formAria: 'QR kod oluşturma formu',
    formTitle: '1. Bilgilerinizi girin',
    previewTitle: '2. Önizleyin ve indirin',
    bizLabel: 'İşletme adı',
    bizHint: 'İsteğe bağlı. Kartın en üstünde, başlığın üzerinde görünür.',
    bizPlaceholder: 'İşletmenizin adı',
    urlLabel: 'Bağlantı (URL)',
    urlHint: 'Google yorum bağlantınız, menünüz, rezervasyon sayfanız veya web siteniz.',
    msgLabel: 'Kart başlığı',
    msgHint: 'QR kodun üstünde görünen kısa çağrı.',
    defaultMessage: 'Deneyiminizi paylaşın',
    themeLegend: 'Kart teması',
    submit: 'QR kodu oluşturun',
    errorEmpty: 'Lütfen bir bağlantı girin.',
    errorInvalid: 'Geçerli bir bağlantı girin (ör. https://ornek.com).',
    errorGenerate: 'QR kod oluşturulamadı. Bağlantıyı kontrol edip tekrar deneyin.',
    generating: 'QR kod oluşturuluyor…',
    ready: (target: string) => `QR kod hazır: ${target}`,
    canvasLabel: (target: string) => `${target} adresini açan QR kod`,
    previewCaption: 'İndireceğiniz kartın önizlemesi',
    cardFooter: 'KAMERAYLA OKUTUN · BUAZE',
    downloadCard: 'Kartı PNG olarak indirin',
    printPdf: 'A5 PDF olarak yazdırın',
    downloadQr: 'Yalnız QR kodunu indirin (PNG)',
    preparing: 'Hazırlanıyor…',
    printHint: 'Yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçin.',
    needsValidUrl: 'İndirmek için geçerli bir bağlantı girin.',
    popupBlocked: 'Yazdırma penceresi açılamadı. Tarayıcınızın açılır pencere iznini kontrol edin.',
    exportFailed: 'Kart hazırlanamadı. Sayfayı yenileyip tekrar deneyin.',
    printTitle: (name: string) => (name ? `${name} · QR kartı` : 'QR kartı'),
    printAlt: (target: string) => `${target} adresini açan QR kodlu kart`,
    fileCard: 'qr-kart',
    fileQr: 'qr-kod',
  },
  en: {
    formAria: 'QR code generator form',
    formTitle: '1. Enter your details',
    previewTitle: '2. Preview and download',
    bizLabel: 'Business name',
    bizHint: 'Optional. Shown at the very top of the card, above the headline.',
    bizPlaceholder: 'Your business name',
    urlLabel: 'Link (URL)',
    urlHint: 'Your Google review link, menu, booking page or website.',
    msgLabel: 'Card headline',
    msgHint: 'A short call to action above the QR code.',
    defaultMessage: 'Share your experience',
    themeLegend: 'Card theme',
    submit: 'Create QR code',
    errorEmpty: 'Please enter a link.',
    errorInvalid: 'Enter a valid link (for example https://example.com).',
    errorGenerate: 'The QR code could not be created. Check the link and try again.',
    generating: 'Creating the QR code…',
    ready: (target: string) => `QR code ready: ${target}`,
    canvasLabel: (target: string) => `QR code that opens ${target}`,
    previewCaption: 'Preview of the card you will download',
    cardFooter: 'SCAN WITH YOUR CAMERA · BUAZE',
    downloadCard: 'Download the card as PNG',
    printPdf: 'Print as A5 PDF',
    downloadQr: 'Download the QR code only (PNG)',
    preparing: 'Preparing…',
    printHint: 'In the print dialog, choose “Save as PDF” as the destination.',
    needsValidUrl: 'Enter a valid link to download.',
    popupBlocked: 'The print window could not open. Check your browser’s pop-up setting.',
    exportFailed: 'The card could not be prepared. Reload the page and try again.',
    printTitle: (name: string) => (name ? `${name} · QR card` : 'QR card'),
    printAlt: (target: string) => `Card with a QR code that opens ${target}`,
    fileCard: 'qr-card',
    fileQr: 'qr-code',
  },
} as const;

const LABEL = 'block text-[14px] font-semibold text-[#0A0A0A]';
const HINT = 'mt-1 text-[13px] leading-[1.5] text-[#737373]';
const INPUT =
  'mt-2 w-full min-h-[48px] rounded-[12px] border bg-white px-4 py-3 text-[16px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1';
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '') || 'qr';
  } catch {
    return 'qr';
  }
}

/** The page's actual font stacks (next/font hashes the family names). */
function cssFontFamily(variable: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines.length ? lines : [text];
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function QRGeneratorForm({ locale }: QRGeneratorFormProps) {
  const copy = COPY[locale];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [url, setUrl] = useState(DEFAULT_URL);
  const [message, setMessage] = useState<string>(copy.defaultMessage);
  const [template, setTemplate] = useState<TemplateKey>('lime');

  const [submittedUrl, setSubmittedUrl] = useState(DEFAULT_URL);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [busy, setBusy] = useState<'card' | 'pdf' | null>(null);

  const palette = TEMPLATES[template];
  const headline = message.trim() || copy.defaultMessage;
  const eyebrow = businessName.trim();

  const normalizeUrl = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('empty');
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
      throw new Error('invalid');
    }
    return parsed.toString();
  }, []);

  // The link field drives the code: a valid link redraws the preview shortly
  // after typing stops, and the downloads stay disabled until the drawn code
  // matches the field, so a download can never encode an older link.
  const pendingUrl = useMemo(() => {
    try {
      return normalizeUrl(url);
    } catch {
      return null;
    }
  }, [url, normalizeUrl]);
  const inSync = pendingUrl !== null && pendingUrl === submittedUrl;

  useEffect(() => {
    if (!pendingUrl || pendingUrl === submittedUrl) return;
    const handle = window.setTimeout(() => setSubmittedUrl(pendingUrl), 400);
    return () => window.clearTimeout(handle);
  }, [pendingUrl, submittedUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !submittedUrl) return;
    setIsGenerating(true);
    let cancelled = false;
    // Loaded on demand so the encoder isn't in the page's first bundle.
    import('qrcode')
      .then(({ default: QRCodeLib }) => {
        if (cancelled) return;
        QRCodeLib.toCanvas(
          canvas,
          submittedUrl,
          {
            width: QR_PX,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#0A0A0A', light: '#FFFFFF' },
          },
          (err) => {
            if (cancelled) return;
            // The renderer pins an inline pixel size on the element; drop it
            // so the preview box (CSS) decides how large the code looks.
            canvas.style.removeProperty('width');
            canvas.style.removeProperty('height');
            setIsGenerating(false);
            if (err) setUrlError(copy.errorGenerate);
          },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setIsGenerating(false);
        setUrlError(copy.errorGenerate);
      });
    return () => {
      cancelled = true;
    };
  }, [submittedUrl, copy.errorGenerate]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUrlError(null);
    setActionError(null);
    try {
      const normalized = normalizeUrl(url);
      setUrl(normalized);
      setSubmittedUrl(normalized);
    } catch (err) {
      setUrlError(err instanceof Error && err.message === 'empty' ? copy.errorEmpty : copy.errorInvalid);
    }
  };

  /** Draws the themed card (CARD_SCALE × 1200×1600 px). */
  const renderCard = async (): Promise<HTMLCanvasElement | null> => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas) return null;

    const headingFont = cssFontFamily('--font-heading', '"Space Grotesk", system-ui, sans-serif');
    const monoFont = cssFontFamily('--font-mono', 'ui-monospace, monospace');
    try {
      await Promise.all([
        document.fonts?.load(`500 92px ${headingFont}`),
        document.fonts?.load(`600 30px ${monoFont}`),
      ]);
      await document.fonts?.ready;
    } catch {
      // Fonts are a nicety; the card still draws with the fallback stack.
    }

    const card = document.createElement('canvas');
    card.width = CARD_W * CARD_SCALE;
    card.height = CARD_H * CARD_SCALE;
    const ctx = card.getContext('2d');
    if (!ctx) return null;
    ctx.scale(CARD_SCALE, CARD_SCALE);

    ctx.fillStyle = palette.card;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    if (palette.border !== palette.card) {
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, CARD_W - 6, CARD_H - 6);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (eyebrow) {
      ctx.fillStyle = palette.eyebrow;
      ctx.font = `600 30px ${monoFont}`;
      const upper = eyebrow.toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US').slice(0, 60);
      ctx.fillText(upper, CARD_W / 2, 170, 960);
    }

    ctx.fillStyle = palette.fg;
    ctx.font = `500 92px ${headingFont}`;
    const lines = wrapText(ctx, headline, 960, 3);
    const lineHeight = 98;
    const firstLineY = 330 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, CARD_W / 2, firstLineY + index * lineHeight);
    });

    const boxSize = 600;
    const boxX = (CARD_W - boxSize) / 2;
    const boxY = 640;
    ctx.save();
    ctx.shadowColor = template === 'koyu' ? 'rgba(0,0,0,0.45)' : 'rgba(10,10,10,0.12)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 12;
    drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 56);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(qrCanvas, boxX + 52, boxY + 52, boxSize - 104, boxSize - 104);

    ctx.fillStyle = palette.eyebrow;
    ctx.font = `600 28px ${monoFont}`;
    ctx.fillText(copy.cardFooter, CARD_W / 2, 1440, 960);

    return card;
  };

  const handleCardDownload = async () => {
    if (busy || isGenerating || !inSync) return;
    setActionError(null);
    setBusy('card');
    try {
      const card = await renderCard();
      if (!card) throw new Error('no-card');
      triggerDownload(card.toDataURL('image/png'), `${copy.fileCard}-${hostnameOf(submittedUrl)}.png`);
    } catch {
      setActionError(copy.exportFailed);
    } finally {
      setBusy(null);
    }
  };

  const handlePdfPrint = async () => {
    if (busy || isGenerating || !inSync) return;
    setActionError(null);
    // Must open synchronously inside the click, before any await, or the
    // browser treats it as an unrequested pop-up.
    const win = window.open('', '_blank');
    if (!win) {
      setActionError(copy.popupBlocked);
      return;
    }
    setBusy('pdf');
    try {
      const card = await renderCard();
      if (!card) throw new Error('no-card');
      const dataUrl = card.toDataURL('image/png');
      const title = escapeHtml(copy.printTitle(eyebrow));
      const alt = escapeHtml(copy.printAlt(submittedUrl));
      win.document.open();
      win.document.write(`<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  @page { size: A5 portrait; margin: 12mm; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { display: flex; min-height: 100vh; align-items: center; justify-content: center; }
  img { display: block; width: 124mm; max-width: 100%; height: auto; }
  @media screen {
    body { background: #f2f2f2; padding: 24px; box-sizing: border-box; }
    img { width: min(124mm, 100%); box-shadow: 0 12px 32px rgba(10, 10, 10, 0.14); }
  }
</style>
</head>
<body><img id="qr-card" src="${dataUrl}" alt="${alt}"></body>
</html>`);
      win.document.close();
      win.opener = null;
      const image = win.document.getElementById('qr-card') as HTMLImageElement | null;
      const print = () => {
        try {
          win.focus();
          win.print();
        } catch {
          // The window stays open; the visitor can print from the browser menu.
        }
      };
      if (image && !image.complete) {
        image.addEventListener('load', () => window.setTimeout(print, 150), { once: true });
      } else {
        window.setTimeout(print, 150);
      }
    } catch {
      win.close();
      setActionError(copy.exportFailed);
    } finally {
      setBusy(null);
    }
  };

  const handleQrDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || isGenerating || !inSync) return;
    setActionError(null);
    triggerDownload(canvas.toDataURL('image/png'), `${copy.fileQr}-${hostnameOf(submittedUrl)}.png`);
  };

  const actionsDisabled = isGenerating || busy !== null || !inSync;
  // Shown while the link field holds no valid link (the downloads are off).
  const showUrlHint = pendingUrl === null;

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
      {/* 1 · Form — first in the DOM, so the numbered steps read in order on mobile. */}
      <form
        onSubmit={handleSubmit}
        aria-label={copy.formAria}
        noValidate
        className="rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:p-8"
      >
        <h2 className="text-[22px] leading-[1.25] text-[#0A0A0A] sm:text-[24px]">{copy.formTitle}</h2>

        <div className="mt-6 flex flex-col gap-6">
          <div>
            <label htmlFor="qr-url" className={LABEL}>
              {copy.urlLabel}
            </label>
            <p id="qr-url-hint" className={HINT}>
              {copy.urlHint}
            </p>
            <input
              id="qr-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              required
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (urlError) setUrlError(null);
              }}
              placeholder="https://"
              aria-invalid={urlError ? true : undefined}
              aria-describedby={urlError ? 'qr-url-hint qr-url-error' : 'qr-url-hint'}
              className={`${INPUT} font-mono sm:text-[15px] ${
                urlError ? 'border-[#DC2626]' : 'border-[#E5E5E5] focus:border-[#0A0A0A]'
              }`}
            />
            {urlError ? (
              <p id="qr-url-error" role="alert" className="mt-2 flex items-center gap-1.5 text-[14px] text-[#B91C1C]">
                <AlertCircle size={15} aria-hidden="true" className="shrink-0" />
                {urlError}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="qr-biz" className={LABEL}>
              {copy.bizLabel}
            </label>
            <p id="qr-biz-hint" className={HINT}>
              {copy.bizHint}
            </p>
            <input
              id="qr-biz"
              type="text"
              autoComplete="organization"
              enterKeyHint="next"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder={copy.bizPlaceholder}
              maxLength={60}
              aria-describedby="qr-biz-hint"
              className={`${INPUT} border-[#E5E5E5] focus:border-[#0A0A0A]`}
            />
          </div>

          <div>
            <label htmlFor="qr-msg" className={LABEL}>
              {copy.msgLabel}
            </label>
            <p id="qr-msg-hint" className={HINT}>
              {copy.msgHint}
            </p>
            <input
              id="qr-msg"
              type="text"
              enterKeyHint="done"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={copy.defaultMessage}
              maxLength={48}
              aria-describedby="qr-msg-hint"
              className={`${INPUT} border-[#E5E5E5] focus:border-[#0A0A0A]`}
            />
          </div>

          <fieldset>
            <legend className={LABEL}>{copy.themeLegend}</legend>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {TEMPLATE_ORDER.map((key) => {
                const theme = TEMPLATES[key];
                return (
                  <label key={key} className="relative">
                    <input
                      type="radio"
                      name="qr-theme"
                      value={key}
                      checked={template === key}
                      onChange={() => setTemplate(key)}
                      className="peer sr-only"
                    />
                    <span
                      className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-[12px] border border-[#D4D4D4] px-3 text-[14px] font-medium transition-shadow peer-checked:shadow-[0_0_0_2px_#0A0A0A] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C6F24E] peer-focus-visible:ring-offset-2"
                      style={{ backgroundColor: theme.card, color: theme.fg }}
                    >
                      {theme.label[locale]}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] ${FOCUS}`}
          >
            {copy.submit}
          </button>
        </div>
      </form>

      {/* 2 · Preview and downloads */}
      <div className="min-w-0">
        <h2 className="text-[22px] leading-[1.25] text-[#0A0A0A] sm:text-[24px]">{copy.previewTitle}</h2>

        <figure className="mt-6">
          <figcaption className="sr-only">{copy.previewCaption}</figcaption>
          <div
            className="mx-auto flex aspect-[3/4] w-full max-w-[420px] flex-col items-center overflow-hidden rounded-[20px] px-[7%] py-[8%] text-center transition-colors lg:mx-0"
            style={{
              backgroundColor: palette.card,
              color: palette.fg,
              border: `1px solid ${palette.border}`,
              containerType: 'inline-size',
            }}
          >
            <p
              className="w-full truncate font-mono font-semibold uppercase"
              style={{ color: palette.eyebrow, fontSize: 'clamp(9px, 2.6cqw, 12px)', letterSpacing: '0.2em', minHeight: '1.4em' }}
            >
              {eyebrow}
            </p>
            <p
              className="mt-[3%] w-full break-words"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(20px, 7.4cqw, 34px)',
                fontWeight: 500,
                lineHeight: 1.06,
                letterSpacing: '-0.02em',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {headline}
            </p>
            <div
              className="my-auto w-1/2 bg-white"
              style={{
                borderRadius: '9%',
                padding: '4.3%',
                boxShadow:
                  template === 'koyu'
                    ? '0 10px 26px -12px rgba(0,0,0,0.6)'
                    : '0 10px 26px -14px rgba(10,10,10,0.25), 0 0 0 1px rgba(10,10,10,0.04)',
              }}
            >
              <canvas
                ref={canvasRef}
                width={QR_PX}
                height={QR_PX}
                role="img"
                aria-label={copy.canvasLabel(submittedUrl)}
                className="block aspect-square h-auto w-full"
              />
            </div>
            <p
              className="w-full truncate font-mono font-semibold"
              style={{ color: palette.eyebrow, fontSize: 'clamp(8px, 2.3cqw, 11px)', letterSpacing: '0.18em' }}
            >
              {copy.cardFooter}
            </p>
          </div>
        </figure>

        <p className="sr-only" aria-live="polite">
          {isGenerating ? copy.generating : copy.ready(submittedUrl)}
        </p>

        <div className="mx-auto mt-6 grid w-full max-w-[420px] grid-cols-1 gap-2.5 lg:mx-0">
          {showUrlHint ? (
            <p className="flex items-center justify-center gap-1.5 text-center text-[14px] text-[#525252]">
              <AlertCircle size={15} aria-hidden="true" className="shrink-0" />
              {copy.needsValidUrl}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleCardDownload}
            disabled={actionsDisabled}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
          >
            <Download size={16} aria-hidden="true" />
            {busy === 'card' ? copy.preparing : copy.downloadCard}
          </button>
          <button
            type="button"
            onClick={handlePdfPrint}
            disabled={actionsDisabled}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] bg-white px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#F2F2F2] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
          >
            <Printer size={16} aria-hidden="true" />
            {busy === 'pdf' ? copy.preparing : copy.printPdf}
          </button>
          <p className="text-center text-[13px] leading-[1.5] text-[#737373]">{copy.printHint}</p>
          <button
            type="button"
            onClick={handleQrDownload}
            disabled={isGenerating || !inSync}
            className={`mx-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-sm text-[15px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
          >
            {copy.downloadQr}
          </button>
          {actionError ? (
            <p role="alert" className="flex items-center justify-center gap-1.5 text-center text-[14px] text-[#B91C1C]">
              <AlertCircle size={15} aria-hidden="true" className="shrink-0" />
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
