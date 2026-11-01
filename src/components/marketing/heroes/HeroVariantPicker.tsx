'use client';

/**
 * Stage 41 §38.122 — HANDOFF §8 step 8 (Heroes) — Variant picker.
 *
 * `NEXT_PUBLIC_HERO_VARIANT` env değişkenine göre 3 hero arasından
 * dinamik import yapan client wrapper. HANDOFF §6.1 paterni:
 *
 *   const variant = process.env.NEXT_PUBLIC_HERO_VARIANT ?? 'cinematic';
 *   const Hero = {
 *     cinematic: dynamic(() => import('./HeroCinematic'), { ssr: false }),
 *     starclimb: dynamic(() => import('./HeroStarClimb'), { ssr: false }),
 *     parallax:  dynamic(() => import('./HeroParallax'),  { ssr: false }),
 *   }[variant];
 *
 * Stage 91 §38.171 — `ssr: false` → `ssr: true`:
 * Önceki kararda animation-heavy oldukları için SSR atlanıyordu, ama
 * bu marketing surface'inde **görsel flash bug** yaratıyordu:
 *   1. SSR HTML: hero skeleton (min-h-[640px]) + Section 2 marquee (gerçek)
 *   2. Client hydrate: hero chunk download → 100-300ms gecikme
 *   3. Marquee scroll-anim hemen başlıyor → kullanıcı "anasayfaya
 *      girince önce marquee gözüküyor sonra normale dönüyor" diye
 *      algılıyor (asymmetric mount timing).
 * `ssr: true` ile SSR HTML'de hero'nun statik ilk frame'i render edilir
 * (framer-motion `initial` state + Stage primitive `time=0` + useEffect
 * client-only kalır). Hydrate sonrası animation natural başlar.
 * Skeleton fallback Suspense ile intact — chunk download anında
 * görünür (1st visit + cache miss).
 *
 * SSR-safe doğrulaması:
 *  - 3 hero `'use client'` directive
 *  - `window` / `document` referansları `useEffect` içinde (client-only)
 *  - `useReducedMotion()` SSR'da null → animated branch render (intended)
 *  - `<Stage>` + `<Sprite>` Stage 35 §38.115 tab pause + reduced-motion
 *    handle ediyor
 *  - Hydration mismatch riski yok (framer-motion `initial` state SSR +
 *    client uyumlu)
 *
 * Page (Server Component) `<HeroVariantPicker locale={locale} />`
 * mount eder; bu wrapper client-side `process.env.NEXT_PUBLIC_*`
 * okur (Next.js inline replacement build-time'da).
 */

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
// The default hero is imported statically. Loaded through next/dynamic it was
// a lazy boundary: even in the prerendered HTML the H1 sat at the very end of
// <body> inside <div hidden>, swapped in by script — crawlers that do not run
// JS (GPTBot, ClaudeBot, PerplexityBot) saw a skeleton where the H1 should be.
import HeroCinematic from './HeroCinematic';

interface Props {
  locale: 'tr' | 'en';
}

const HeroStarClimb = dynamic(() => import('./HeroStarClimb'), { ssr: true });
const HeroParallax = dynamic(() => import('./HeroParallax'), { ssr: true });

const VARIANTS = {
  cinematic: HeroCinematic,
  starclimb: HeroStarClimb,
  parallax: HeroParallax,
} as const;

type HeroVariantKey = keyof typeof VARIANTS;

function resolveVariant(): HeroVariantKey {
  const raw = process.env.NEXT_PUBLIC_HERO_VARIANT;
  if (raw === 'cinematic' || raw === 'starclimb' || raw === 'parallax') {
    return raw;
  }
  // Default — most product-explanatory + scene-driven (HANDOFF §6.1)
  return 'cinematic';
}

function HeroSkeleton() {
  return (
    <section
      className="relative min-h-[640px] overflow-hidden bg-[#FAFAFA]"
      aria-hidden
    >
      <div className="mx-auto flex min-h-[640px] max-w-[1280px] flex-col items-center gap-10 px-5 py-[60px] sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:py-[88px]">
        <div className="w-full max-w-[560px]">
          <div className="bz-skeleton h-3 w-40 rounded" />
          <div className="bz-skeleton mt-4 h-12 w-full rounded" />
          <div className="bz-skeleton mt-2 h-12 w-3/4 rounded" />
          <div className="bz-skeleton mt-6 h-4 w-full rounded" />
          <div className="bz-skeleton mt-2 h-4 w-2/3 rounded" />
          <div className="mt-8 flex gap-3">
            <div className="bz-skeleton h-12 w-40 rounded-full" />
            <div className="bz-skeleton h-12 w-32 rounded-full" />
          </div>
        </div>
        <div className="bz-skeleton aspect-square w-full max-w-[480px] rounded-[28px] lg:max-w-[520px]" />
      </div>
    </section>
  );
}

export default function HeroVariantPicker({ locale }: Props) {
  const variant = resolveVariant();
  if (variant === 'cinematic') return <HeroCinematic locale={locale} />;
  const Hero = VARIANTS[variant];

  return (
    <Suspense fallback={<HeroSkeleton />}>
      <Hero locale={locale} />
    </Suspense>
  );
}
