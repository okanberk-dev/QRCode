'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import {
  Link2,
  Download,
  Copy,
  Check,
  AlertCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface QRGeneratorFormProps {
  locale: Locale;
}

const DEFAULT_URL = 'https://buaze.com';

/**
 * Client-side URL-to-QR-code generator.
 * Accepts any valid URL and renders a high-resolution QR code the user can
 * download as PNG or share. No other options (colour, target, etc.) — keeps
 * the interface simple and focused, matching the product page brief.
 */
export default function QRGeneratorForm({ locale }: QRGeneratorFormProps) {
  const isTr = locale === 'tr';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string>(DEFAULT_URL);
  const [submittedUrl, setSubmittedUrl] = useState<string>(DEFAULT_URL);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  /** Validate a URL using the platform's URL constructor — returns the
   * normalized URL string or throws. */
  const normalizeUrl = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('empty');
    // Add a protocol if the user omits one — common UX shortcut.
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    // This throws if the URL is malformed.
    const u = new URL(candidate);
    // Block non-http(s) schemes as a basic safety measure.
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('scheme');
    return u.toString();
  }, []);

  /** Render the QR code whenever the submitted URL changes. */
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
      }
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(submittedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail silently — copying is a nice-to-have.
    }
  };

  const handleDownload = () => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
      {/* ─── Form side ─── */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-3 space-y-6"
        aria-label={isTr ? 'QR kod oluşturma formu' : 'QR code generator form'}
      >
        <div className="space-y-2">
          <label
            htmlFor="qr-url"
            className="text-[13px] font-black uppercase tracking-[0.12em] text-[#0A0A0A] flex items-center gap-2"
          >
            <Link2 size={14} />
            {isTr ? 'Web sitesi adresi' : 'Website URL'}
          </label>
          <div className="relative">
            <input
              id="qr-url"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="url"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://example.com/menu"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'qr-url-error' : 'qr-url-hint'}
              className="w-full px-5 py-4 text-[15px] sm:text-[16px] bg-white border border-[#0A0A0A] rounded-xl shadow-md focus:outline-none focus:shadow-md focus:translate-x-[2px] focus:translate-y-[2px] transition-all placeholder:text-[#6B7280] text-[#0A0A0A] font-medium"
            />
          </div>
          {error ? (
            <p
              id="qr-url-error"
              role="alert"
              className="text-[13px] font-bold text-[#dc2626] flex items-center gap-1.5"
            >
              <AlertCircle size={14} />
              {error}
            </p>
          ) : (
            <p id="qr-url-hint" className="text-[12px] text-[#1A1A1A] font-medium">
              {isTr
                ? 'Menü, rezervasyon veya bilgi sayfası gibi herhangi bir genel bağlantıyı yapıştırın.'
                : 'Paste any public link — a menu, reservation page, or info page.'}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] font-extrabold text-[15px] px-7 py-4 rounded-xl border border-[#0A0A0A] shadow-md hover:-translate-y-0.5 hover:shadow-md active:translate-x-[5px] active:translate-y-[6px] active:shadow-none transition-all"
        >
          <Sparkles size={18} />
          {isTr ? 'QR Kodu Oluştur' : 'Generate QR Code'}
        </button>

        {/* Helper list */}
        <ul className="pt-4 space-y-2.5 border-t-[2px] border-dashed border-[#EDEDED]">
          {[
            isTr ? 'Yalnızca bu URL için benzersiz QR' : 'A QR dedicated to this URL only',
            isTr ? 'Yüksek çözünürlüklü PNG indirme' : 'High-resolution PNG download',
            isTr ? 'Süresiz çalışır — ücret yoktur' : 'Works forever — no fees',
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[13px] sm:text-[14px] font-medium text-[#0A0A0A]"
            >
              <Check size={16} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </form>

      {/* ─── Preview side ─── */}
      <figure
        className="lg:col-span-2 bg-white border border-[#0A0A0A] rounded-2xl shadow-md p-5 sm:p-7 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 bg-[#FFFFFF] border border-[#0A0A0A] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
            <QrCode size={12} />
            {isTr ? 'CANLI ÖNİZLEME' : 'LIVE PREVIEW'}
          </div>
          {isGenerating && (
            <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider">
              {isTr ? 'OLUŞTURULUYOR...' : 'GENERATING...'}
            </span>
          )}
        </div>

        <div className="relative bg-[#FFFFFF] border border-[#0A0A0A] rounded-xl p-4 aspect-square flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full max-w-[360px] max-h-[360px]"
            role="img"
            aria-label={
              isTr
                ? `"${submittedUrl}" adresi için QR kodu`
                : `QR code for "${submittedUrl}"`
            }
          />
        </div>

        <figcaption className="text-center text-[12px] font-medium text-[#1A1A1A] break-all px-2">
          {submittedUrl}
        </figcaption>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-1.5 bg-[#0A0A0A] text-white font-extrabold text-[13px] px-4 py-3 rounded-lg border border-[#0A0A0A] shadow-md hover:-translate-y-0.5 hover:shadow-md active:translate-x-[3px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            <Download size={14} />
            PNG
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 bg-white text-[#0A0A0A] font-extrabold text-[13px] px-4 py-3 rounded-lg border border-[#0A0A0A] shadow-md hover:-translate-y-0.5 hover:shadow-md active:translate-x-[3px] active:translate-y-[4px] active:shadow-none transition-all"
            aria-label={isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Kopyala' : 'Copy')}
          </button>
        </div>
      </figure>
    </div>
  );
}
