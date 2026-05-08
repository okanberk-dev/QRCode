'use client';

/**
 * ToastRow — Stage 66 §38.147 PR0 base.
 *
 * 4 küçük toast/notification kart grid'i (slide-in stagger).
 * Anasayfa "Buaze nasıl çalışır" feature explanation veya dashboard
 * inbox'ta yeni mesaj geldiğinde kullanılır.
 *
 * Pulse §11 disipline + COMPLIANCE (CRITICAL):
 * - Default items generic platform feature event'leri (§38.131 paterni
 *   paralel — fake müşteri "Mehmet K. ★★★ verdi" YASAK CLAUDE.md §35.10).
 * - Caller items prop'u ile real backend feed (örn. NotificationBell
 *   data) geçirebilir.
 *
 * 4 tone: pos (graphite) / lime (signature) / neg (red) / neu (paper).
 * lucide-react icons (orijinal Unicode ✓ ✦ ! ↗ yerine).
 *
 * Reduced-motion: stagger off, tüm toast'lar hemen visible.
 *
 * Original: site-library.jsx 9.ToastRow. Konversiyon: inline animation
 * delay → framer-motion staggerChildren variants + AnimatePresence-friendly.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import type { ReactNode } from 'react';

export type ToastTone = 'pos' | 'lime' | 'neg' | 'neu';

export interface ToastRowItem {
  /** Tone — bg + icon + text rengini belirler. */
  tone: ToastTone;
  /** Icon (lucide-react component). Default tone-bazlı. */
  icon?: ReactNode;
  /** Ana metin (event açıklaması). */
  title: string;
  /** Alt metin (kaynak/zaman/detay). */
  sub: string;
}

const DEFAULT_GENERIC_ITEMS: ToastRowItem[] = [
  {
    tone: 'pos',
    icon: <Check size={12} strokeWidth={3} />,
    title: 'Yeni yorum geldi',
    sub: 'Google · ★★★★★',
  },
  {
    tone: 'lime',
    icon: <Sparkles size={12} strokeWidth={2.5} />,
    title: 'AI yanıt taslağı hazır',
    sub: '0.8s',
  },
  {
    tone: 'neg',
    icon: <AlertTriangle size={12} strokeWidth={2.5} />,
    title: 'Düşük puan tespit edildi',
    sub: 'Google · ★★',
  },
  {
    tone: 'pos',
    icon: <ArrowUpRight size={12} strokeWidth={2.5} />,
    title: 'Yorum Google’a yayınlandı',
    sub: 'Google Reviews',
  },
];

interface ToastRowProps {
  /** Custom items. Default 4 generic event. */
  items?: ToastRowItem[];
  /** Stagger delay seconds (default 0.15). */
  staggerSec?: number;
  /** Tailwind className override. */
  className?: string;
}

const TONE_BG: Record<ToastTone, string> = {
  pos: 'bg-brand-paper',
  lime: 'bg-brand-lime-soft',
  neg: 'bg-[#FEE2E2]',
  neu: 'bg-brand-bg',
};

const TONE_ICON_BG: Record<ToastTone, string> = {
  pos: 'bg-brand-ink text-white',
  lime: 'bg-brand-lime text-brand-ink',
  neg: 'bg-[#DC2626] text-white',
  neu: 'bg-brand-mute text-white',
};

const TONE_TITLE: Record<ToastTone, string> = {
  pos: 'text-brand-ink',
  lime: 'text-brand-ink',
  neg: 'text-[#DC2626]',
  neu: 'text-brand-ink',
};

export default function ToastRow({
  items = DEFAULT_GENERIC_ITEMS,
  staggerSec = 0.15,
  className,
}: ToastRowProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({
    rootMargin: '100px',
    triggerOnce: true,
    threshold: 0.3,
  });

  return (
    <motion.div
      ref={ref}
      className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${className ?? ''}`}
      initial="hidden"
      animate={inView || prefersReducedMotion ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerSec,
          },
        },
      }}
    >
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-black/5 ${TONE_BG[item.tone]}`}
          variants={{
            hidden: { opacity: 0, x: -12 },
            visible: { opacity: 1, x: 0 },
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            ease: [0.65, 0, 0.35, 1],
          }}
        >
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${TONE_ICON_BG[item.tone]}`}
            aria-hidden="true"
          >
            {item.icon}
          </span>
          <div className="min-w-0">
            <div
              className={`text-xs font-semibold ${TONE_TITLE[item.tone]}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.title}
            </div>
            <div
              className="text-[10px] text-brand-mute"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {item.sub}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
