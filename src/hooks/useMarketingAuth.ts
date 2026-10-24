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
 *   - One shared request per page: navbar, mobile bottom nav and the
 *     contact bubble all call this hook; they now reuse a single in-flight
 *     promise (cached 60 s across client navigations) instead of firing
 *     three `/api/auth/me` requests on every page view.
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

type ProbeResult = Omit<MarketingAuthState, 'pending'>;

const ANONYMOUS: ProbeResult = { isLoggedIn: false, source: null };
const PROBE_TTL_MS = 60_000;
let sharedProbe: { promise: Promise<ProbeResult>; startedAt: number } | null = null;

async function runProbe(): Promise<ProbeResult> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) return ANONYMOUS;
    const data = (await res.json()) as { isLoggedIn?: unknown; source?: unknown };
    return {
      isLoggedIn: data.isLoggedIn === true,
      source: data.source === 'user' || data.source === 'admin' ? data.source : null,
    };
  } catch {
    return ANONYMOUS;
  }
}

function probeAuth(): Promise<ProbeResult> {
  const now = Date.now();
  if (!sharedProbe || now - sharedProbe.startedAt > PROBE_TTL_MS) {
    sharedProbe = { promise: runProbe(), startedAt: now };
  }
  return sharedProbe.promise;
}

/**
 * @param enabled  false skips the probe entirely (e.g. the contact bubble on
 *                 /auth, /onboarding and the dashboard, where it never shows).
 */
export function useMarketingAuth(enabled = true): MarketingAuthState {
  const [state, setState] = useState<MarketingAuthState>({
    isLoggedIn: false,
    source: null,
    pending: true,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    probeAuth().then((result) => {
      if (!cancelled) setState({ ...result, pending: false });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
