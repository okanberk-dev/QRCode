'use client';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
const SCRIPT_ID = 'buaze-recaptcha-enterprise';

// reCAPTCHA Enterprise tokens are valid for 2 minutes. A prefetched token is
// reused only while comfortably inside that window; otherwise we execute
// again. 75 s leaves margin for the Google popup + server round-trip.
const PREFETCH_MAX_AGE_MS = 75_000;

// Upper bound on how long a sign-in waits for a token. The server runs
// reCAPTCHA in monitor mode (a missing token soft-passes) and in enforce mode
// answers with a clear "security check missing" error — either is better
// than a spinner that never ends when Google's script stalls (slow network,
// content blocker, `ready()` never firing).
const TAKE_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.grecaptcha?.enterprise) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    scriptPromise = new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('RECAPTCHA_SCRIPT_FAILED')), { once: true });
    });
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next call
      reject(new Error('RECAPTCHA_SCRIPT_FAILED'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(SITE_KEY);
}

/**
 * Warm the reCAPTCHA Enterprise script during idle time so the first
 * `getRecaptchaToken` call on submit doesn't pay the script download +
 * `ready()` handshake (~400–900 ms on mobile). Safe to call repeatedly;
 * errors are swallowed — the submit path still loads on demand.
 */
export function preloadRecaptcha(): void {
  if (!SITE_KEY || typeof window === 'undefined') return;
  const run = () => {
    loadRecaptchaScript(SITE_KEY).catch(() => {
      /* submit path retries */
    });
  };
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 0);
  }
}

export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!SITE_KEY) return null;

  await loadRecaptchaScript(SITE_KEY);
  const enterprise = window.grecaptcha?.enterprise;
  if (!enterprise) throw new Error('RECAPTCHA_NOT_READY');

  await new Promise<void>((resolve) => enterprise.ready(resolve));
  return enterprise.execute(SITE_KEY, { action });
}

type PrefetchedToken = { action: string; token: string | null; issuedAt: number };
let prefetched: { action: string; promise: Promise<PrefetchedToken> } | null = null;

/**
 * Start fetching a token for `action` now (e.g. the moment the Google popup
 * opens) so it is ready by the time the popup resolves. Consume it with
 * `takeRecaptchaToken(action)`; if the prefetched token is stale or the
 * action differs, a fresh execute runs instead.
 */
export function prefetchRecaptchaToken(action: string): void {
  if (!SITE_KEY || typeof window === 'undefined') return;
  const promise = getRecaptchaToken(action)
    .then((token) => ({ action, token, issuedAt: Date.now() }))
    .catch(() => ({ action, token: null, issuedAt: 0 }));
  prefetched = { action, promise };
}

export async function takeRecaptchaToken(action: string): Promise<string | null> {
  if (!SITE_KEY) return null;
  const candidate = prefetched;
  prefetched = null;
  if (candidate && candidate.action === action) {
    const result = await withTimeout(candidate.promise, TAKE_TIMEOUT_MS, null);
    if (result?.token && Date.now() - result.issuedAt < PREFETCH_MAX_AGE_MS) {
      return result.token;
    }
    // The prefetch already had its chance; if it failed or stalled, a second
    // full execute would only double the wait.
    if (!result?.token) return null;
  }
  return withTimeout(getRecaptchaToken(action), TAKE_TIMEOUT_MS, null);
}
