'use client';

/**
 * LiveTicker — Stage 66 §38.147 PR0 base + Stage 88 §38.168 rollback.
 *
 * 3-stack canlı yorum/aktivite akışı (rotation tabanlı). Marketing
 * surface'inde sosyal kanıt için kullanılır.
 *
 * Pulse §11 disipline + COMPLIANCE (CRITICAL):
 * - Müşteri-spesifik testimonial claim ÜRETMEZ (CLAUDE.md §35.10).
 *   Default items generic platform feature event'leri (city + action,
 *   örn. "Karaköy · Yeni 5★ yorum geldi") — fake "Mehmet K. 5★ verdi"
 *   YASAK. CLAUDE.md §38.131 FooterLiveTicker paterni paralel.
 * - Caller `items` prop'u ile gerçek backend data (örn. /api/feedback
 *   workspace-aggregate) geçirebilir. PR0 base: default generic.
 *
 * Performans:
 * - max 3 visible item (eskileri unmount, memory leak yok).
 * - setInterval framer-motion AnimatePresence ile orchestrate.
 * - Tab gizli (Page Visibility) iken interval pause.
 * - Reduced-motion: rotation off, sadece ilk 3 item static.
 *
 * Original: site-library.jsx 4.LiveTicker. Konversiyon: hardcoded fake
 * testimonial → prop-driven items + generic compliance default;
 * setInterval + manual stack → AnimatePresence variants.
 *
 * Stage 88 §38.168 — rollback to PR0 base (kullanıcı kararı).
 * Önceki §38.165 premium editorial card paterni (italic quote mark
 * decoration + graphite avatar + footer attribution) sade Stage 66
 * paterniyle değiştirildi:
 * - Compact container (`h-[220px] max-w-[320px]`).
 * - Lime-soft avatar (önceki graphite reverse).
 * - Plain typography (italic source name kaldırıldı).
 * - No decorative quote mark.
 * - No platform attribution footer (`item.platform` field opsiyonel
 *   kalır backward-compat ama varsayılan render etmiyor — caller
 *   isterse gelecekte yeni LiveTicker variant ile expose edilebilir).
 * - Stack y stagger 18, scale 0.05, transition 0.6s.
 */

import { Star } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface LiveTickerItem {
  /** Item kimliği (key olarak). */
  id: string;
  /**
   * Avatar initials (2 char). Müşteri ismi DEĞİL — generic kategori
   * etiketi (örn. 'KK' Karaköy, 'BG' Bağdat, 'AT' Atölye).
   */
  initials: string;
  /**
   * Konum/başlık (city name veya kategori). Müşteri ismi DEĞİL
   * (compliance — CLAUDE.md §35.10).
   */
  source: string;
  /** Star count (0-5). Generic event puanı. */
  stars: number;
  /** Action text (TR + EN locale-aware). */
  text: { tr: string; en: string };
  /**
   * Platform attribution (Stage 85 §38.165'te eklendi, Stage 88 §38.168
   * rollback'te varsayılan render'dan çıkarıldı). Backward-compat için
   * tip intact — gelecekteki bir LiveTicker variant'ı bu field'ı reuse
   * edebilir.
   */
  platform?: string;
}

const DEFAULT_GENERIC_ITEMS: LiveTickerItem[] = [
  {
    id: 'karakoy-1',
    initials: 'KK',
    source: 'Karaköy',
    stars: 5,
    text: { tr: 'Yeni 5★ yorum panelde.', en: 'New 5★ review in panel.' },
  },
  {
    id: 'bagdat-1',
    initials: 'BC',
    source: 'Bağdat Cd.',
    stars: 5,
    text: { tr: 'AI yanıt taslağı hazırlandı.', en: 'AI reply draft ready.' },
  },
  {
    id: 'cihangir-1',
    initials: 'CH',
    source: 'Cihangir',
    stars: 4,
    text: { tr: 'QR taraması kaydedildi.', en: 'QR scan recorded.' },
  },
  {
    id: 'cankaya-1',
    initials: 'CK',
    source: 'Çankaya',
    stars: 5,
    text: { tr: 'Google\'a yorum yayınlandı.', en: 'Review published to Google.' },
  },
  {
    id: 'izmir-1',
    initials: 'IZ',
    source: 'İzmir',
    stars: 3,
    text: { tr: 'Düşük puan ekibe iletildi.', en: 'Low rating routed to team.' },
  },
];

interface LiveTickerProps {
  /**
   * Locale (TR/EN text seçimi). Default 'tr'.
   */
  locale?: 'tr' | 'en';
  /**
   * Custom items (caller-passed). Default 5 generic platform event.
   * 3 item visible aynı anda (max stack), eskiler unmount.
   */
  items?: LiveTickerItem[];
  /**
   * Rotation süresi ms (default 2400, FooterLiveTicker §38.131
   * paralel 2800ms — kullanıcı override edebilir).
   */
  rotateMs?: number;
  /** Tailwind className override. */
  className?: string;
}

export default function LiveTicker({
  locale = 'tr',
  items = DEFAULT_GENERIC_ITEMS,
  rotateMs = 2400,
  className,
}: LiveTickerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [idx, setIdx] = useState(0);

  // 3 visible items at any time (orijinal site-library paterni).
  // Memoize visible slice — rotation index değişince yeniden hesaplanır
  // ama mevcut items array'inde stable (re-render guard).
  const visible = useMemo(() => {
    return [0, 1, 2].map((offset) => items[(idx + offset) % items.length]);
  }, [idx, items]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (items.length <= 3) return; // rotation gereksiz

    const tick = () => {
      // Page Visibility — tab gizli iken rotation pause (CLAUDE.md §38.115
      // Stage primitive paterni paralel, battery save).
      if (document.visibilityState === 'visible') {
        setIdx((x) => (x + 1) % items.length);
      }
    };
    const handle = window.setInterval(tick, rotateMs);
    return () => window.clearInterval(handle);
  }, [prefersReducedMotion, items.length, rotateMs]);

  return (
    <div
      className={`relative h-[220px] w-full max-w-[320px] ${className ?? ''}`}
      role="region"
      aria-live="polite"
      aria-label={locale === 'tr' ? 'Canlı aktivite akışı' : 'Live activity feed'}
    >
      <AnimatePresence mode="popLayout">
        {visible.map((item, stackIdx) => {
          const z = 3 - stackIdx;
          const scale = 1 - stackIdx * 0.05;
          const y = stackIdx * 18;
          const opacity = 1 - stackIdx * 0.32;

          return (
            <motion.div
              key={`${item.id}-${idx}-${stackIdx}`}
              className="absolute inset-x-0 overflow-hidden rounded-[14px] bg-brand-paper p-3.5 shadow-[0_14px_30px_-10px_rgba(10,10,10,0.18)] ring-1 ring-black/5"
              style={{ top: y, zIndex: z, transformOrigin: 'top center' }}
              initial={
                stackIdx === 0
                  ? { y: y + 20, scale, opacity: 0 }
                  : { y, scale, opacity }
              }
              animate={{ y, scale, opacity }}
              exit={{
                y: y - 16,
                scale: scale + 0.05,
                opacity: 0,
              }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.6,
                ease: [0.65, 0, 0.35, 1],
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-lime-soft text-[12px] font-semibold tracking-tight text-brand-ink"
                  aria-hidden="true"
                >
                  {item.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold tracking-tight text-brand-ink">
                      {item.source}
                    </p>
                    <span
                      className="inline-flex items-center gap-[2px]"
                      role="img"
                      aria-label={`${item.stars} of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={10}
                          fill={n <= item.stars ? '#A8D62E' : 'none'}
                          stroke={n <= item.stars ? '#A8D62E' : '#D4D4D4'}
                          strokeWidth={1.5}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-brand-mute">
                    {locale === 'en' ? item.text.en : item.text.tr}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
