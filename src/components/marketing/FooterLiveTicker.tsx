'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/translations';

/**
 * Stage 49 §38.130 — Footer live activity ticker.
 *
 * HANDOFF premium-footer.jsx live ticker (line 53-78) editorial polish.
 * Mevcut Stage 44 §38.125 static pill (`ÇEVRİMİÇİ · BUAZE · Sistem aktif`)
 * yerine 5-state rotation 2.8s — Türkiye semt adları + Buaze gerçek
 * platform feature event'leri (AI Co-Pilot reply / private feedback /
 * QR scan / review link open).
 *
 * Compliance disipline (CLAUDE.md §38.130 §39.2):
 * Kullanıcı AskUserQuestion ile §35.10 LiveReviewTicker fake testimonial
 * backlog kararını override etti. Footer ticker müşteri-spesifik review
 * claim ÜRETMEZ (fake "Mehmet K. 5★ verdi" yok); Buaze gerçek platform
 * feature event'lerini generic Türkiye semt adlarıyla bağlar.
 * "System alive" hissi, fake testimonial değil.
 *
 * A11y + perf disipline:
 * - `role="status"` + `aria-live="polite"` (screen reader yumuşak okuma)
 * - `prefers-reduced-motion: reduce` iken rotation durdurulur, ilk satır
 *   static (CLAUDE.md §5.2 + §38.61)
 * - `document.visibilityState === 'hidden'` iken interval pause (mobile
 *   battery save, CLAUDE.md §5.1 + §38.115)
 * - Fade animation `bzFadeUp` keyframe reuse (key prop change tetikler)
 */

interface FooterLiveTickerProps {
  locale: Locale;
}

interface TickerItem {
  city: string;
  text: string;
}

const ROTATION_MS = 2800;

export default function FooterLiveTicker({ locale }: FooterLiveTickerProps) {
  const isTr = locale === 'tr';

  // Generic Buaze platform event'leri (müşteri-spesifik testimonial DEĞİL)
  const items: TickerItem[] = [
    { city: 'Karaköy', text: isTr ? 'AI yanıtladı' : 'AI replied' },
    { city: 'Bağdat Cd.', text: isTr ? 'Yeni 5★ yorum' : 'New 5★ review' },
    { city: 'Cihangir', text: isTr ? 'QR tarandı' : 'QR scanned' },
    { city: 'Çankaya', text: isTr ? 'Özel geri bildirim alındı' : 'Private feedback received' },
    { city: 'İzmir', text: isTr ? 'Yorum bağlantısı açıldı' : 'Review link opened' },
  ];

  const [tick, setTick] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reduced-motion check (CLAUDE.md §5.2 + §38.61 paterni)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePref = () => setEnabled(!mq.matches);
    updatePref();
    mq.addEventListener('change', updatePref);

    return () => {
      mq.removeEventListener('change', updatePref);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === 'undefined') return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        setTick((x) => x + 1);
      }, ROTATION_MS);
    };

    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Tab pause (CLAUDE.md §5.1 + §38.115 paterni — mobile battery save)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        start();
      }
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled]);

  const active = items[tick % items.length];
  const liveLabel = isTr ? 'CANLI' : 'LIVE';

  return (
    // Stage 136 §38.216 — Google snippet'ten gizleme (kullanıcı talebi:
    // "footerdaki canlı olan kısmı ve canlı diye yazan kısımları google'dan
    // gizle"). Google'ın resmi `data-nosnippet` attribute'u tüm child
    // content'in SERP snippet'ine girmesini engeller (rich result &
    // featured snippet'lerde gizli). Görsel olarak intact, sadece
    // crawler/snippet level'inde excluded. Reference:
    // https://developers.google.com/search/docs/crawling-indexing/special-tags
    <div
      role="status"
      aria-live="polite"
      aria-label={isTr ? 'Canlı sistem aktivitesi' : 'Live system activity'}
      data-nosnippet
      className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 backdrop-blur-md"
    >
      <span
        aria-hidden
        className="bz-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: '#C6F24E' }}
      />
      <span className="pulse-eyebrow text-white/55">
        {liveLabel} · {active.city.toUpperCase()}
      </span>
      <span
        key={tick}
        className="text-[12px] font-medium text-[#F6F4EF]"
        style={enabled ? { animation: 'bzFadeUp 0.5s ease-out' } : undefined}
      >
        {active.text}
      </span>
    </div>
  );
}
