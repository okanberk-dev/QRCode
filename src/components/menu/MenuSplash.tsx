'use client';

import { useEffect, useRef } from 'react';
import type { ResolvedMenuDesign } from '@/lib/menu-design';
import { menuCopy, menuEyebrow, monogramOf, type MenuLocale } from './menu-labels';
import { splashRemainingMs } from './splash-timing';

const SPLASH_MS = 3000;
const SPLASH_OUT_MS = 280;
const SPLASH_TOTAL_MS = SPLASH_MS + SPLASH_OUT_MS;
/** Must match the keyframes name in the inline style below (and globals.css). */
const OUT_ANIMATION = 'bzm-splash-out';

/**
 * Branded splash for QR visits (`?source=qr`), drawn as an overlay above the
 * always-mounted menu. It is in the SSR HTML (no menu-then-splash flash); if
 * JavaScript never runs, the CSS animation still hides it at 3.28 s. Under
 * prefers-reduced-motion it is hidden by CSS and `onDone` fires at once.
 *
 * `onDone` follows the CSS fade, not the mount: the SSR splash's animation
 * started at first paint, so after a slow hydration only the rest of it is
 * waited for (and nothing, if it already ended). Until `onDone` the menu
 * canvas is inert, so a late `onDone` would leave a visible menu untappable.
 */
export default function MenuSplash({
  name, category, logoUrl, design, locale, onDone,
}: {
  name: string;
  category?: string | null;
  logoUrl: string | null;
  design: ResolvedMenuDesign;
  locale: MenuLocale;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    };
    const reduceMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !el) {
      finish();
      return;
    }
    const anim = typeof el.getAnimations === 'function'
      ? el.getAnimations().find((a) => (a as CSSAnimation).animationName === OUT_ANIMATION)
      : undefined;
    const remaining = splashRemainingMs({
      totalMs: SPLASH_TOTAL_MS,
      playState: anim?.playState ?? null,
      currentTime: anim ? anim.currentTime : null,
      hidden: window.getComputedStyle(el).visibility === 'hidden',
    });
    if (remaining === 0) {
      finish();
      return;
    }
    const onEnd = (e: AnimationEvent) => {
      if (e.target === el && e.animationName === OUT_ANIMATION) finish();
    };
    el.addEventListener('animationend', onEnd);
    // Safety net in case `animationend` never fires (tab in the background).
    const t = window.setTimeout(finish, remaining);
    return () => {
      el.removeEventListener('animationend', onEnd);
      window.clearTimeout(t);
    };
  }, [onDone]);

  const banner = design.structure.header === 'banner';
  const copy = menuCopy(locale);
  const eyebrow = menuEyebrow(category);

  return (
    <div
      ref={rootRef}
      data-menu-splash=""
      role="status"
      aria-label={copy.splash(name)}
      className={`fixed inset-0 z-[60] flex touch-none flex-col items-center justify-center overscroll-contain px-8 text-center ${
        banner
          ? 'bzm-on-banner bg-[linear-gradient(160deg,var(--m-banner),var(--m-banner-end))] text-(--m-on-banner)'
          : 'bg-(--m-bg) text-(--m-ink)'
      }`}
      style={{ animation: `bzm-splash-out ${SPLASH_OUT_MS}ms cubic-bezier(.2,.8,.2,1) ${SPLASH_MS}ms forwards` }}
    >
      {!banner && design.scheme === 'dark' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_50%_30%,var(--m-glow),transparent_70%)]" />
      )}
      <div className="relative flex flex-col items-center">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-(--m-r-card) bg-(--m-accent-fill) text-(--m-on-accent) shadow-[inset_0_0_0_1px_var(--m-accent-edge),0_18px_40px_-18px_rgb(0_0_0/.45)]">
          {logoUrl ? (
            <img src={logoUrl} alt="" decoding="async" className="h-full w-full bg-(--m-surface) object-cover" />
          ) : (
            <span aria-hidden className="bzm-monogram-tile bzm-monogram-tile--lg">{monogramOf(name, locale)}</span>
          )}
        </div>
        {eyebrow && <p className="bzm-label mt-7">{eyebrow}</p>}
        <p className={`bzm-name ${eyebrow ? 'mt-2' : 'mt-7'} max-w-[18ch]`}>{name}</p>
      </div>
      <div className={`absolute bottom-14 left-1/2 h-[2px] w-40 -translate-x-1/2 overflow-hidden rounded-full ${banner ? 'bg-current/25' : 'bg-(--m-rule)'}`}>
        <span
          className={`block h-full rounded-full ${banner ? 'bg-current' : 'bg-(--m-accent-ui)'}`}
          style={{ animation: `buaze-splash-fill ${SPLASH_MS}ms linear forwards` }}
        />
      </div>
    </div>
  );
}
