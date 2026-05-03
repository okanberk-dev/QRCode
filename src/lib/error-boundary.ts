import * as Sentry from '@sentry/nextjs';

export function isTransientNetworkError(error: Error) {
  const signature = `${error.name} ${error.message}`.toLowerCase();
  return (
    signature.includes('network error') ||
    signature.includes('failed to fetch') ||
    signature.includes('fetch failed') ||
    signature.includes('load failed')
  );
}

export function reportBoundaryError(boundary: string, error: Error & { digest?: string }) {
  console.error(`[${boundary}]`, error);
  Sentry.captureException(error, {
    tags: { boundary },
    extra: { digest: error.digest },
  });
}

export function scheduleTransientRetry(
  boundary: string,
  error: Error,
  reset: () => void,
  delayMs = 900,
) {
  if (!isTransientNetworkError(error) || typeof window === 'undefined') return undefined;

  const retryKey = `buaze.errorBoundary.autoRetry:${boundary}:${window.location.pathname}`;
  const lastRetryAt = Number(window.sessionStorage.getItem(retryKey) || '0');
  const now = Date.now();

  if (now - lastRetryAt < 30_000) return undefined;
  window.sessionStorage.setItem(retryKey, String(now));

  const timeout = window.setTimeout(() => {
    reset();
  }, delayMs);

  return () => window.clearTimeout(timeout);
}
