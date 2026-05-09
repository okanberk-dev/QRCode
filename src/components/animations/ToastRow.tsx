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
 * Stage 90 §38.170: yeni `info` tone (mavi) eklendi + default items
 * 4 distinct vibrant icon container (kullanıcı raporu items 1+4 icon
 * görünmüyor — graphite-on-graphite hissi). Yeni default tone mapping:
 * - Item 1 "Yeni yorum geldi": neu (paper) → MessageSquareText icon
 * - Item 2 "AI yanıt taslağı": lime (signature) → Sparkles icon
 * - Item 3 "Düşük puan": neg (red) → AlertTriangle icon
 * - Item 4 "Google'a yayınlandı": info (blue) → Send icon
 * Icon size 12 → 14 ve container 24 → 28 (visibility uplift).
 *
 * lucide-react icons (orijinal Unicode ✓ ✦ ! ↗ yerine).
 *
 * Reduced-motion: stagger off, tüm toast'lar hemen visible.
 *
 * Original: site-library.jsx 9.ToastRow. Konversiyon: inline animation
 * delay → framer-motion staggerChildren variants + AnimatePresence-friendly.
 */

import { motion, useReducedMotion } from 'framer-motion';
import {
  MessageSquareText,
  Sparkles,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import type { ReactNode } from 'react';

export type ToastTone = 'pos' | 'lime' | 'neg' | 'neu' | 'info';

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
    tone: 'neu',
    icon: <MessageSquareText size={14} strokeWidth={2.5} />,
    title: 'Yeni yorum geldi',
    sub: 'Google · ★★★★★',
  },
  {
    tone: 'lime',
    icon: <Sparkles size={14} strokeWidth={2.5} />,
    title: 'AI yanıt taslağı hazır',
    sub: '0.8s',
  },
  {
    tone: 'neg',
    icon: <AlertTriangle size={14} strokeWidth={2.5} />,
    title: 'Düşük puan tespit edildi',
    sub: 'Google · ★★',
  },
  {
    tone: 'info',
    icon: <Send size={14} strokeWidth={2.5} />,
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
  neu: 'bg-white',
  info: 'bg-[#DBEAFE]',
};

const TONE_ICON_BG: Record<ToastTone, string> = {
  pos: 'bg-brand-ink text-white',
  lime: 'bg-brand-lime text-brand-ink',
  neg: 'bg-[#DC2626] text-white',
  neu: 'bg-brand-ink text-white',
  info: 'bg-[#2563EB] text-white',
};

const TONE_TITLE: Record<ToastTone, string> = {
  pos: 'text-brand-ink',
  lime: 'text-brand-ink',
  neg: 'text-[#991B1B]',
  neu: 'text-brand-ink',
  info: 'text-[#1E3A8A]',
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
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-[0_2px_6px_-2px_rgba(10,10,10,0.18)] ${TONE_ICON_BG[item.tone]}`}
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
