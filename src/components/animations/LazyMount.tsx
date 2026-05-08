'use client';

/**
 * LazyMount — Stage 66 §38.147 PR0 base.
 *
 * Animation component'lerin viewport'a girene kadar render edilmeden veya
 * animasyon başlatmadan beklemesini sağlayan ortak wrapper. CLAUDE.md
 * §38.115 Stage primitive paterni paralel + react-intersection-observer
 * lib reuse (kullanıcı kararı, AskUserQuestion onaylı).
 *
 * Davranış:
 * - rootMargin: '100px' default (viewport'a yaklaşırken erkenden tetikle)
 * - triggerOnce: true default (RevealHeadline + sayaçlar için bir-kere-oynat)
 * - triggerOnce: false → LiveTicker / Marquee / PulseLine sürekli loop;
 *   ek olarak `pauseWhenHidden: true` ile viewport'tan çıkınca pause
 *   (Page Visibility paralel — battery save).
 * - prefers-reduced-motion: motion-safe wrapper, `staticFallback` prop'u
 *   ile final-frame statik render. Yoksa null döner (component hiç mount
 *   etmez, GPU compositing maliyeti sıfır).
 *
 * Tasarım kararı: Children render-prop function `inView: boolean` alır.
 * `unmountOnExit` aktifken viewport dışında children unmount edilir
 * (LiveTicker setInterval cleanup için kritik).
 */

import { type ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';
import { useReducedMotion } from 'framer-motion';

interface LazyMountProps {
  /**
   * Render prop — child component `inView` flag'ini kullanarak animation'ı
   * conditional başlatır. Function form RAF/setInterval cleanup için
   * gerekli (component unmount yerine internal animation pause olabilir).
   */
  children: (state: { inView: boolean }) => ReactNode;
  /**
   * Reduced-motion + animation tamamen disable iken gösterilecek static
   * fallback (final frame). Prop yoksa null render edilir.
   */
  staticFallback?: ReactNode;
  /**
   * IntersectionObserver `rootMargin`. Default 100px — viewport sınırına
   * yaklaşırken erkenden tetikle, müşteri scroll-anchor'a takılırsa
   * pop-in görünmez.
   */
  rootMargin?: string;
  /**
   * Default true — ilk görünmede tetiklenip kayıt edilmiş kalır
   * (sayaçlar + RevealHeadline için scroll-stutter önler).
   * False — sürekli loop component'leri için (LiveTicker, Marquee,
   * PulseLine); viewport'tan çıkınca durur.
   */
  triggerOnce?: boolean;
  /**
   * `triggerOnce: false` durumda, viewport dışı + tab gizli iken children
   * unmount edilmesini etkinleştirir. setInterval / setTimeout cleanup
   * için kritik. Default true.
   */
  unmountOnExit?: boolean;
  /**
   * Outer wrapper className — boyut rezerve etmek için (CLS önleme).
   * Örn. 'h-[200px] w-full'.
   */
  className?: string;
  /**
   * IntersectionObserver `threshold`. Default 0 — herhangi bir piksel
   * görününce tetikle.
   */
  threshold?: number;
}

export default function LazyMount({
  children,
  staticFallback,
  rootMargin = '100px',
  triggerOnce = true,
  unmountOnExit = true,
  className,
  threshold = 0,
}: LazyMountProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({
    rootMargin,
    triggerOnce,
    threshold,
    initialInView: false,
  });

  // Reduced motion: Stage primitive paralel — animation tamamen disable.
  // staticFallback varsa final-frame render, yoksa null (boyut rezerve
  // edilmez, parent layout intact).
  if (prefersReducedMotion) {
    return staticFallback != null ? (
      <div className={className}>{staticFallback}</div>
    ) : null;
  }

  // Loop component'lerinde viewport dışı + unmountOnExit aktif → children
  // hiç render edilmez (setInterval/RAF cleanup, battery save). Sadece
  // wrapper + reserved height.
  const shouldRenderChildren =
    inView || (triggerOnce && !unmountOnExit ? false : !unmountOnExit);

  return (
    <div ref={ref} className={className}>
      {shouldRenderChildren ? children({ inView }) : null}
    </div>
  );
}
