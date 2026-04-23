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

export default function QRGeneratorForm({ locale }: QRGeneratorFormProps) {
  const isTr = locale === 'tr';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string>(DEFAULT_URL);
  const [submittedUrl, setSubmittedUrl] = useState<string>(DEFAULT_URL);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      // Copying is a nice-to-have; ignore permission errors.
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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 items-start">
      {/* ─── Form side ─── */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-3 space-y-6 order-2 lg:order-1"
        aria-label={isTr ? 'QR kod oluşturma formu' : 'QR code generator form'}
      >
        <div className="space-y-2.5">
          <label
            htmlFor="qr-url"
            className="pulse-eyebrow text-[#737373] flex items-center gap-1.5"
          >
            <Link2 size={12} aria-hidden className="text-[#0A0A0A]" />
            {isTr ? 'Web sitesi adresi' : 'Website URL'}
          </label>
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
            className={`w-full px-4 sm:px-5 py-3.5 sm:py-4 text-[15px] sm:text-[16px] bg-white rounded-2xl border text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:outline-none transition-colors ${
              error
                ? 'border-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#EDEDED] focus:border-[#0A0A0A]'
            }`}
          />
          {error ? (
            <p
              id="qr-url-error"
              role="alert"
              className="text-[13px] text-[#DC2626] flex items-center gap-1.5"
            >
              <AlertCircle size={14} aria-hidden />
              {error}
            </p>
          ) : (
            <p id="qr-url-hint" className="text-[12px] sm:text-[13px] text-[#737373]">
              {isTr
                ? 'Menü, rezervasyon veya bilgi sayfası gibi herhangi bir genel bağlantıyı yapıştırın.'
                : 'Paste any public link — a menu, reservation page, or info page.'}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] font-medium text-[14px] sm:text-[15px] px-6 py-3.5 sm:py-4 rounded-full hover:bg-[#A8D62E] transition-colors"
        >
          <Sparkles size={16} aria-hidden />
          {isTr ? 'QR Kodu Oluştur' : 'Generate QR Code'}
        </button>

        {/* Helper list */}
        <ul className="pt-5 space-y-2.5 border-t border-[#EDEDED]">
          {[
            isTr ? 'Yalnızca bu URL için benzersiz QR' : 'A QR dedicated to this URL only',
            isTr ? 'Yüksek çözünürlüklü PNG indirme' : 'High-resolution PNG download',
            isTr ? 'Süresiz çalışır — ücret yoktur' : 'Works forever — no fees',
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-[13px] sm:text-[14px] text-[#525252]"
            >
              <span className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
                <Check size={10} strokeWidth={3} aria-hidden />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </form>

      {/* ─── Preview side ─── */}
      <figure
        className="lg:col-span-2 bg-white border border-[#EDEDED] rounded-2xl shadow-[0_8px_24px_rgba(10,10,10,0.04)] p-5 sm:p-6 space-y-4 order-1 lg:order-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 bg-[#EAF9B8] border border-[#C6F24E] rounded-full px-2.5 py-1">
            <QrCode size={11} aria-hidden className="text-[#0A0A0A]" />
            <span className="pulse-eyebrow text-[#0A0A0A] text-[10px]">
              {isTr ? 'Canlı önizleme' : 'Live preview'}
            </span>
          </div>
          <span
            aria-live="polite"
            className={`pulse-eyebrow text-[10px] transition-opacity ${
              isGenerating ? 'opacity-100 text-[#737373]' : 'opacity-0'
            }`}
          >
            {isTr ? 'Oluşturuluyor…' : 'Generating…'}
          </span>
        </div>

        <div className="relative bg-white border border-[#EDEDED] rounded-2xl p-3 sm:p-4 aspect-square flex items-center justify-center">
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

        <figcaption
          className="text-center font-mono text-[11px] sm:text-[12px] text-[#737373] break-all px-1 leading-relaxed"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {submittedUrl}
        </figcaption>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-1.5 bg-[#0A0A0A] text-white font-medium text-[13px] px-3 py-3 rounded-full hover:bg-[#1A1A1A] transition-colors"
          >
            <Download size={13} aria-hidden />
            PNG
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 bg-white text-[#0A0A0A] font-medium text-[13px] px-3 py-3 rounded-full border border-[#EDEDED] hover:border-[#0A0A0A] transition-colors"
            aria-label={isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
          >
            {copied ? (
              <Check size={13} aria-hidden className="text-[#A8D62E]" />
            ) : (
              <Copy size={13} aria-hidden />
            )}
            <span className="truncate">
              {copied ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Kopyala' : 'Copy')}
            </span>
          </button>
        </div>
      </figure>
    </div>
  );
}
