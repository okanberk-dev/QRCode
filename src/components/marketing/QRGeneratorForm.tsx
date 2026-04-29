'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
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

const DEFAULT_URL = 'https://buaze.com';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );

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
    const hostname = (() => {
      try {
        return new URL(submittedUrl).hostname.replace(/^www\./, '');
      } catch {
        return 'qr';
      }
    })();
    link.download = `qr-${hostname}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePdfDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const palette = TEMPLATES[template];
    const safeBiz = escapeHtml((businessName || 'BUAZE').toUpperCase().slice(0, 60));
    const safeMsg = escapeHtml(message || defaultMessage);
    const safeFooter = isTr ? 'BUAZE · TARA &#10022; PAYLAŞ' : 'BUAZE · SCAN &#10022; SHARE';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html lang="${isTr ? 'tr' : 'en'}">
<head>
<meta charset="utf-8" />
<title>${safeBiz} QR</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
  .card { background: ${palette.card}; color: ${palette.fg}; border: 1px solid ${palette.border === 'transparent' ? palette.card : palette.border}; padding: 56px 40px; border-radius: 24px; width: 100%; max-width: 520px; aspect-ratio: 3 / 4; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; }
  .eyebrow { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.2em; color: ${palette.eyebrow}; }
  h1 { font-size: 38px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.02; margin: 12px 0 0; white-space: pre-line; }
  .qr-wrap { background: #fff; border-radius: 18px; padding: 18px; box-shadow: 0 1px 0 rgba(10,10,10,0.05); }
  .qr-wrap img { display: block; width: 200px; height: 200px; }
  .footer { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: 0.18em; color: ${palette.eyebrow}; }
  @media print {
    body { background: #fff; padding: 0; }
    .card { box-shadow: none; }
    @page { size: A5 portrait; margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="card">
    <div>
      <div class="eyebrow">${safeBiz}</div>
      <h1>${safeMsg}</h1>
    </div>
    <div class="qr-wrap"><img src="${dataUrl}" alt="QR" /></div>
    <div class="footer">${safeFooter}</div>
  </div>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const palette = TEMPLATES[template];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
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

      {/* ─── 2. Preview (design 1:1: site-more.jsx:53-86) ─── */}
      <div className="lg:order-2">
        <h2
          className="text-[22px] sm:text-[24px] font-semibold text-[#0A0A0A] tracking-[-0.015em] mb-5"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? '2. Önizle ve indir' : '2. Preview & download'}
        </h2>

        <figure
          className="rounded-[18px] flex flex-col items-center justify-between text-center transition-colors w-full"
          style={{
            background: palette.card,
            color: palette.fg,
            border: palette.border === 'transparent' ? '1px solid transparent' : `1px solid ${palette.border}`,
            aspectRatio: '3 / 4',
            padding: 'clamp(24px, 5vw, 40px)',
          }}
        >
          <div className="w-full min-w-0">
            <div
              className="truncate"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: palette.eyebrow,
                opacity: 1,
              }}
            >
              {(businessName || 'BUAZE').slice(0, 28)}
            </div>
            <div
              className="mt-2.5 break-words"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(24px, 4.4vw, 38px)',
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
            className="bg-white shrink-0"
            style={{ borderRadius: 16, padding: 16 }}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{
                width: 'clamp(128px, 22vw, 160px)',
                height: 'clamp(128px, 22vw, 160px)',
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
            className="truncate w-full"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: palette.eyebrow,
            }}
          >
            {isTr ? 'BUAZE · TARA ✦ PAYLAŞ' : 'BUAZE · SCAN ✦ SHARE'}
          </div>
        </figure>

        <p className="sr-only" aria-live="polite">
          {isGenerating ? (isTr ? 'Oluşturuluyor…' : 'Generating…') : submittedUrl}
        </p>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handlePngDownload}
            className="inline-flex items-center justify-center gap-1.5 bg-[#0A0A0A] text-white text-[13px] font-medium px-[18px] py-3 rounded-full hover:bg-[#1A1A1A] transition-colors"
          >
            <Download size={13} aria-hidden />
            {isTr ? 'PNG indir' : 'PNG download'}
          </button>
          <button
            type="button"
            onClick={handlePdfDownload}
            className="inline-flex items-center justify-center gap-1.5 bg-white text-[#0A0A0A] text-[13px] font-medium px-[18px] py-3 rounded-full border border-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors"
          >
            {isTr ? 'PDF olarak' : 'As PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
