'use client';

import { Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type HelpPlatform =
  | 'google'
  | 'yemeksepeti'
  | 'getir'
  | 'trendyol'
  | 'tripadvisor'
  | 'airbnb'
  | 'booking'
  | 'yandex';

const GUIDE: Record<HelpPlatform, { title: string; steps: string[]; hint?: string }> = {
  google: {
    title: 'Google Harita Linki / Place ID',
    steps: [
      'Google Haritalar\'da işletmenizi açın.',
      'Sağ üstte "Paylaş" → "Kısa URL Kopyala"yı seçin.',
      'Linki bu alana yapıştırın (veya Place ID\'yi — ChIJ... ile başlar).',
    ],
    hint: '4+ yıldız verenler otomatik olarak bu linke yönlendirilir.',
  },
  yemeksepeti: {
    title: 'Yemeksepeti Restoran Linki',
    steps: [
      'yemeksepeti.com\'da restoranınızın sayfasını açın.',
      'Tarayıcının adres çubuğundaki tam URL\'yi kopyalayın.',
      'Bu alana yapıştırın. URL "https://www.yemeksepeti.com/..." ile başlamalı.',
    ],
  },
  getir: {
    title: 'Getir Yemek Restoran Linki',
    steps: [
      'Getir uygulamasında restoranınızı açın → "Paylaş" → "Linki Kopyala".',
      'Ya da getir.com/yemek üzerinden restoran sayfasının URL\'sini kopyalayın.',
      'Bu alana yapıştırın.',
    ],
  },
  trendyol: {
    title: 'Trendyol GO Restoran Linki',
    steps: [
      'Trendyol GO uygulamasında restoranınızı bulun.',
      'Restoran detay sayfasını açın → paylaş → linki kopyalayın.',
      'trendyol.com/... ile başlayan URL\'yi buraya yapıştırın.',
    ],
  },
  tripadvisor: {
    title: 'Tripadvisor İşletme Linki',
    steps: [
      'tripadvisor.com (veya .com.tr) üzerinde işletmenizi açın.',
      'Tarayıcının adres çubuğundaki tam URL\'yi kopyalayın.',
      'Bu alana yapıştırın. URL "tripadvisor.com/..." ile başlamalı.',
    ],
    hint: 'Otel ve konaklama segmentinde 4+ yıldız verenler buraya yönlendirilebilir.',
  },
  airbnb: {
    title: 'Airbnb İlan Linki',
    steps: [
      'airbnb.com\'da ilanınızı (veya konaklama mekânınızı) açın.',
      'Tarayıcının adres çubuğundaki tam URL\'yi kopyalayın.',
      'Bu alana yapıştırın. URL "airbnb.com/rooms/..." veya "airbnb.com.tr/..." ile başlamalı.',
    ],
    hint: 'Sadece konaklama segmenti için. Yorumlar Airbnb hesabınız üzerinden bırakılır.',
  },
  booking: {
    title: 'Booking.com Otel Linki',
    steps: [
      'booking.com\'da otelinizin sayfasını açın.',
      'Tarayıcının adres çubuğundaki tam URL\'yi kopyalayın.',
      'Bu alana yapıştırın. URL "booking.com/hotel/..." ile başlamalı.',
    ],
    hint: 'Otel / konaklama segmenti için. 4+ yıldız verenler buraya yönlendirilebilir.',
  },
  yandex: {
    title: 'Yandex Haritalar İşletme Linki',
    steps: [
      'yandex.com.tr/maps üzerinde işletmenizi açın.',
      'Adres çubuğundaki tam URL\'yi kopyalayın (yandex.com.tr/maps/org/...).',
      'Bu alana yapıştırın. yandex.com / yandex.com.tr / yandex.ru hostlarını kabul ederiz.',
    ],
    hint: 'TR pazarında Google\'a alternatif harita + review surface.',
  },
};

interface Props {
  platform: HelpPlatform;
}

export default function PlatformUrlHelp({ platform }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const guide = GUIDE[platform];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${guide.title} nasıl kopyalanır?`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-pn-line bg-white text-[#6B7280] hover:text-pn-ink hover:border-[#C9D0DB] transition-colors"
      >
        <Info size={12} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-72 rounded-[24px] border border-pn-line bg-white p-4 text-[12px] font-medium text-pn-ink shadow-xl">
          <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-pn-line">
            {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily → bz-h-tight (Pulse §11). */}
            <p className="bz-h-tight text-[13px] font-medium text-pn-ink tracking-[-0.01em]">
              {guide.title}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#6B7280] hover:text-pn-ink"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-[12px]">
            {guide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {guide.hint && (
            <p className="mt-2 text-[12px] text-[#6B7280] leading-relaxed">{guide.hint}</p>
          )}
        </div>
      )}
    </span>
  );
}
