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
 * Stage 136 §38.216 — card 1 icon visibility fix: image'da "Yeni yorum
 * geldi" kartı icon container'ı boş beyaz görünüyordu (kullanıcı raporu).
 * Tone `neu` (bg-white card + bg-brand-ink icon container) Tailwind v4
 * brand-ink class resolution edge case'inde silent fail edebilir; tone
 * `pos`'a çevrildi + TONE_ICON_BG hex inline (`bg-[#0A0A0A]`) guarantee
 * + tüm 4 card için shadow + hover translate-y polish.
 *
 * Original: site-library.jsx 9.ToastRow. Konversiyon: inline animation
 * delay → framer-motion staggerChildren variants + AnimatePresence-friendly.
 */

import { motion, useReducedMotion } from 'framer-motion';
import {
  MessageCircle,
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

// Stage 136 §38.216 — card 1 tone neu → pos (graphite container guarantee),
// MessageSquareText → MessageCircle (daha modern + chat-like form), icon
// size 14 → 15 (+1px visibility), strokeWidth 2.5 → 2.2 (premium SaaS).
const DEFAULT_GENERIC_ITEMS: ToastRowItem[] = [
  {
    tone: 'pos',
    icon: <MessageCircle size={15} strokeWidth={2.2} />,
    title: 'Yeni yorum geldi',
    sub: 'Google · ★★★★★',
  },
  {
    tone: 'lime',
    icon: <Sparkles size={15} strokeWidth={2.2} />,
    title: 'AI yanıt taslağı hazır',
    sub: '0.8s',
  },
  {
    tone: 'neg',
    icon: <AlertTriangle size={15} strokeWidth={2.2} />,
    title: 'Düşük puan tespit edildi',
    sub: 'Google · ★★',
  },
  {
    tone: 'info',
    icon: <Send size={15} strokeWidth={2.2} />,
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

// Stage 136 §38.216 — brand-* class'ları hex inline'a çevrildi (Tailwind v4
// content scanner edge case'inde brand-ink resolution silent fail edebilir,
// kullanıcı raporu "card 1 icon görünmüyor"). #0A0A0A graphite + #FFFFFF
// paper kanonik Pulse §11.
const TONE_BG: Record<ToastTone, string> = {
  pos: 'bg-white',
  lime: 'bg-[#EAF9B8]',
  neg: 'bg-[#FEE2E2]',
  neu: 'bg-white',
  info: 'bg-[#DBEAFE]',
};

const TONE_ICON_BG: Record<ToastTone, string> = {
  pos: 'bg-[#0A0A0A] text-white',
  lime: 'bg-[#C6F24E] text-[#0A0A0A]',
  neg: 'bg-[#DC2626] text-white',
  neu: 'bg-[#0A0A0A] text-white',
  info: 'bg-[#2563EB] text-white',
};

const TONE_TITLE: Record<ToastTone, string> = {
  pos: 'text-[#0A0A0A]',
  lime: 'text-[#0A0A0A]',
  neg: 'text-[#991B1B]',
  neu: 'text-[#0A0A0A]',
  info: 'text-[#1E3A8A]',
};

// Stage 136 §38.216 — toast hover translate-y + per-tone border accent
// (visual variety + premium SaaS feedback).
const TONE_BORDER: Record<ToastTone, string> = {
  pos: 'ring-[#EDEDED]',
  lime: 'ring-[#C6F24E]/30',
  neg: 'ring-[#FECACA]',
  neu: 'ring-[#EDEDED]',
  info: 'ring-[#BFDBFE]',
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
          className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(10,10,10,0.18)] ${TONE_BG[item.tone]} ${TONE_BORDER[item.tone]}`}
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
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[0_4px_10px_-3px_rgba(10,10,10,0.22)] ${TONE_ICON_BG[item.tone]}`}
            aria-hidden="true"
          >
            {item.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className={`text-[13px] font-semibold leading-tight ${TONE_TITLE[item.tone]}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.title}
            </div>
            <div
              className="mt-0.5 text-[10px] leading-tight text-[#737373]"
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
