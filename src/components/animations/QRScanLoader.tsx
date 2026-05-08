'use client';

/**
 * QRScanLoader — Stage 66 §38.147 PR0 base.
 *
 * Animasyonlu QR placeholder + tarama lazer çizgisi. Onboarding loading
 * state, demo / placeholder QR generator preview gibi yerlerde
 * kullanılır.
 *
 * Pulse §11 disipline: graphite QR matrix + lime tarama hattı + box-shadow
 * lime glow. Deterministik 11×11 matrix (Math.random YOK — SSR + test
 * friendly, CLAUDE.md §38.140 §38.143 disipline).
 *
 * Stage 79 §38.157 — visibility fix:
 * - Tailwind `bg-brand-paper` / `bg-brand-ink` utility'leri inline
 *   `bg-[#FAFAFA]` / `bg-[#0A0A0A]` hex'lere çevrildi (Tailwind config
 *   theme extend bağımlılığı kaldırıldı, kullanıcı raporu "QR
 *   animasyonu renginden dolayı gözükmüyor siyahlaştırırsan gözükebilir").
 * - Filled modules `brand-pulse` opacity-fade animasyonu kaldırıldı —
 *   solid graphite static görünür kalır (pulse cycle 2640ms boyunca
 *   modules görünmez oluyordu); sadece lime tarama hattı animasyonu
 *   intact (visual scanning effect bu çizgiden geliyor).
 *
 * Tasarım kararı: Loop animation (sürekli yeniden tara) + reduced-motion
 * static QR (lazer hattı off).
 *
 * Original: site-library.jsx 2.QRScanLoader. Konversiyon: useState tick
 * + manual RAF → framer-motion useMotionValue + animate (loop +
 * reduced-motion built-in).
 */

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect, useMemo } from 'react';

interface QRScanLoaderProps {
  /** Boyut px (kare). Default 140. */
  size?: number;
  /** Tarama döngüsü ms (default 1800 fill + 600 pause = 2400 total). */
  scanDurationMs?: number;
  /** Tailwind className override. */
  className?: string;
}

// Deterministik 11×11 matrix (PRNG-free). Visual decoration için
// hardcoded pattern (CLAUDE.md §38.140 §38.143 paterni reuse).
function generateMatrix(): boolean[][] {
  const N = 11;
  const matrix: boolean[][] = [];
  for (let r = 0; r < N; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < N; c++) {
      // Finder patterns (corner 3×3 squares) + density pattern
      const isFinder =
        (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3);
      // Center row/col timing pattern
      const isTiming = (r === 5 || c === 5) && !isFinder;
      // Deterministic data fill — XOR pattern based on coords
      const isData = !isFinder && !isTiming && ((r * 7 + c * 13) % 5 < 2);
      row.push(isFinder || isTiming || isData);
    }
    matrix.push(row);
  }
  return matrix;
}

export default function QRScanLoader({
  size = 140,
  scanDurationMs = 1800,
  className,
}: QRScanLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const matrix = useMemo(() => generateMatrix(), []);
  const moduleSize = size / 11;

  const progress = useMotionValue(0);
  const linePos = useTransform(progress, (p) => `${p * 100}%`);
  const lineOpacity = useTransform(progress, (p) => (p < 0.95 ? 1 : 0));

  useEffect(() => {
    if (prefersReducedMotion) {
      progress.set(1);
      return;
    }
    const controls = animate(progress, [0, 1], {
      duration: scanDurationMs / 1000,
      ease: [0.4, 0, 0.6, 1],
      repeat: Infinity,
      repeatDelay: 0.6,
      repeatType: 'loop',
    });
    return () => controls.stop();
  }, [prefersReducedMotion, scanDurationMs, progress]);

  return (
    <div
      className={`relative ${className ?? ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="QR code scanning animation"
    >
      <div
        className="grid h-full w-full bg-[#FAFAFA] p-1"
        style={{
          gridTemplateColumns: `repeat(11, 1fr)`,
          gridTemplateRows: `repeat(11, 1fr)`,
        }}
        aria-hidden="true"
      >
        {matrix.flat().map((filled, idx) => {
          // Stage 79 §38.157 — Filled modules solid graphite static
          // (eski brand-pulse opacity fade animasyonu görünmezliğe
          // sebep oluyordu). Sadece lime tarama hattı animasyonu kalır,
          // QR matrix kararlı görünür.
          return (
            <div
              key={idx}
              className={filled ? 'bg-[#0A0A0A]' : 'bg-transparent'}
              style={{
                width: moduleSize,
                height: moduleSize,
              }}
            />
          );
        })}
      </div>
      {/* Lime tarama hattı */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-[3px]"
        style={{
          top: linePos,
          background: 'linear-gradient(90deg, transparent, #C6F24E, transparent)',
          boxShadow: '0 0 12px #C6F24E',
          opacity: lineOpacity,
        }}
      />
    </div>
  );
}
