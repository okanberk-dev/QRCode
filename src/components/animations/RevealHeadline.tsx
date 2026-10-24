'use client';

/**
 * RevealHeadline — Stage 66 §38.147 PR0 base.
 *
 * Scroll-triggered word-by-word fade-up reveal başlık. Section
 * heading'lerinde marketing surface'lerde kullanılır.
 *
 * Pulse §11 disipline: Space Grotesk display + tight tracking + balance
 * text-wrap. framer-motion stagger children variants ile word-by-word
 * cascade (orijinal inline transition delay paterni).
 *
 * Tasarım kararı: useInView (react-intersection-observer) one-shot
 * trigger — sayfa ilk gösterildiğinde anim oynatılır, scroll geri-ileri
 * tekrar tetiklenmez (UX stutter önleme). LazyMount wrapper'siz, kendi
 * IntersectionObserver'ı taşır (prop API daha clean).
 *
 * Reduced-motion: framer-motion useReducedMotion ile final-state static
 * render (opacity 1 + translateY 0 hemen).
 *
 * Original: site-library.jsx 10.RevealHeadline. Konversiyon: inline style
 * delay → framer-motion staggerChildren variants.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface RevealHeadlineProps {
  /** Başlık text — boşluklarla word'lere split edilir. */
  text: string;
  /** Heading level (h1/h2/h3). Default: h2. */
  as?: 'h1' | 'h2' | 'h3';
  /** Tailwind font-size override. Default: 'text-[56px]' (h2). */
  className?: string;
  /** Word stagger süresi (ms cinsinden). Default: 80. */
  staggerMs?: number;
  /** Fade-up duration (ms). Default: 600. */
  durationMs?: number;
}

export default function RevealHeadline({
  text,
  as: Tag = 'h2',
  className,
  staggerMs = 80,
  durationMs = 600,
}: RevealHeadlineProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({
    rootMargin: '100px',
    triggerOnce: true,
    threshold: 0.15,
  });

  const words = text.split(' ');
  const staggerSec = staggerMs / 1000;
  const durationSec = durationMs / 1000;

  // Reduced motion: visible state hemen final
  const animate = prefersReducedMotion || inView ? 'visible' : 'hidden';

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={animate}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerSec,
          },
        },
      }}
      // Must be a real box: an element with `display: contents` has no
      // layout box, so IntersectionObserver never reports it as visible and
      // the words stayed at opacity 0 — the heading was invisible.
      className="block"
    >
      <Tag
        className={`m-0 leading-none tracking-[-0.03em] text-brand-ink ${
          className ?? 'text-[clamp(32px,5vw,56px)]'
        }`}
        style={{
          fontFamily: 'var(--font-heading)',
          textWrap: 'balance',
        }}
      >
        {words.map((word, idx) => (
          <motion.span
            key={`${word}-${idx}`}
            className="mr-3 inline-block"
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: prefersReducedMotion ? 0 : durationSec,
              ease: [0.65, 0, 0.35, 1],
            }}
          >
            {word}
          </motion.span>
        ))}
      </Tag>
    </motion.div>
  );
}
