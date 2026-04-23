'use client';

import { Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type HelpPlatform = 'google' | 'yemeksepeti' | 'getir' | 'trendyol';

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
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#C9D0DB] transition-colors"
      >
        <Info size={12} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-72 rounded-2xl border border-[#EDEDED] bg-white p-4 text-[12px] font-medium text-[#0A0A0A] shadow-xl">
          <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-[#EDEDED]">
            <p className="text-[12px] font-black uppercase tracking-wider text-[#0A0A0A]">{guide.title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#6B7280] hover:text-[#0A0A0A]"
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
            <p className="mt-2 text-[11px] text-[#6B7280] leading-relaxed">{guide.hint}</p>
          )}
        </div>
      )}
    </span>
  );
}
