'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Prefetch a few panel sections once the page is idle (CLAUDE.md §56): after
 * the window `load` event and the page's own requests, one at a time with a
 * pause between them, so a later click is instant without competing with the
 * page that is loading. Skipped on Save-Data / slow connections.
 */
export function useIdlePrefetch(hrefs: string[], delayMs = 2_500, gapMs = 400) {
  const router = useRouter();
  const key = hrefs.join('|');
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;
    const list = key ? key.split('|') : [];
    const timers: number[] = [];
    let cancelled = false;
    const run = () => {
      list.forEach((href, i) => {
        timers.push(
          window.setTimeout(() => {
            if (!cancelled && document.visibilityState === 'visible') router.prefetch(href);
          }, i * gapMs),
        );
      });
    };
    const start = () => {
      timers.push(
        window.setTimeout(() => {
          const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
            .requestIdleCallback;
          if (ric) ric(run, { timeout: 3_000 });
          else run();
        }, delayMs),
      );
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', start);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [key, delayMs, gapMs, router]);
}
