'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { detectSourceType, getOrCreateSessionId } from '@/lib/analytics-session';
import { ANALYTICS_THRESHOLDS, type AnalyticsEventType } from '@/lib/analytics-heuristics';

const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH = 25;

interface TrackPayload {
  eventType: AnalyticsEventType;
  categoryId?: string | null;
  productId?: string | null;
  relatedProductId?: string | null;
  sourceProductId?: string | null;
}

interface UseMenuAnalyticsOptions {
  slug: string | null;
  enabled?: boolean;
}

/**
 * Client-side analytics tracker. Batches events and flushes via fetch/sendBeacon.
 * De-duplicates menu_product_view within the configured window per session.
 */
export function useMenuAnalytics({ slug, enabled = true }: UseMenuAnalyticsOptions) {
  const queueRef = useRef<TrackPayload[]>([]);
  const lastSentRef = useRef<Map<string, number>>(new Map());
  const sessionIdRef = useRef<string>('');
  const sourceTypeRef = useRef<string>('direct');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugRef = useRef(slug);
  slugRef.current = slug;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    sessionIdRef.current = getOrCreateSessionId();
    sourceTypeRef.current = detectSourceType(new URLSearchParams(window.location.search));
  }, [enabled]);

  const flush = useCallback(
    async (opts: { beacon?: boolean } = {}) => {
      const currentSlug = slugRef.current;
      if (!currentSlug || !sessionIdRef.current) return;
      const queue = queueRef.current;
      if (queue.length === 0) return;
      const batch = queue.splice(0, MAX_BATCH);
      const body = JSON.stringify({
        sessionId: sessionIdRef.current,
        events: batch.map((ev) => ({
          eventType: ev.eventType,
          categoryId: ev.categoryId ?? null,
          productId: ev.productId ?? null,
          sourceType: sourceTypeRef.current,
          relatedProductId: ev.relatedProductId ?? null,
          sourceProductId: ev.sourceProductId ?? null,
        })),
      });

      const url = `/api/menu/${encodeURIComponent(currentSlug)}/analytics`;

      if (opts.beacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }

      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        });
      } catch {
        // Restore batch on network failure — stay silent, no toast for analytics.
        queueRef.current.unshift(...batch);
      }
    },
    [],
  );

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flush();
    }, FLUSH_INTERVAL_MS);
  }, [flush]);

  const track = useCallback(
    (payload: TrackPayload) => {
      if (!enabled || typeof window === 'undefined') return;
      const now = Date.now();
      const dedupeKey = `${payload.eventType}|${payload.categoryId ?? ''}|${payload.productId ?? ''}`;
      const windowMs =
        payload.eventType === 'menu_view'
          ? ANALYTICS_THRESHOLDS.dedupeMenuViewMs
          : payload.eventType === 'menu_category_click'
          ? ANALYTICS_THRESHOLDS.dedupeCategoryClickMs
          : payload.eventType === 'menu_product_view'
          ? ANALYTICS_THRESHOLDS.dedupeProductViewMs
          : ANALYTICS_THRESHOLDS.dedupeProductClickMs;
      const lastAt = lastSentRef.current.get(dedupeKey);
      if (lastAt && now - lastAt < windowMs) return;
      lastSentRef.current.set(dedupeKey, now);
      queueRef.current.push(payload);
      if (queueRef.current.length >= MAX_BATCH) {
        void flush();
      } else {
        scheduleFlush();
      }
    },
    [enabled, flush, scheduleFlush],
  );

  // Flush on page hide / unload to avoid losing tail events.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const onHide = () => {
      void flush({ beacon: true });
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush({ beacon: true });
    });
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [enabled, flush]);

  return useMemo(
    () => ({
      track,
      trackMenuView: () => track({ eventType: 'menu_view' }),
      trackCategoryClick: (categoryId: string) => track({ eventType: 'menu_category_click', categoryId }),
      trackProductView: (productId: string, categoryId: string | null) =>
        track({ eventType: 'menu_product_view', productId, categoryId }),
      trackProductClick: (productId: string, categoryId: string | null) =>
        track({ eventType: 'menu_product_click', productId, categoryId }),
      trackUpsellClick: (relatedProductId: string, sourceProductId?: string | null) =>
        track({ eventType: 'menu_upsell_click', relatedProductId, sourceProductId: sourceProductId ?? null }),
      flushNow: () => flush(),
    }),
    [track, flush],
  );
}

/**
 * Attach an IntersectionObserver to a list of DOM refs and fire productView
 * when each element enters the viewport. De-duplication is handled by the hook.
 */
export function useProductViewTracking(params: {
  enabled: boolean;
  track: (productId: string, categoryId: string | null) => void;
  products: { productId: string; categoryId: string | null }[];
}) {
  const { enabled, track, products } = params;
  const refs = useRef<Map<string, HTMLElement>>(new Map());

  const setRef = useCallback((productId: string, el: HTMLElement | null) => {
    if (el) refs.current.set(productId, el);
    else refs.current.delete(productId);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const productMap = new Map(products.map((p) => [p.productId, p.categoryId]));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const pid = (entry.target as HTMLElement).dataset.pid;
          if (!pid) continue;
          const catId = productMap.get(pid) ?? null;
          track(pid, catId);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5, rootMargin: '0px 0px -10% 0px' },
    );

    for (const [pid, el] of refs.current.entries()) {
      if (productMap.has(pid)) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [enabled, track, products]);

  return setRef;
}
