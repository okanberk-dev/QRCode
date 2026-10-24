'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface QRGeneratorFormProps {
  locale: Locale;
}

type TemplateKey = 'beyaz' | 'lime' | 'koyu' | 'minimal';

const TEMPLATES: Record<TemplateKey, { card: string; fg: string; border: string; eyebrow: string }> = {
  beyaz: { card: '#FFFFFF', fg: '#0A0A0A', border: '#E5E5E5', eyebrow: 'rgba(10,10,10,0.55)' },
  lime: { card: '#C6F24E', fg: '#0A0A0A', border: 'transparent', eyebrow: 'rgba(10,10,10,0.6)' },
  koyu: { card: '#0A0A0A', fg: '#FFFFFF', border: 'transparent', eyebrow: 'rgba(255,255,255,0.55)' },
  minimal: { card: '#FAFAFA', fg: '#0A0A0A', border: '#EDEDED', eyebrow: 'rgba(10,10,10,0.55)' },
};

const DEFAULT_URL = 'https://www.buaze.com';

const getQrHostname = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '') || 'qr';
  } catch {
    return 'qr';
  }
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const wrapCanvasText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) => {
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
    while (last.length > 1 && ctx.measureText(`${last}...`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}...`;
  }

  return lines.length ? lines : [text];
};

export default function QRGeneratorForm({ locale }: QRGeneratorFormProps) {
  const isTr = locale === 'tr';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const defaultMessage = isTr ? 'Deneyiminizi paylaşın' : 'Share your experience';

  const [businessName, setBusinessName] = useState('');
  const [url, setUrl] = useState(DEFAULT_URL);
  const [message, setMessage] = useState(defaultMessage);
  const [template, setTemplate] = useState<TemplateKey>('lime');

  const [submittedUrl, setSubmittedUrl] = useState(DEFAULT_URL);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDesignDownloading, setIsDesignDownloading] = useState(false);

  const normalizeUrl = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('empty');
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(candidate);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('scheme');
    return u.toString();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !submittedUrl) return;
    setIsGenerating(true);
    let cancelled = false;
    // Loaded on demand so the ~12 KB gz encoder isn't in the page's first
    // bundle.
    import('qrcode').then(({ default: QRCodeLib }) => {
      if (cancelled) return;
      QRCodeLib.toCanvas(
        canvas,
        submittedUrl,
        {
          width: 480,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: { dark: '#0A0A0A', light: '#FFFFFF' },
        },
        (err) => {
          setIsGenerating(false);
          if (err) {
            setError(isTr ? 'QR kodu oluşturulamadı' : 'Could not generate QR code');
          }
        },
      );
    }).catch(() => {
      if (cancelled) return;
      setIsGenerating(false);
      setError(isTr ? 'QR kodu oluşturulamadı' : 'Could not generate QR code');
    });
    return () => {
      cancelled = true;
    };
  }, [submittedUrl, isTr]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      const normalized = normalizeUrl(url);
      setUrl(normalized);
      setSubmittedUrl(normalized);
    } catch (err) {
      if (err instanceof Error && err.message === 'empty') {
        setError(isTr ? 'Lütfen bir bağlantı girin' : 'Please enter a URL');
      } else {
        setError(isTr ? 'Geçerli bir bağlantı girin' : 'Please enter a valid URL');
      }
    }
  };

  const handlePngDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const hostname = getQrHostname(submittedUrl);
    link.download = `qr-${hostname}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleDesignDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDesignDownloading(true);
    try {
      await document.fonts?.ready;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1200;
      exportCanvas.height = 1600;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      const palette = TEMPLATES[template];
      const hostname = getQrHostname(submittedUrl);
      const title = (businessName || 'BUAZE').toUpperCase().slice(0, 60);
      const headline = message || defaultMessage;
      const footer = isTr ? 'BUAZE · TARA ✦ PAYLAŞ' : 'BUAZE · SCAN ✦ SHARE';

      ctx.fillStyle = palette.card;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      if (palette.border !== 'transparent') {
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, exportCanvas.width - 6, exportCanvas.height - 6);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = palette.eyebrow;
      ctx.font = '600 30px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(title, exportCanvas.width / 2, 190, 920);

      ctx.fillStyle = palette.fg;
      ctx.font = '500 92px "Space Grotesk", system-ui, sans-serif';
      const headlineLines = wrapCanvasText(ctx, headline, 920, 3);
      const headlineLineHeight = 98;
      const headlineStartY = 315 - ((headlineLines.length - 1) * headlineLineHeight) / 2;
      headlineLines.forEach((line, index) => {
        ctx.fillText(line, exportCanvas.width / 2, headlineStartY + index * headlineLineHeight);
      });

      const qrBoxSize = 600;
      const qrBoxX = (exportCanvas.width - qrBoxSize) / 2;
      const qrBoxY = 715;
      drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 56);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.shadowColor = 'rgba(10,10,10,0.08)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(canvas, qrBoxX + 52, qrBoxY + 52, qrBoxSize - 104, qrBoxSize - 104);
      ctx.shadowColor = 'transparent';

      ctx.fillStyle = palette.eyebrow;
      ctx.font = '600 28px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(footer, exportCanvas.width / 2, 1440, 920);

      const link = document.createElement('a');
      link.download = `qr-design-${hostname}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsDesignDownloading(false);
    }
  };

  const palette = TEMPLATES[template];

  return (
    <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
      {/* ─── 1. Form (FAFAFA card) ───
          On mobile, form comes first (DOM order) so the user can see the
          numbered "1. Bilgilerini gir" → "2. Önizle ve indir" sequence in
          natural reading order. Desktop keeps the design's left/right split
          via `lg:order-*`. */}
      <form
        onSubmit={handleSubmit}
        aria-label={isTr ? 'QR kod oluşturma formu' : 'QR code generator form'}
        className="bg-[#FAFAFA] border border-[#EDEDED] rounded-[18px] p-6 sm:p-8 lg:order-1"
      >
        <h2
          className="text-[22px] sm:text-[24px] font-semibold text-[#0A0A0A] tracking-[-0.015em] mb-5"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? '1. Bilgilerini gir' : '1. Enter your details'}
        </h2>

        <div className="flex flex-col gap-[18px]">
          {/* İşletme adı */}
          <div>
            <label htmlFor="qr-biz" className="pulse-eyebrow text-[#737373] block">
              {isTr ? 'İŞLETME ADI' : 'BUSINESS NAME'}
            </label>
            <input
              id="qr-biz"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={isTr ? 'Ark Bistro' : 'Ark Bistro'}
              maxLength={60}
              className="mt-1.5 w-full px-4 py-3.5 bg-white rounded-[10px] border border-[#E5E5E5] text-[15px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>

          {/* URL */}
          <div>
            <label htmlFor="qr-url" className="pulse-eyebrow text-[#737373] block">
              {isTr ? 'GOOGLE YORUM LİNKİ' : 'GOOGLE REVIEW LINK'}
            </label>
            <input
              id="qr-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="g.page/r/CZEa4X..."
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'qr-url-error' : undefined}
              className={`mt-1.5 w-full px-4 py-3.5 bg-white rounded-[10px] border text-[14px] text-[#525252] placeholder:text-[#A3A3A3] outline-none transition-colors font-mono ${
                error
                  ? 'border-[#DC2626] focus:border-[#DC2626]'
                  : 'border-[#E5E5E5] focus:border-[#0A0A0A]'
              }`}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            {error && (
              <p
                id="qr-url-error"
                role="alert"
                className="mt-1.5 text-[13px] text-[#DC2626] flex items-center gap-1.5"
              >
                <AlertCircle size={14} aria-hidden />
                {error}
              </p>
            )}
          </div>

          {/* Ön yazı */}
          <div>
            <label htmlFor="qr-msg" className="pulse-eyebrow text-[#737373] block">
              {isTr ? 'ÖN YAZI' : 'HEADLINE'}
            </label>
            <input
              id="qr-msg"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={defaultMessage}
              maxLength={48}
              className="mt-1.5 w-full px-4 py-3.5 bg-white rounded-[10px] border border-[#E5E5E5] text-[14px] text-[#525252] placeholder:text-[#A3A3A3] outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>

          {/* Tasarım şablonu */}
          <div>
            <label className="pulse-eyebrow text-[#737373] block">
              {isTr ? 'TASARIM ŞABLONU' : 'DESIGN TEMPLATE'}
            </label>
            <div
              role="radiogroup"
              aria-label={isTr ? 'Tasarım şablonu' : 'Design template'}
              className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {(
                [
                  { k: 'beyaz', l: isTr ? 'Beyaz' : 'White' },
                  { k: 'lime', l: 'Lime' },
                  { k: 'koyu', l: isTr ? 'Koyu' : 'Dark' },
                  { k: 'minimal', l: 'Minimal' },
                ] as { k: TemplateKey; l: string }[]
              ).map((t) => {
                const active = template === t.k;
                return (
                  <button
                    key={t.k}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTemplate(t.k)}
                    className={`px-2 py-2.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                      active
                        ? 'border-2 border-[#0A0A0A]'
                        : 'border border-[#E5E5E5] hover:border-[#0A0A0A]'
                    }`}
                    style={{
                      background: t.k === 'lime' ? '#C6F24E' : t.k === 'koyu' ? '#0A0A0A' : t.k === 'minimal' ? '#FAFAFA' : '#FFFFFF',
                      color: t.k === 'koyu' ? '#FFFFFF' : '#0A0A0A',
                    }}
                  >
                    {t.l}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full inline-flex items-center justify-center gap-2 px-5 py-[14px] bg-[#0A0A0A] text-white rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
          >
            {isTr ? 'QR kodu oluştur' : 'Generate QR code'}
            <span aria-hidden>→</span>
          </button>
        </div>
      </form>

      {/* ─── 2. Preview ─── */}
      <div className="min-w-0 lg:order-2">
        <h2
          className="text-[22px] sm:text-[24px] font-semibold text-[#0A0A0A] tracking-[-0.015em] mb-5"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? '2. Önizle ve indir' : '2. Preview & download'}
        </h2>

        <figure
          className="mx-auto flex w-full max-w-[420px] flex-col items-center justify-between overflow-hidden rounded-[18px] text-center transition-colors sm:max-w-none"
          style={{
            background: palette.card,
            color: palette.fg,
            border: palette.border === 'transparent' ? '1px solid transparent' : `1px solid ${palette.border}`,
            aspectRatio: '3 / 4',
            padding: 'clamp(24px, 5vw, 40px)',
          }}
        >
          <div className="w-full min-w-0 shrink-0">
            <div
              className="truncate"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: palette.eyebrow,
                fontWeight: 600,
              }}
            >
              {(businessName || 'BUAZE').slice(0, 28)}
            </div>
            <div
              className="mt-2.5 break-words"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(22px, 4.4vw, 38px)',
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: palette.fg,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {message || defaultMessage}
            </div>
          </div>

          <div
            className="my-auto mx-auto max-w-full shrink-0 bg-white"
            style={{
              borderRadius: 14,
              padding: 'clamp(12px, 3vw, 16px)',
              boxShadow:
                template === 'koyu'
                  ? '0 8px 24px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)'
                  : '0 10px 26px -14px rgba(10,10,10,0.18), 0 0 0 1px rgba(10,10,10,0.04)',
            }}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{
                width: 'min(28vw, 110px)',
                height: 'min(28vw, 110px)',
                maxWidth: '100%',
              }}
              width={480}
              height={480}
              role="img"
              aria-label={
                isTr ? `"${submittedUrl}" adresi için QR kodu` : `QR code for "${submittedUrl}"`
              }
            />
          </div>

          <div
            className="truncate w-full shrink-0"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: palette.eyebrow,
              fontWeight: 600,
            }}
          >
            {isTr ? 'BUAZE · TARA ✦ PAYLAŞ' : 'BUAZE · SCAN ✦ SHARE'}
          </div>
        </figure>

        <p className="sr-only" aria-live="polite">
          {isGenerating ? (isTr ? 'Oluşturuluyor…' : 'Generating…') : submittedUrl}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-3.5 sm:grid-cols-2 sm:gap-2.5">
          <button
            type="button"
            onClick={handlePngDownload}
            className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-[18px] py-3 text-[13.5px] font-medium text-white transition-all duration-200 hover:bg-[#1A1A1A] active:scale-[0.98] sm:min-h-[44px] sm:text-[13px]"
          >
            <Download size={14} aria-hidden />
            {isTr ? 'PNG indir' : 'PNG download'}
          </button>
          <button
            type="button"
            onClick={handleDesignDownload}
            disabled={isDesignDownloading}
            className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border border-[#0A0A0A] bg-white px-[18px] py-3 text-[13.5px] font-medium text-[#0A0A0A] transition-all duration-200 hover:bg-[#FAFAFA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:text-[13px]"
          >
            <Download size={14} aria-hidden />
            {isDesignDownloading
              ? (isTr ? 'Hazırlanıyor…' : 'Preparing…')
              : (isTr ? 'Tasarım ile indir' : 'Download design')}
          </button>
        </div>
      </div>
    </div>
  );
}
