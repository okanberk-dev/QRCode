'use client';

import { useEffect, useState } from 'react';

/**
 * Stage 83 §38.163 — marketing surface auth state probe (client-side).
 *
 * Marketing components used to consume server-side `cookies()` reads which
 * pinned the entire `[locale]/*` tree to dynamic rendering. This hook
 * delegates auth detection to `/api/auth/me` (CLAUDE.md §38.163) so the
 * marketing surface can ship as ISR.
 *
 * Default state: `isLoggedIn: false`. Anonymous visitors (the dominant
 * marketing audience, ≥90%) see the correct UI on first paint without
 * waiting for a fetch. Authenticated visitors see the correct CTA after
 * hydration (~50–200ms — invisible to the eye in practice).
 *
 * Behavior:
 *   - Single fetch on mount (no polling, no retry on failure).
 *   - `cache: 'no-store'` — the endpoint is per-cookie + sets its own
 *     Cache-Control: private, max-age=30 (browser tab dedupe).
 *   - Errors are swallowed silently (returns the default anonymous state).
 *
 * Pattern paralel: NotificationBell `/api/notifications` mount probe
 * (CLAUDE.md §38.141 Stage 60).
 */
export interface MarketingAuthState {
  /** False until the probe resolves. After mount: reflects actual state. */
  isLoggedIn: boolean;
  /** `'user' | 'admin' | null` — caller decides routing/CTA per surface. */
  source: 'user' | 'admin' | null;
  /** True until the first probe resolves; UI may delay swap until !pending. */
  pending: boolean;
}

export function useMarketingAuth(): MarketingAuthState {
  const [state, setState] = useState<MarketingAuthState>({
    isLoggedIn: false,
    source: null,
    pending: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) {
            setState({ isLoggedIn: false, source: null, pending: false });
          }
          return;
        }
        const data = (await res.json()) as {
          isLoggedIn?: unknown;
          source?: unknown;
        };
        const isLoggedIn = data.isLoggedIn === true;
        const source =
          data.source === 'user' || data.source === 'admin' ? data.source : null;
        if (!cancelled) {
          setState({ isLoggedIn, source, pending: false });
        }
      } catch {
        if (!cancelled) {
          setState({ isLoggedIn: false, source: null, pending: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
