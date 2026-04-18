'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCodeLib from 'qrcode';
import {
  UtensilsCrossed,
  CalendarDays,
  Info,
  Download,
  Copy,
  Check,
  Smartphone,
  Palette,
  Link2,
  Star,
  MapPin,
  Clock,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface InteractiveQRShowcaseProps {
  locale: Locale;
}

type TargetKey = 'menu' | 'reservation' | 'info';
type ThemeKey = 'dark' | 'brand' | 'mono';

const THEMES: Record<
  ThemeKey,
  { dark: string; light: string; label_tr: string; label_en: string }
> = {
  dark: { dark: '#1f1e1d', light: '#FCFBF7', label_tr: 'Klasik', label_en: 'Classic' },
  brand: { dark: '#1f1e1d', light: '#FDBF1D', label_tr: 'Marka', label_en: 'Brand' },
  mono: { dark: '#0f172a', light: '#FFFFFF', label_tr: 'Mono', label_en: 'Mono' },
};

/**
 * Interactive live QR-code showcase.
 * Lets visitors toggle between three real-world use cases (menu, reservation,
 * info page) and three colour themes, and renders a live QR code on a
 * <canvas> element in real time. Fully keyboard-accessible, uses semantic
 * <figure>/<figcaption> markup, and injects JSON-LD so the widget is
 * discoverable by search engines.
 */
export default function InteractiveQRShowcase({ locale }: InteractiveQRShowcaseProps) {
  const isTr = locale === 'tr';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [target, setTarget] = useState<TargetKey>('menu');
  const [theme, setTheme] = useState<ThemeKey>('dark');
  const [copied, setCopied] = useState(false);
  const [scanCount, setScanCount] = useState(2847);

  const targets: Record<
    TargetKey,
    { url: string; title: string; subtitle: string; Icon: typeof UtensilsCrossed }
  > = {
    menu: {
      url: 'https://buaze.com/r/gourmet-eats/menu',
      title: isTr ? 'Dijital Menü' : 'Digital Menu',
      subtitle: isTr
        ? 'Müşteriler QR kodu tarar, menüyü telefonlarında görür'
        : 'Customers scan and view the menu on their phone',
      Icon: UtensilsCrossed,
    },
    reservation: {
      url: 'https://buaze.com/r/gourmet-eats/book',
      title: isTr ? 'Rezervasyon' : 'Reservation',
      subtitle: isTr
        ? 'Tek dokunuşla masa rezervasyonu alın'
        : 'Take table bookings with a single tap',
      Icon: CalendarDays,
    },
    info: {
      url: 'https://buaze.com/r/gourmet-eats',
      title: isTr ? 'Restoran Bilgileri' : 'Restaurant Info',
      subtitle: isTr
        ? 'Saatler, konum, telefon ve sosyal medya — hepsi tek yerde'
        : 'Hours, location, phone and socials — all in one place',
      Icon: Info,
    },
  };

  const currentTarget = targets[target];
  const currentTheme = THEMES[theme];

  // Render the QR to canvas every time target or theme changes.
  const renderQR = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      await QRCodeLib.toCanvas(canvasRef.current, currentTarget.url, {
        width: 260,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: currentTheme.dark,
          light: currentTheme.light,
        },
      });
    } catch {
      // Silent fail — canvas just stays empty; unlikely to happen for short URLs.
    }
  }, [currentTarget.url, currentTheme.dark, currentTheme.light]);

  useEffect(() => {
    renderQR();
  }, [renderQR]);

  // Tiny "live counter" flair — increments every few seconds while section is visible.
  useEffect(() => {
    const id = setInterval(() => {
      setScanCount((n) => n + Math.floor(Math.random() * 3));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentTarget.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked — no-op */
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `buaze-qr-${target}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // JSON-LD structured data for the widget so search engines understand it.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: isTr ? 'Buaze QR Kod Üretici' : 'Buaze QR Code Generator',
    description: isTr
      ? 'Restoranlar için dijital menü, rezervasyon ve bilgi sayfalarına bağlanan dinamik QR kodlar oluşturun.'
      : 'Generate dynamic QR codes for restaurant digital menus, reservations and info pages.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
    url: 'https://buaze.com',
  };

  return (
    <section
      id="qr-generator"
      aria-labelledby="qr-showcase-heading"
      className="relative py-20 sm:py-28 px-5 sm:px-8 bg-[#FCFBF7] overflow-hidden"
    >
      {/* Decorative dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #1f1e1d 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto">
        {/* Section header */}
        <header className="text-center mb-12 sm:mb-16 max-w-[720px] mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[3px_3px_0_0_#1f1e1d] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#1f1e1d]">
              {isTr ? 'Canlı Demo' : 'Live Demo'}
            </span>
          </div>
          <h2
            id="qr-showcase-heading"
            className="text-[30px] sm:text-[44px] font-extrabold tracking-[-0.03em] text-[#1f1e1d] text-balance leading-[1.1]"
          >
            {isTr ? (
              <>
                Kendi <span className="text-[#FDBF1D]">QR kodunuzu</span> şimdi tasarlayın
              </>
            ) : (
              <>
                Design your own <span className="text-[#FDBF1D]">QR code</span> now
              </>
            )}
          </h2>
          <p className="mt-4 text-[15px] sm:text-[17px] text-[#6b6760] font-medium leading-relaxed text-pretty">
            {isTr
              ? 'Menü, rezervasyon veya bilgi sayfası — hedefi seçin, renkleri değiştirin ve QR kodunuz anında güncellensin. Her tarama bir veriye dönüşür.'
              : 'Menu, reservation or info page — pick a destination, change the colors, and watch the QR update instantly. Every scan becomes data you can use.'}
          </p>
        </header>

        {/* Main interactive panel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
          {/* LEFT: Controls */}
          <div className="lg:col-span-2 space-y-5">
            {/* Destination toggle */}
            <fieldset className="bg-white rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] p-5">
              <legend className="px-2 -ml-2 text-[11px] font-black uppercase tracking-widest text-[#1f1e1d] flex items-center gap-2">
                <Link2 size={12} strokeWidth={3} />
                {isTr ? 'Hedef sayfa' : 'Destination'}
              </legend>
              <div className="mt-3 space-y-2">
                {(Object.keys(targets) as TargetKey[]).map((key) => {
                  const { Icon, title, subtitle } = targets[key];
                  const active = target === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTarget(key)}
                      aria-pressed={active}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border-[2px] text-left transition-all ${
                        active
                          ? 'bg-[#FDBF1D] border-[#1f1e1d] shadow-[3px_3px_0_0_#1f1e1d] -translate-y-[1px]'
                          : 'bg-[#FCFBF7] border-[#e8e4de] hover:border-[#1f1e1d] hover:-translate-y-[1px]'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg border-[2px] border-[#1f1e1d] flex items-center justify-center ${
                          active ? 'bg-[#1f1e1d] text-[#FDBF1D]' : 'bg-white text-[#1f1e1d]'
                        }`}
                      >
                        <Icon size={18} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-black text-[#1f1e1d] leading-tight">
                          {title}
                        </div>
                        <div className="text-[12px] text-[#6b6760] font-medium leading-snug mt-0.5">
                          {subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Theme toggle */}
            <fieldset className="bg-white rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] p-5">
              <legend className="px-2 -ml-2 text-[11px] font-black uppercase tracking-widest text-[#1f1e1d] flex items-center gap-2">
                <Palette size={12} strokeWidth={3} />
                {isTr ? 'Renk teması' : 'Color theme'}
              </legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                  const t = THEMES[key];
                  const active = theme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTheme(key)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-[2px] transition-all ${
                        active
                          ? 'border-[#1f1e1d] shadow-[3px_3px_0_0_#1f1e1d] -translate-y-[1px] bg-[#FDBF1D]'
                          : 'border-[#e8e4de] hover:border-[#1f1e1d] bg-[#FCFBF7]'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-md border-[2px] border-[#1f1e1d] flex items-center justify-center"
                        style={{ backgroundColor: t.light }}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-sm"
                          style={{ backgroundColor: t.dark }}
                        />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1f1e1d]">
                        {isTr ? t.label_tr : t.label_en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* URL + actions */}
            <div className="bg-[#1f1e1d] rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#FDBF1D] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FDBF1D]">
                  {isTr ? 'QR kod bağlantısı' : 'QR destination URL'}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-black text-white/60">
                  <Smartphone size={10} strokeWidth={3} />
                  {scanCount.toLocaleString()} {isTr ? 'tarama' : 'scans'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 px-3 py-2.5">
                <code className="flex-1 text-[12px] text-white font-mono truncate">
                  {currentTarget.url}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
                  className="flex-shrink-0 w-8 h-8 rounded-md border-[2px] border-[#FDBF1D] bg-[#FDBF1D] text-[#1f1e1d] flex items-center justify-center hover:bg-white hover:border-white transition-colors"
                >
                  {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-[#FDBF1D] text-[#1f1e1d] font-black text-[13px] py-3 rounded-xl border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#000] hover:-translate-y-[2px] hover:shadow-[0_6px_0_0_#000] active:translate-y-[4px] active:shadow-none transition-all uppercase tracking-wider"
              >
                <Download size={14} strokeWidth={3} />
                {isTr ? 'PNG olarak indir' : 'Download PNG'}
              </button>
            </div>
          </div>

          {/* RIGHT: Live preview */}
          <figure className="lg:col-span-3">
            <div className="relative bg-white rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center justify-between px-5 py-3 border-b-[2px] border-[#1f1e1d] bg-[#FCFBF7]">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FDBF1D]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                </div>
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#ada89f] truncate">
                  buaze.com / qr-builder
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-black text-[#16A34A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  LIVE
                </div>
              </div>

              {/* Preview body */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
                {/* QR canvas */}
                <div className="md:col-span-2 bg-[#FCFBF7] p-6 sm:p-8 flex flex-col items-center justify-center border-b-[2px] md:border-b-0 md:border-r-[2px] border-[#1f1e1d]">
                  <div
                    className="rounded-xl border-[2.5px] border-[#1f1e1d] shadow-[4px_4px_0_0_#1f1e1d] p-3"
                    style={{ backgroundColor: currentTheme.light }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={260}
                      height={260}
                      role="img"
                      aria-label={
                        isTr
                          ? `${currentTarget.title} için QR kod. ${currentTarget.url} adresine yönlendirir.`
                          : `QR code for ${currentTarget.title}. Scans open ${currentTarget.url}.`
                      }
                      className="block w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]"
                    />
                  </div>
                  <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-[#1f1e1d] text-center">
                    Gourmet Eats · #{target.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-[#6b6760] font-medium text-center mt-0.5">
                    {isTr ? 'Telefonla tarayın' : 'Scan with your phone'}
                  </p>
                </div>

                {/* Contextual preview card */}
                <div className="md:col-span-3 p-5 sm:p-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <currentTarget.Icon size={14} className="text-[#FDBF1D]" strokeWidth={3} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#1f1e1d]">
                      {currentTarget.title}
                    </span>
                  </div>

                  {target === 'menu' && <MenuPreview isTr={isTr} />}
                  {target === 'reservation' && <ReservationPreview isTr={isTr} />}
                  {target === 'info' && <InfoPreview isTr={isTr} />}
                </div>
              </div>
            </div>
            <figcaption className="sr-only">
              {isTr
                ? `Buaze QR kod oluşturucu canlı önizleme: ${currentTarget.title}`
                : `Buaze QR code generator live preview: ${currentTarget.title}`}
            </figcaption>
          </figure>
        </div>
      </div>

      {/* SEO: structured data for the widget */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}

/* ─── Contextual preview sub-components ─── */

function MenuPreview({ isTr }: { isTr: boolean }) {
  const items = [
    { name: isTr ? 'Klasik Burger' : 'Classic Burger', price: '₺185', dot: '#FDBF1D' },
    { name: isTr ? 'Trüflü Makarna' : 'Truffle Pasta', price: '₺240', dot: '#ea580c' },
    { name: isTr ? 'Akdeniz Salatası' : 'Mediterranean Salad', price: '₺120', dot: '#16A34A' },
    { name: isTr ? 'Tatlı Tabağı' : 'Dessert Platter', price: '₺95', dot: '#1f1e1d' },
  ];
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li
          key={it.name}
          className="flex items-center justify-between gap-3 bg-[#FCFBF7] rounded-lg border-[2px] border-[#1f1e1d] px-3 py-2.5 shadow-[2px_2px_0_0_#1f1e1d]"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex-shrink-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: it.dot }}
            />
            <span className="text-[13px] font-bold text-[#1f1e1d] truncate">{it.name}</span>
          </span>
          <span className="text-[13px] font-black text-[#1f1e1d]">{it.price}</span>
        </li>
      ))}
    </ul>
  );
}

function ReservationPreview({ isTr }: { isTr: boolean }) {
  const times = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className="block text-[10px] font-black uppercase tracking-wider text-[#6b6760] mb-1">
            {isTr ? 'Tarih' : 'Date'}
          </span>
          <div className="bg-[#FCFBF7] border-[2px] border-[#1f1e1d] rounded-lg px-3 py-2 text-[13px] font-bold text-[#1f1e1d] shadow-[2px_2px_0_0_#1f1e1d]">
            {isTr ? 'Bugün' : 'Today'}
          </div>
        </label>
        <label className="block">
          <span className="block text-[10px] font-black uppercase tracking-wider text-[#6b6760] mb-1">
            {isTr ? 'Kişi sayısı' : 'Party size'}
          </span>
          <div className="bg-[#FCFBF7] border-[2px] border-[#1f1e1d] rounded-lg px-3 py-2 text-[13px] font-bold text-[#1f1e1d] shadow-[2px_2px_0_0_#1f1e1d]">
            {isTr ? '4 kişi' : '4 guests'}
          </div>
        </label>
      </div>
      <div>
        <span className="block text-[10px] font-black uppercase tracking-wider text-[#6b6760] mb-1.5">
          {isTr ? 'Saat seçin' : 'Pick a time'}
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {times.map((t, i) => (
            <div
              key={t}
              className={`text-center py-1.5 rounded-md border-[2px] border-[#1f1e1d] text-[12px] font-black ${
                i === 2
                  ? 'bg-[#FDBF1D] text-[#1f1e1d] shadow-[2px_2px_0_0_#1f1e1d]'
                  : 'bg-[#FCFBF7] text-[#1f1e1d]'
              }`}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#1f1e1d] text-[#FDBF1D] text-center rounded-lg border-[2px] border-[#1f1e1d] py-2.5 text-[12px] font-black uppercase tracking-wider">
        {isTr ? 'Masayı Rezerve Et' : 'Reserve Table'}
      </div>
    </div>
  );
}

function InfoPreview({ isTr }: { isTr: boolean }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5 bg-[#FCFBF7] rounded-lg border-[2px] border-[#1f1e1d] px-3 py-2.5 shadow-[2px_2px_0_0_#1f1e1d]">
        <MapPin size={14} className="text-[#ea580c] flex-shrink-0" strokeWidth={2.5} />
        <span className="text-[12px] font-bold text-[#1f1e1d] truncate">
          {isTr ? 'Ataşehir, İstanbul' : 'Atasehir, Istanbul'}
        </span>
      </div>
      <div className="flex items-center gap-2.5 bg-[#FCFBF7] rounded-lg border-[2px] border-[#1f1e1d] px-3 py-2.5 shadow-[2px_2px_0_0_#1f1e1d]">
        <Clock size={14} className="text-[#16A34A] flex-shrink-0" strokeWidth={2.5} />
        <span className="text-[12px] font-bold text-[#1f1e1d] truncate">
          {isTr ? 'Her gün 11:00 – 23:00' : 'Daily 11am – 11pm'}
        </span>
      </div>
      <div className="flex items-center gap-2.5 bg-[#FCFBF7] rounded-lg border-[2px] border-[#1f1e1d] px-3 py-2.5 shadow-[2px_2px_0_0_#1f1e1d]">
        <Star size={14} className="text-[#FDBF1D] flex-shrink-0" strokeWidth={0} fill="#FDBF1D" />
        <span className="text-[12px] font-bold text-[#1f1e1d]">
          4.9 · 142 {isTr ? 'yorum' : 'reviews'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {(isTr
          ? ['Instagram', 'Ara', 'Yol tarifi']
          : ['Instagram', 'Call', 'Directions']
        ).map((lbl, i) => (
          <div
            key={lbl}
            className={`text-center py-2 rounded-md border-[2px] border-[#1f1e1d] text-[11px] font-black uppercase tracking-wider ${
              i === 0
                ? 'bg-[#FDBF1D] text-[#1f1e1d] shadow-[2px_2px_0_0_#1f1e1d]'
                : 'bg-[#FCFBF7] text-[#1f1e1d]'
            }`}
          >
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}
